import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import func
from app.core.celery_app import celery_app
from app.core.redis_lock import acquire_conversation_lock, release_conversation_lock
from app.database import SessionLocal
from app.models.conversation import Conversation
from app.models.flow_execution import FlowExecutionState
from app.services.automations.execution_tracer import ExecutionTracer
from app.services.automations.flow_service_v2 import ConversationExecutionBusy, FlowServiceV2
from app.services.inbox.whatsapp_delivery import deliver_outbound_message
from app.services.analytics.realtime_service import (
    EventType,
    publish_to_workspace,
    publish_to_workspace_conversation,
)

logger = logging.getLogger(__name__)

# Exponential back-off schedule (seconds) — shared across tasks.
_BACKOFF_SCHEDULE = [60, 120, 240]
_BUSY_RETRY_SECONDS = 2

# How long before an in_progress/dispatched message is considered stuck.
_IN_PROGRESS_TIMEOUT_SECONDS = 60
_DISPATCHED_TIMEOUT_SECONDS = 5

# Redis lock TTL — must be longer than a single send_next loop takes.
_SEND_LOCK_TTL_SECONDS = 30


# Shared retry/trace wrapper 
def _run_flow_task(task_self, conversation_id, tracer, db, fn, extra_meta=None):
    
    try:
        return fn()
    except ConversationExecutionBusy as exc:
        logger.info(
            "[flow_task] Conversation busy, retrying | conversation=%s",
            conversation_id,
        )
        raise task_self.retry(exc=exc, countdown=_BUSY_RETRY_SECONDS)
    except Exception as exc:
        try:
            exists = db.query(Conversation.id).filter(
                Conversation.id == conversation_id
            ).first()
            if exists:
                tracer.trace(
                    db, conversation_id=conversation_id,
                    event_type="error", status="failed",
                    error_message=str(exc),
                    metadata={"attempt": task_self.request.retries + 1, **(extra_meta or {})},
                )
                db.commit()
            else:
                db.commit()
        except Exception as trace_exc:
            logger.exception("[flow_task] Tracer write failed: %s", trace_exc)

        try:
            countdown = _BACKOFF_SCHEDULE[min(task_self.request.retries, len(_BACKOFF_SCHEDULE) - 1)]
            logger.warning(
                "[flow_task] Retrying in %ds (attempt %d) | conversation=%s | error=%s",
                countdown, task_self.request.retries + 1, conversation_id, exc,
            )
            raise task_self.retry(exc=exc, countdown=countdown)
        except MaxRetriesExceededError:
            logger.error(
                "[flow_task] Max retries exceeded | conversation=%s | error=%s",
                conversation_id, exc,
            )

@celery_app.task(bind=True, name="app.workers.flow_execution.execute_incoming_message", max_retries=30)
def execute_incoming_message(self, conversation_id, message, metadata=None):
    db = SessionLocal()
    tracer = ExecutionTracer()

    def _run():
        # Billing enforcement check
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            from app.services.billing.billing_service import enforce_execution_policy
            if not enforce_execution_policy(db, str(conv.workspace_id)):
                logger.warning(f"Quota exceeded for workspace {conv.workspace_id}. Aborting execution.")
                tracer.trace(db, conversation_id=conversation_id, event_type="billing_blocked", metadata={"error": "Insufficient quota"})
                db.commit()
                return {"status": "error", "message": "Insufficient quota"}

        service = FlowServiceV2()
        result = asyncio.run(
            service.execute_incoming_message(
                db,
                conversation_id=conversation_id,
                inbound_text=message,
                metadata=metadata or {},
            )
        )

        tracer.trace(
            db,
            conversation_id=conversation_id,
            event_type="message_processed",
            metadata={"handled": result},
        )
        db.commit()

        #  REALTIME: notify the workspace that a new message was processed
        try:
            conv = db.query(Conversation).filter(
                Conversation.id == conversation_id
            ).first()
            if conv:
                publish_to_workspace(
                    workspace_id=str(conv.workspace_id),
                    event_type=EventType.NEW_MESSAGE,
                    payload={
                        "conversation_id": conversation_id,
                        "message_preview": message[:120],
                        "result": result,
                    },
                    conversation_id=conversation_id,
                )
        except Exception as rt_exc:
            logger.warning("[execute_incoming_message] Realtime publish failed (non-fatal): %s", rt_exc)

        logger.info(
            "[execute_incoming_message] OK | conversation=%s handled=%s",
            conversation_id,
            result,
        )
        return result

    try:
        return _run_flow_task(self, conversation_id, tracer, db, _run)
    finally:
        db.close()


#  resume_flow_node ─

@celery_app.task(
    bind=True,
    name="app.workers.flow_execution.resume_flow_node",
    max_retries=30,
)
def resume_flow_node(
    self,
    conversation_id: str,
    node_id: str,
    inbound_text: str = "",
    msg_sequence_val: int = 0,
    metadata: dict = None,
):
    """Resumes a paused flow node after a delay."""
    db = SessionLocal()
    tracer = ExecutionTracer()

    def _run():
        from app.models.ai_action import ConversationState
        conv_state = db.query(ConversationState).filter_by(conversation_id=conversation_id).first()
        if conv_state and conv_state.human_takeover:
            logger.info("[AI_AUTOMATION_PAUSED] resume_flow_node ignored | conversation=%s", conversation_id)
            return

        service = FlowServiceV2()
        result = asyncio.run(
            service.resume_node_execution(
                db,
                conversation_id=conversation_id,
                node_id=node_id,
                inbound_text=inbound_text or "",
                msg_sequence_val=msg_sequence_val,
            )
        )

        tracer.trace(
            db,
            conversation_id=conversation_id,
            event_type="node_resumed",
            metadata={"node_id": node_id, "result": result},
        )
        db.commit()
        logger.info("[resume_flow_node] OK | conversation=%s node=%s", conversation_id, node_id)
        return result

    try:
        return _run_flow_task(self, conversation_id, tracer, db, _run, extra_meta={"node_id": node_id})
    finally:
        db.close()


# send_next_pending_message  (REWRITTEN — race-condition-free)
@celery_app.task(
    bind=True,
    name="app.workers.flow_execution.send_next_pending_message",
    max_retries=3,
)
def send_next_pending_message(self, conversation_id: str):

    from app.models.outbound_message import OutboundMessage

    # Redis distributed lock 
    lock_token = acquire_conversation_lock(
        conversation_id, ttl_seconds=_SEND_LOCK_TTL_SECONDS
    )
    if lock_token is None:
       
        logger.info(
            "[send_next_pending_message] Lock held by another worker | conversation=%s",
            conversation_id,
        )
        return

    db = SessionLocal()
    from app.models.ai_action import ConversationState
    conv_state = db.query(ConversationState).filter_by(conversation_id=conversation_id).first()
    if conv_state and conv_state.human_takeover:
        logger.info("[AI_AUTOMATION_PAUSED] send_next_pending_message ignored | conversation=%s", conversation_id)
        release_conversation_lock(conversation_id, lock_token)
        db.close()
        return

    # BLOCK OLD AUTOMATION MESSAGES
    state = (
        db.query(FlowExecutionState)
        .filter(
            FlowExecutionState.conversation_id == conversation_id
        )
        .first()
    )



    try:
        # Billing enforcement check
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            from app.services.billing.billing_service import enforce_execution_policy
            if not enforce_execution_policy(db, str(conv.workspace_id)):
                logger.warning(f"Quota exceeded for workspace {conv.workspace_id}. Aborting outbound message.")
                release_conversation_lock(conversation_id, lock_token)
                return

        state = (
            db.query(FlowExecutionState)
            .filter(FlowExecutionState.conversation_id == conversation_id)
            .first()
        )
        active_flow_id = state.active_flow_id if state else None

        base_filter = [
            OutboundMessage.conversation_id == conversation_id,
            OutboundMessage.status == "queued",
        ]
        if (
            state
            and state.runtime_context
            and state.runtime_context.get("active_ai_session")
        ):
            base_filter.append(
                OutboundMessage.message_type != "automation"
            )

        if active_flow_id is not None:
            base_filter.append(OutboundMessage.flow_id == active_flow_id)

        msg = (
            db.query(OutboundMessage)
            .filter(*base_filter)
            .with_for_update()
            .order_by(OutboundMessage.sequence.asc())
            .first()
        )

        if not msg:
            logger.info(
                "[send_next_pending_message] No pending messages | conversation=%s",
                conversation_id,
            )
            return


        msg.status = "sending"
        db.commit()

        outbound_id = str(msg.id)
        logger.info(
            "[send_next_pending_message] Dispatching seq=%d id=%s | conversation=%s",
            msg.sequence,
            outbound_id,
            conversation_id,
        )

        send_whatsapp_message_task.delay(
            outbound_message_id=outbound_id,
            conversation_id=conversation_id,
            to_number=msg.to_number,
            body=msg.body,
            metadata=msg.metadata_json or {},
        )

    except Exception as exc:
        db.rollback()
        logger.exception(
            "[send_next_pending_message] Error | conversation=%s | error=%s",
            conversation_id,
            exc,
        )
        try:
            raise self.retry(
                exc=exc,
                countdown=_BACKOFF_SCHEDULE[min(self.request.retries, 2)],
            )
        except MaxRetriesExceededError:
            logger.error(
                "[send_next_pending_message] Max retries | conversation=%s",
                conversation_id,
            )
    finally:
        # ALWAYS release the Redis lock — even on error.
        release_conversation_lock(conversation_id, lock_token)
        db.close()


#  send_whatsapp_message_task (FIXED — sets "dispatched", not "sent") 

@celery_app.task(
    bind=True,
    name="app.workers.flow_execution.send_whatsapp_message_task",
    max_retries=3,
)
def send_whatsapp_message_task(
    self,
    outbound_message_id: str,
    conversation_id: str,
    to_number: str,
    body: str,
    metadata: dict = None,
):

    from app.models.outbound_message import OutboundMessage

    db = SessionLocal()
    tracer = ExecutionTracer()

    try:
        # 1. Normalise metadata
        metadata = metadata or {}
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        buttons = metadata.get("buttons") or []

        # 2. Idempotency check — if we already have a Twilio SID, we
        row = (
            db.query(OutboundMessage)
            .filter(OutboundMessage.id == outbound_message_id)
            .with_for_update()
            .first()
        )
        if not row:
            logger.warning(
                "[send_whatsapp_message_task] Row not found | id=%s",
                outbound_message_id,
            )
            return

        if row.twilio_sid:
            # Already sent in a previous attempt — ensure status is correct.
            logger.info(
                "[send_whatsapp_message_task] ⚠️ Already has SID, marking sent | id=%s sid=%s",
                outbound_message_id,
                row.twilio_sid,
            )
            if row.status == "sending":
                row.status = "sent"
                db.commit()
            return

        # 3. Guard: only send if status is sending (claimed by dispatcher)
        if row.status != "sending":
            logger.warning(
                "[send_whatsapp_message_task] ⚠️ Unexpected status=%s (expected sending) | id=%s",
                row.status,
                outbound_message_id,
            )
            return

        from app.models.ai_action import ConversationState
        conv_state = db.query(ConversationState).filter_by(conversation_id=conversation_id).first()
        if conv_state and conv_state.human_takeover and row.message_type == "automation":
            logger.info("[AI_AUTOMATION_PAUSED] cancelled dispatch of automation message | id=%s", outbound_message_id)
            row.status = "failed"
            db.commit()
            return

        # 4. Guard: abort if the active flow has changed (user triggered new flow)
        if row.flow_id:
            current_state = (
                db.query(FlowExecutionState)
                .filter(FlowExecutionState.conversation_id == conversation_id)
                .first()
            )
            if current_state and current_state.active_flow_id != row.flow_id:
                logger.info(
                    "[send_whatsapp_message_task] ⚠️ Flow changed — cancelling stale msg | "
                    "msg_flow=%s active_flow=%s id=%s",
                    row.flow_id, current_state.active_flow_id, outbound_message_id,
                )
                row.status = "cancelled"
                db.commit()
                send_next_pending_message.apply_async(
                    args=[conversation_id], countdown=1
                )
                return

        # Release the SELECT FOR UPDATE lock before making the blocking external network call
        db.commit()

        # Inject outbound_message_id into metadata so the delivery channel can access it
        metadata = metadata or {}
        metadata["outbound_message_id"] = outbound_message_id

        # 5. Send to Twilio
        sid = deliver_outbound_message(
            db=db,
            conversation_id=conversation_id,
            to_number=f"whatsapp:{to_number}",
            body=body,
            metadata=metadata,
        )

        # 6. Re-acquire the lock briefly to update the status and SID
        row = (
            db.query(OutboundMessage)
            .filter(OutboundMessage.id == outbound_message_id)
            .with_for_update()
            .first()
        )
        if not row:
            logger.warning(
                "[send_whatsapp_message_task] Row not found during post-send update | id=%s",
                outbound_message_id,
            )
            return

        row.twilio_sid = sid
        row.status = "sent"
        
        # 6.5. Safely execute inbox logging and tracking outside the row lock
        # Note: We now create the Message entry here, ONLY AFTER successful delivery.
        try:
            from app.services.inbox.message_service import MessageService
            from app.models.message import SenderType, MessageStatus

            meta_source = metadata.get("source", "")
            buttons = metadata.get("buttons") or []

            if meta_source == "button_message" and buttons:
                button_labels = " | ".join(f"[{b.get('label', '')}]" for b in buttons)
                inbox_content = f"{body}\n{button_labels}" if body else button_labels
            elif meta_source in {"media_message", "media_fallback"}:
                message_type = metadata.get("message_type", "media")
                media_url = metadata.get("media_url", "")
                inbox_content = body or f"[{message_type.upper()}] {media_url}"
            else:
                inbox_content = body

            if inbox_content:
                conversation = db.query(Conversation).filter(
                    Conversation.id == conversation_id
                ).first()
                if conversation:
                    inbox_msg = MessageService.create_message(
                        db,
                        conversation=conversation,
                        content=inbox_content,
                        sender_type=SenderType.AI,
                        status=MessageStatus.SENT,
                        metadata=metadata,
                        source="automation_flow"
                    )
                    db.flush()
                    inbox_msg_id = str(inbox_msg.id)
                    
                    # Update OutboundMessage metadata so webhooks can update delivery status
                    metadata["inbox_message_id"] = inbox_msg_id
                    row.metadata_json = metadata
                    logger.info("Inbox saved | conversation=%s source=%s", conversation_id, meta_source)
        except Exception as inbox_exc:
            logger.warning("Inbox save failed (non-fatal): %s", inbox_exc)

        db.commit()

        send_next_pending_message.apply_async(
            args=[conversation_id],
            countdown=10
        )

        #  REALTIME: notify the workspace that an outbound message was sent
        try:
            conv = db.query(Conversation).filter(
                Conversation.id == conversation_id
            ).first()
            if conv:
                from app.services.analytics.realtime_service import publish_to_workspace_conversation, EventType
                publish_to_workspace_conversation(
                    conversation_id=conversation_id,
                    workspace_id=str(conv.workspace_id),
                    event_type=EventType.MESSAGE_STATUS_UPDATED,
                    payload={
                        "outbound_message_id": outbound_message_id,
                        "status": "sent",
                        "twilio_sid": sid,
                        "conversation_id": conversation_id,
                    },
                )
        except Exception as rt_exc:
            logger.warning("[send_whatsapp_message_task] Realtime publish failed (non-fatal): %s", rt_exc)

        try:
            conversation_exists = db.query(
                Conversation.id
            ).filter(
                Conversation.id == conversation_id
            ).first()

            if conversation_exists:
                tracer.trace(
                    db,
                    conversation_id=conversation_id,
                    event_type="message_dispatched",
                    metadata={
                        "to_number": to_number,
                        "preview": body[:80],
                        "buttons_count": len(buttons),
                        "twilio_sid": sid,
                        "outbound_message_id": outbound_message_id,
                    },
                )
                db.commit()
        except Exception as trace_exc:
            logger.warning("Tracer failed: %s", trace_exc)

        logger.info(
            "[send_whatsapp_message_task] Sent | conversation=%s sid=%s id=%s",
            conversation_id,
            sid,
            outbound_message_id,
        )
        return sid

    except Exception as exc:
        # Mark the row as failed if we never got a SID
        try:
            db.rollback()
            row = (
                db.query(OutboundMessage)
                .filter(OutboundMessage.id == outbound_message_id)
                .with_for_update()
                .first()
            )
            if row and not row.twilio_sid:
                row.status = "failed"
                
                err_str = str(exc)
                if "429" in err_str or "63038" in err_str:
                    logger.warning("[send_whatsapp_message_task] 🚫 Twilio rate limit 429/63038 — stopping retries entirely for conversation=%s", conversation_id)
                    
                    row.metadata_json = row.metadata_json or {}
                    row.metadata_json["failure_reason"] = "twilio_rate_limit"
                    db.commit()
                    return  # Stop completely, do not requeue, do not trigger next message
                
                # Notice: We explicitly DO NOT create a Message table entry if Twilio fails.
                # This ensures fake messages do not appear in CRM history.
                logger.warning(
                    "[send_whatsapp_message_task] Twilio send failed | id=%s seq=%d | OutboundMessage status=failed",
                    row.id,
                    row.sequence,
                )

                db.commit()

                # Since this message failed normally (not rate limit), trigger the next one so the
                # flow doesn't stall.
                send_next_pending_message.apply_async(
                    args=[conversation_id],
                    countdown=1,
                )
        except Exception:
            db.rollback()

        try:
            conversation_exists = db.query(Conversation.id).filter(
                Conversation.id == conversation_id
            ).first()
            if conversation_exists:
                tracer.trace(
                    db,
                    conversation_id=conversation_id,
                    event_type="error",
                    status="failed",
                    error_message=str(exc),
                    metadata={"attempt": self.request.retries + 1},
                )
                db.commit()
            else:
                db.commit()
        except Exception as trace_exc:
            logger.exception(
                "[send_whatsapp_message_task] Tracer write failed: %s", trace_exc
            )

        try:
            if "429" in str(exc) or "limit" in str(exc):
                logger.error("🚫 Twilio rate limit — stopping retries")

                row = (
                    db.query(OutboundMessage)
                    .filter(OutboundMessage.id == outbound_message_id)
                    .first()
                )
                if row and not row.twilio_sid:
                    row.status = "failed"
                    db.commit()

                # Trigger next message despite rate limit failure
                send_next_pending_message.apply_async(
                    args=[conversation_id],
                    countdown=5,
                )
                return

            countdown = _BACKOFF_SCHEDULE[
                min(self.request.retries, len(_BACKOFF_SCHEDULE) - 1)
            ]
            logger.warning(
                "[send_whatsapp_message_task] Retrying in %ds (attempt %d/3) | error=%s",
                countdown,
                self.request.retries + 1,
                exc,
            )
            raise self.retry(exc=exc, countdown=countdown)

        except MaxRetriesExceededError:
            logger.error(
                "[send_whatsapp_message_task] Max retries exceeded | conversation=%s | error=%s",
                conversation_id,
                exc,
            )
            # Trigger next message — don't let the flow stall
            send_next_pending_message.apply_async(
                args=[conversation_id],
                countdown=2,
            )
            raise

    finally:
        db.close()


#  sweep_stuck_messages ─

@celery_app.task(name="app.workers.flow_execution.sweep_stuck_messages")
def sweep_stuck_messages():
    from app.models.outbound_message import OutboundMessage

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        stuck_msgs = (
            db.query(OutboundMessage)
            .filter(
                OutboundMessage.status.in_(["dispatched", "in_progress"]),
                OutboundMessage.updated_at < now - timedelta(seconds=120)
            )
            .all()
        )

        for msg in stuck_msgs:
            logger.warning(f"⚠️ Sweeping stuck msg seq={msg.sequence} conv={msg.conversation_id}")

            msg.status = "failed"
            db.commit()

            # continue flow
            send_next_pending_message.apply_async(
                args=[msg.conversation_id],
                countdown=1
            )

    finally:
        db.close()


#  poll_scheduled_resumes (Celery beat — every 30s) ─

@celery_app.task(name="app.workers.flow_execution.poll_scheduled_resumes")
def poll_scheduled_resumes():

    from app.models.scheduled_resume import ScheduledResume

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_rows = (
            db.query(ScheduledResume)
            .filter(
                ScheduledResume.status == "pending",
                ScheduledResume.run_at <= now,
            )
            .with_for_update(skip_locked=True)
            .order_by(ScheduledResume.run_at.asc())
            .limit(100)
            .all()
        )

        if not due_rows:
            return

        dispatched = 0
        cancelled = 0

        for sr in due_rows:
            #  Guard: skip if the flow has changed since this delay was created
            if sr.flow_id:
                current_state = (
                    db.query(FlowExecutionState)
                    .filter(FlowExecutionState.conversation_id == sr.conversation_id)
                    .first()
                )
                if current_state and current_state.active_flow_id != sr.flow_id:
                    logger.info(
                        "[poll_scheduled_resumes] Stale flow — cancelling | "
                        "conversation=%s scheduled_flow=%s active_flow=%s",
                        sr.conversation_id, sr.flow_id, current_state.active_flow_id,
                    )
                    sr.status = "cancelled"
                    cancelled += 1
                    continue

            #  Enqueue the resume task
            try:
                resume_flow_node.delay(
                    conversation_id=str(sr.conversation_id),
                    node_id=sr.node_id,
                    inbound_text=sr.inbound_text or "",
                    msg_sequence_val=sr.msg_sequence_val or 0,
                )
            except Exception as enqueue_exc:
                # Enqueue failed — leave row as "pending" for next cycle
                logger.warning(
                    "[poll_scheduled_resumes] Enqueue failed, will retry | id=%s error=%s",
                    sr.id, enqueue_exc,
                )
                continue

            #  Mark executed ONLY after successful enqueue
            sr.status = "executed"
            dispatched += 1
            logger.info(
                "[poll_scheduled_resumes] Fired resume | conversation=%s node=%s id=%s",
                sr.conversation_id, sr.node_id, sr.id,
            )

        db.commit()
        if dispatched or cancelled:
            logger.info(
                "[poll_scheduled_resumes] Done — dispatched=%d cancelled=%d",
                dispatched, cancelled,
            )
    except Exception:
        db.rollback()
        logger.exception("[poll_scheduled_resumes] Error polling scheduled resumes")
    finally:
        db.close()


@celery_app.task(name="app.workers.flow_execution.purge_old_delivery_logs")
def purge_old_delivery_logs():
    from app.models.outbound_message import OutboundMessage
    from app.models.ai_action import Lead
    
    db = SessionLocal()
    try:
        # Pre-flight safety check
        lead_count_before = db.query(func.count(Lead.id)).scalar()
        
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        deleted_count = db.query(OutboundMessage).filter(
            OutboundMessage.status.in_(["sent", "failed"]),
            OutboundMessage.created_at < thirty_days_ago
        ).delete(synchronize_session=False)
        
        # Post-flight safety check
        lead_count_after = db.query(func.count(Lead.id)).scalar()
        
        if lead_count_before != lead_count_after:
            db.rollback()
            logger.critical(
                f"[purge_old_delivery_logs] CRITICAL SAFETY TRIGGER: Lead count changed from {lead_count_before} to {lead_count_after}! Rollback applied."
            )
            return
            
        db.commit()
        logger.info(f"[purge_old_delivery_logs] Successfully purged {deleted_count} old delivery logs. Lead count stable at {lead_count_after}.")
    except Exception as e:
        db.rollback()
        logger.exception("[purge_old_delivery_logs] Error during purge task")
    finally:
        db.close()


@celery_app.task(name="app.workers.flow_execution.archive_old_conversations")
def archive_old_conversations():
    from app.models.conversation import Conversation, ConversationStatus
    from app.models.message import Message, MessageArchive
    from app.models.ai_action import Lead
    
    db = SessionLocal()
    try:
        ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
        
        # Find conversations closed/resolved and older than 90 days
        convs_to_archive = db.query(Conversation).filter(
            Conversation.status.in_([ConversationStatus.CLOSED]),
            Conversation.updated_at < ninety_days_ago
        ).limit(1000).all()
        
        archived_count = 0
        for conv in convs_to_archive:
            messages = db.query(Message).filter(Message.conversation_id == conv.id).all()
            if not messages:
                continue
                
            archive_objects = [
                MessageArchive(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    content=m.content,
                    sender_type=m.sender_type,
                    status=m.status,
                    timestamp=m.timestamp,
                    is_read=m.is_read,
                    source=m.source,
                    external_id=m.external_id,
                    metadata_json=m.metadata_json
                ) for m in messages
            ]
            db.bulk_save_objects(archive_objects)
            db.query(Message).filter(Message.conversation_id == conv.id).delete(synchronize_session=False)
    
            lead = db.query(Lead).filter(Lead.conversation_id == str(conv.id)).first()
            if lead:
                if not hasattr(lead, "archived_at"):
                    # For safety, if column doesn't exist yet, we just skip updating the lead
                    pass
                else:
                    lead.archived_at = func.now()
                    lead.archive_location = "MessageArchive"
            
            archived_count += len(messages)
            
        db.commit()
        logger.info(f"[archive_old_conversations] Archived {archived_count} messages from {len(convs_to_archive)} closed conversations.")
    except Exception as e:
        db.rollback()
        logger.exception("[archive_old_conversations] Error archiving old conversations")
    finally:
        db.close()
