

import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
import json

from celery.exceptions import MaxRetriesExceededError
from sqlalchemy.exc import IntegrityError

from app.core.celery_app import celery_app
from app.database import SessionLocal
from app.services.flow_service_v2 import ConversationExecutionBusy, FlowServiceV2
from app.services.execution_tracer import ExecutionTracer   # already used by send_whatsapp_message_task
from app.services.whatsapp_delivery import deliver_whatsapp_message

logger = logging.getLogger(__name__)

# One shared thread-pool for running async code from sync Celery tasks.
_executor = ThreadPoolExecutor(max_workers=4)

# Exponential back-off schedule (seconds) — shared across tasks.
_BACKOFF_SCHEDULE = [60, 120, 240]
_BUSY_RETRY_SECONDS = 2


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
# send_next_pending_message
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="app.workers.flow_execution.send_next_pending_message",
    max_retries=3,
)
def send_next_pending_message(self, conversation_id: str):
    """Pick up the lowest-sequence pending outbound message and send it.

    Guards:
    - Only one message per conversation may be in_progress at a time.
    - Uses SELECT FOR UPDATE to prevent concurrent dispatches.
    """
    from app.models.outbound_message import OutboundMessage

    db = SessionLocal()
    try:
        # Re-check under lock: another worker may have already claimed one.
        in_progress = (
            db.query(OutboundMessage)
            .filter(
                OutboundMessage.conversation_id == conversation_id,
                OutboundMessage.status == "in_progress",
            )
            .with_for_update(skip_locked=True)
            .first()
        )
        if in_progress:
            logger.info(
                "[send_next_pending_message] Already in-progress | conversation=%s sid=%s",
                conversation_id,
                in_progress.twilio_sid,
            )
            return

        # Claim the next pending message.
        msg = (
            db.query(OutboundMessage)
            .filter(
                OutboundMessage.conversation_id == conversation_id,
                OutboundMessage.status == "pending",
            )
            .with_for_update(skip_locked=True)
            .order_by(OutboundMessage.sequence.asc())
            .first()
        )
        if not msg:
            logger.info(
                "[send_next_pending_message] No pending messages | conversation=%s",
                conversation_id,
            )
            return

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
            raise self.retry(exc=exc, countdown=_BACKOFF_SCHEDULE[min(self.request.retries, 2)])
        except MaxRetriesExceededError:
            logger.error(
                "[send_next_pending_message] Max retries | conversation=%s", conversation_id
            )
    finally:
        db.close()


# ---------------------------------------------------------------------------
# send_whatsapp_message_task
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
        # 1. Normalise metadata — must be first, before anything can fail
        metadata = metadata or {}
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        buttons = metadata.get("buttons") or []   # always assigned now

        # 2. Idempotency — check BEFORE calling Twilio
        row = (
            db.query(OutboundMessage)
            .filter(OutboundMessage.id == outbound_message_id)
            .with_for_update()
            .first()
        )
        if not row:
            logger.warning(
                "[send_whatsapp_message_task] Row not found | id=%s", outbound_message_id
            )
            return

        if row.twilio_sid:
            # A previous attempt already sent this — retry must not re-send
            logger.info(
                "[send_whatsapp_message_task] ⚠️ Already sent, skipping | sid=%s", row.twilio_sid
            )
            return

        # 3. Send to Twilio
        sid = deliver_whatsapp_message(
            to_number=f"whatsapp:{to_number}",
            body=body,
            metadata=metadata,
        )

        # 4. Persist SID immediately — callback matches on this
        row.twilio_sid = sid
        db.commit()

        # 5. Trace
        tracer.trace(
            db,
            conversation_id=conversation_id,
            event_type="message_sent",
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
            "[send_whatsapp_message_task] Sent | conversation=%s sid=%s id=%s",
            conversation_id, sid, outbound_message_id,
        )
        return sid

    except Exception as exc:
        try:
            row = db.query(OutboundMessage).filter(
                OutboundMessage.id == outbound_message_id
            ).first()
            if row and not row.twilio_sid:
                # Only mark failed if we never got a SID — otherwise it sent fine
                row.status = "failed"
                db.commit()
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
            countdown = _BACKOFF_SCHEDULE[self.request.retries]
            logger.warning(
                "[send_whatsapp_message_task] Retrying in %ds (attempt %d/3) | error=%s",
                countdown, self.request.retries + 1, exc,
            )
            raise self.retry(exc=exc, countdown=countdown)
        except MaxRetriesExceededError:
            logger.error(
                "[send_whatsapp_message_task] Max retries exceeded | conversation=%s | error=%s",
                conversation_id, exc,
            )
            raise

    finally:
        db.close()