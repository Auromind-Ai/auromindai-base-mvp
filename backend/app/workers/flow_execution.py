
import asyncio
import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from celery.exceptions import MaxRetriesExceededError
from sqlalchemy.exc import IntegrityError

from app.core.celery_app import celery_app
from app.core.redis_lock import acquire_conversation_lock, release_conversation_lock
from app.database import SessionLocal
from app.models.conversation import Conversation
from app.models.flow_execution import FlowExecutionState
from app.services.execution_tracer import ExecutionTracer
from app.services.flow_service_v2 import ConversationExecutionBusy, FlowServiceV2
from app.services.whatsapp_delivery import deliver_outbound_message

logger = logging.getLogger(__name__)

# One shared thread-pool for running async code from sync Celery tasks.
_executor = ThreadPoolExecutor(max_workers=4)

# Exponential back-off schedule (seconds) — shared across tasks.
_BACKOFF_SCHEDULE = [60, 120, 240]
_BUSY_RETRY_SECONDS = 2

# How long before an in_progress/dispatched message is considered stuck.
_IN_PROGRESS_TIMEOUT_SECONDS = 60
_DISPATCHED_TIMEOUT_SECONDS = 120

# Redis lock TTL — must be longer than a single send_next loop takes.
_SEND_LOCK_TTL_SECONDS = 30


# ---------------------------------------------------------------------------
# execute_incoming_message
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="app.workers.flow_execution.execute_incoming_message",
    max_retries=30,
)
def execute_incoming_message(
    self,
    conversation_id: str,
    message: str,
    metadata: dict = None,
):
    """
    Entry-point for every inbound WhatsApp message.

    Previously had *no* retry, *no* tracing on failure — a DB hiccup or
    LLM timeout would silently discard the message.  Now mirrors the
    pattern from send_whatsapp_message_task.
    """
    db = SessionLocal()
    tracer = ExecutionTracer()

    try:
        service = FlowServiceV2()
        future = _executor.submit(
            asyncio.run,
            service.execute_incoming_message(
                db,
                conversation_id=conversation_id,
                inbound_text=message,
                metadata=metadata or {},
            ),
        )
        result = future.result()

        tracer.trace(
            db,
            conversation_id=conversation_id,
            event_type="message_processed",
            metadata={"handled": result},
        )
        db.commit()

        logger.info(
            "[execute_incoming_message] OK | conversation=%s handled=%s",
            conversation_id,
            result,
        )
        return result

    except ConversationExecutionBusy as exc:
        logger.info(
            "[execute_incoming_message] Conversation busy, retrying in %ds | conversation=%s",
            _BUSY_RETRY_SECONDS,
            conversation_id,
        )
        raise self.retry(exc=exc, countdown=_BUSY_RETRY_SECONDS)

    except Exception as exc:
        # 1. Persist the failure before retrying / giving up.
        try:
            tracer.trace(
                db,
                conversation_id=conversation_id,
                event_type="error",
                status="failed",
                error_message=str(exc),
                metadata={"attempt": self.request.retries + 1},
            )
            db.commit()
        except Exception as trace_exc:
            logger.exception(
                "[execute_incoming_message] Tracer write failed: %s", trace_exc
            )

        # 2. Retry with exponential back-off.
        try:
            countdown = _BACKOFF_SCHEDULE[min(self.request.retries, len(_BACKOFF_SCHEDULE) - 1)]
            logger.warning(
                "[execute_incoming_message] Retrying in %ds (attempt %d/3) | conversation=%s | error=%s",
                countdown,
                self.request.retries + 1,
                conversation_id,
                exc,
            )
            raise self.retry(exc=exc, countdown=countdown)

        except MaxRetriesExceededError:
            logger.error(
                "[execute_incoming_message] Max retries exceeded | conversation=%s | error=%s",
                conversation_id,
                exc,
            )
            # Failure is already persisted above — do not re-raise so the
            # Celery task is marked FAILURE (not RETRY) and the dead-letter
            # queue (if configured) can pick it up.

    finally:
        db.close()


# ---------------------------------------------------------------------------
# resume_flow_node
# ---------------------------------------------------------------------------
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
    """
    Resumes a paused flow node after a delay.
    """
    db = SessionLocal()
    tracer = ExecutionTracer()

    try:
        service = FlowServiceV2()
        future = _executor.submit(
            asyncio.run,
            service.resume_node_execution(
                db,
                conversation_id=conversation_id,
                node_id=node_id,
                inbound_text=inbound_text or "",
                msg_sequence_val=msg_sequence_val,
            ),
        )
        result = future.result()

        tracer.trace(
            db,
            conversation_id=conversation_id,
            event_type="node_resumed",
            metadata={"node_id": node_id, "result": result},
        )
        db.commit()

        logger.info(
            "[resume_flow_node] OK | conversation=%s node=%s",
            conversation_id,
            node_id,
        )
        return result

    except ConversationExecutionBusy as exc:
        logger.info(
            "[resume_flow_node] Conversation busy, retrying in %ds | conversation=%s node=%s",
            _BUSY_RETRY_SECONDS,
            conversation_id,
            node_id,
        )
        raise self.retry(exc=exc, countdown=_BUSY_RETRY_SECONDS)

    except Exception as exc:
        try:
            tracer.trace(
                db,
                conversation_id=conversation_id,
                event_type="error",
                status="failed",
                error_message=str(exc),
                metadata={"node_id": node_id, "attempt": self.request.retries + 1},
            )
            db.commit()
        except Exception as trace_exc:
            logger.exception("[resume_flow_node] Tracer write failed: %s", trace_exc)

        try:
            countdown = _BACKOFF_SCHEDULE[min(self.request.retries, len(_BACKOFF_SCHEDULE) - 1)]
            logger.warning(
                "[resume_flow_node] Retrying in %ds (attempt %d/3) | conversation=%s node=%s | error=%s",
                countdown,
                self.request.retries + 1,
                conversation_id,
                node_id,
                exc,
            )
            raise self.retry(exc=exc, countdown=countdown)

        except MaxRetriesExceededError:
            logger.error(
                "[resume_flow_node] Max retries exceeded | conversation=%s node=%s | error=%s",
                conversation_id,
                node_id,
                exc,
            )

    finally:
        db.close()


# ---------------------------------------------------------------------------
# send_next_pending_message  (REWRITTEN — race-condition-free)
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="app.workers.flow_execution.send_next_pending_message",
    max_retries=3,
)
def send_next_pending_message(self, conversation_id: str):
  
    from app.models.outbound_message import OutboundMessage

    # ── GUARD 1: Redis distributed lock ──────────
    lock_token = acquire_conversation_lock(
        conversation_id, ttl_seconds=_SEND_LOCK_TTL_SECONDS
    )
    if lock_token is None:
        # Another worker is already dispatching for this conversation.
        # That worker will handle everything — we can safely exit.
        logger.info(
            "[send_next_pending_message] Lock held by another worker | conversation=%s",
            conversation_id,
        )
        return

    db = SessionLocal()
    try:
        # ── GUARD 2: Check for any active (in_progress / dispatched) message ──
        # Use with_for_update() (BLOCKING) — no skip_locked!
        # This means if another transaction holds a lock on this row,
        # we'll wait for it instead of silently skipping.
        active_msg = (
            db.query(OutboundMessage)
            .filter(
                OutboundMessage.conversation_id == conversation_id,
                OutboundMessage.status.in_(["in_progress", "dispatched"]),
            )
            .with_for_update()
            .first()
        )

        if active_msg:
            # Check if the active message is stuck (timeout recovery)
            last_time = active_msg.updated_at or active_msg.created_at
            if last_time.tzinfo is None:
                last_time = last_time.replace(tzinfo=timezone.utc)

            timeout = (
                _DISPATCHED_TIMEOUT_SECONDS
                if active_msg.status == "dispatched"
                else _IN_PROGRESS_TIMEOUT_SECONDS
            )

            if last_time < datetime.now(timezone.utc) - timedelta(seconds=timeout):
                # Message is stuck — recover it by resetting to pending
                logger.warning(
                    "[send_next_pending_message] ⚠️ Recovering stuck message "
                    "seq=%d status=%s age=%ds | conversation=%s id=%s",
                    active_msg.sequence,
                    active_msg.status,
                    (datetime.now(timezone.utc) - last_time).total_seconds(),
                    conversation_id,
                    active_msg.id,
                )
                active_msg.status = "pending"
                active_msg.twilio_sid = None
                db.commit()
                # Fall through to claim the next pending message (which
                # might be this same one, now reset to pending).
            else:
                # Message is legitimately active — wait for Twilio callback.
                logger.info(
                    "[send_next_pending_message] Active message exists "
                    "seq=%d status=%s | conversation=%s — waiting for callback",
                    active_msg.sequence,
                    active_msg.status,
                    conversation_id,
                )
                return

        # ── GUARD 3: Claim the next pending message under row lock ─────
        # Filter by active_flow_id to avoid sending messages from a
        # superseded flow (old pending messages).
        state = (
            db.query(FlowExecutionState)
            .filter(FlowExecutionState.conversation_id == conversation_id)
            .first()
        )
        active_flow_id = state.active_flow_id if state else None

        base_filter = [
            OutboundMessage.conversation_id == conversation_id,
            OutboundMessage.status == "pending",
        ]
        if active_flow_id is not None:
            base_filter.append(OutboundMessage.flow_id == active_flow_id)

        msg = (
            db.query(OutboundMessage)
            .filter(*base_filter)
            .with_for_update()  # BLOCKING — no skip_locked!
            .order_by(OutboundMessage.sequence.asc())
            .first()
        )

        if not msg:
            logger.info(
                "[send_next_pending_message] No pending messages | conversation=%s",
                conversation_id,
            )
            return

        # Transition: pending → in_progress
        msg.status = "in_progress"
        db.commit()

        outbound_id = str(msg.id)
        logger.info(
            "[send_next_pending_message] Dispatching seq=%d id=%s | conversation=%s",
            msg.sequence,
            outbound_id,
            conversation_id,
        )

        # Fire the actual send task.
        # IMPORTANT: We do NOT call send_next_pending_message again here.
        # The Twilio status callback will do that after confirmation.
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


# ---------------------------------------------------------------------------
# send_whatsapp_message_task  (FIXED — sets "dispatched", not "sent")
# ---------------------------------------------------------------------------
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
        #    already sent this message (possibly in a previous attempt).
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
                "[send_whatsapp_message_task] ⚠️ Already has SID, marking dispatched | id=%s sid=%s",
                outbound_message_id,
                row.twilio_sid,
            )
            if row.status == "in_progress":
                row.status = "dispatched"
                db.commit()
            return

        # 3. Guard: only send if status is in_progress (claimed by dispatcher)
        if row.status != "in_progress":
            logger.warning(
                "[send_whatsapp_message_task] ⚠️ Unexpected status=%s (expected in_progress) | id=%s",
                row.status,
                outbound_message_id,
            )
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

        # 5. Send to Twilio
        sid = deliver_outbound_message(
            db=db,
            conversation_id=conversation_id,
            to_number=f"whatsapp:{to_number}",
            body=body,
            metadata=metadata,
        )

        # 5. Persist SID and transition to DISPATCHED (not "sent"!)
        #    The "sent" transition happens only via Twilio status callback.
        row.twilio_sid = sid
        row.status = "dispatched"

        try:
            from app.models.message import Message, SenderType, MessageStatus
            import uuid as _uuid

            meta_source = metadata.get("source", "")
            buttons = metadata.get("buttons", [])

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
                inbox_msg = Message(
                    id=_uuid.uuid4(),
                    conversation_id=conversation_id,
                    content=inbox_content,
                    sender_type=SenderType.AI,
                    status=MessageStatus.SENT,
                    source="automation_flow",
                    metadata_json="{}",
                )
                db.add(inbox_msg)
                logger.info(
                    "Inbox saved after Twilio dispatch | conversation=%s source=%s",
                    conversation_id, meta_source,
                )
        except Exception as inbox_exc:
            logger.warning("Inbox save failed (non-fatal): %s", inbox_exc)

        db.commit()
        send_next_pending_message.apply_async(
        args=[conversation_id],
        countdown=10
    )
        # 6. Trace
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

        logger.info(
            "[send_whatsapp_message_task] Dispatched | conversation=%s sid=%s id=%s",
            conversation_id,
            sid,
            outbound_message_id,
        )
        return sid

    except Exception as exc:
        # Mark the row as failed if we never got a SID
        try:
            row = (
                db.query(OutboundMessage)
                .filter(OutboundMessage.id == outbound_message_id)
                .first()
            )
            if row and not row.twilio_sid:
                row.status = "failed"

                # Update inbox message also as FAILED
                try:
                    from app.models.message import Message, MessageStatus
                    import uuid
                    import json

                    metadata = row.metadata_json or {}

                    if isinstance(metadata, str):
                        metadata = json.loads(metadata)

                    inbox_message_id = metadata.get("inbox_message_id")

                    if inbox_message_id:
                        inbox_msg = db.query(Message).filter(
                            Message.id == uuid.UUID(str(inbox_message_id))
                        ).first()

                        if inbox_msg:
                            inbox_msg.status = MessageStatus.FAILED

                            logger.warning(
                                "[send_whatsapp_message_task] Inbox msg → FAILED | inbox_id=%s seq=%d",
                                inbox_message_id,
                                row.sequence,
                            )

                except Exception as inbox_exc:
                    logger.warning(
                        "Inbox FAILED update error: %s",
                        inbox_exc
                    )

                db.commit()

                # Since this message failed, trigger the next one so the
                # flow doesn't stall.
                send_next_pending_message.apply_async(
                    args=[conversation_id],
                    countdown=1,
                )
        except Exception:
            db.rollback()

        try:
            tracer.trace(
                db,
                conversation_id=conversation_id,
                event_type="error",
                status="failed",
                error_message=str(exc),
                metadata={"attempt": self.request.retries + 1},
            )
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


# ---------------------------------------------------------------------------
# poll_scheduled_resumes  (Celery beat — every 30s)
# ---------------------------------------------------------------------------
@celery_app.task(name="app.workers.flow_execution.poll_scheduled_resumes")
def poll_scheduled_resumes():
    """Poll the scheduled_resumes table for due long-delay rows.

    Runs every 30 seconds via Celery beat.  For each row whose
    ``run_at`` has passed:
      - Check if the flow is still active (skip stale delays)
      - Fire ``resume_flow_node``
      - Mark row ``executed`` ONLY after enqueue succeeds
    """
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
            # ── Guard: skip if the flow has changed since this delay was created
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

            # ── Enqueue the resume task
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

            # ── Mark executed ONLY after successful enqueue
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
