import asyncio
import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor

from celery.exceptions import MaxRetriesExceededError
from sqlalchemy.exc import IntegrityError
from app.core.celery_app import celery_app
from app.database import SessionLocal
from app.models.message import Message, MessageStatus, SenderType
from app.services.execution_tracer import ExecutionTracer
from app.services.flow_service_v2 import FlowServiceV2
from app.services.twilio_service import TwilioService

logger = logging.getLogger(__name__)

executor = ThreadPoolExecutor(max_workers=10)


@celery_app.task(name="app.workers.flow_execution.execute_incoming_message")
def execute_incoming_message(conversation_id: str, message: str, metadata: dict | None = None):
    db = SessionLocal()
    try:
        service = FlowServiceV2()
        future = executor.submit(
            lambda: asyncio.run(
                service.execute_incoming_message(
                    db, conversation_id=conversation_id, inbound_text=message, metadata=metadata or {}
                )
            )
        )
        return future.result() 
    finally:
        db.close()


@celery_app.task(bind=True, name="app.workers.flow_execution.send_whatsapp_message_task", max_retries=3)
def send_whatsapp_message_task(self, conversation_id: str, to_number: str, body: str, metadata: dict | None = None):
    db = SessionLocal()
    tracer = ExecutionTracer()
    metadata = metadata or {}
    conversation_uuid = uuid.UUID(str(conversation_id))
    try:
        twilio = TwilioService()

        media_url = metadata.get("media_url")
        buttons = metadata.get("buttons")  
        if media_url:
            sid = twilio.send_whatsapp_media(
                f"whatsapp:{to_number}",
                media_url=media_url,
                caption=body,
                raise_on_error=True
            )
        elif buttons:
            sid = twilio.send_whatsapp_buttons(
                f"whatsapp:{to_number}",
                body=body,
                buttons=buttons,
                raise_on_error=True  
            )
        else:
            sid = twilio.send_whatsapp_message(
                f"whatsapp:{to_number}",
                body,
                raise_on_error=True
            )
        ...

        message = Message(
            id=uuid.uuid4(),
            conversation_id=conversation_uuid,
            content=body or media_url,
            sender_type=SenderType.AGENT,
            status=MessageStatus.SENT,
            metadata_json=json.dumps({**metadata, "twilio_sid": sid}),
        )
        db.add(message)
        tracer.trace(
            db,
            conversation_id=conversation_uuid,
            event_type="message_sent",
            metadata={"twilio_sid": sid, **metadata},
        )
        db.commit()
        return sid
    except Exception as exc:
        backoff_schedule = [60, 120, 240]
        tracer.trace(
            db,
            conversation_id=conversation_uuid,
            event_type="error",
            status="failed",
            error_message=str(exc),
            metadata={"phase": "message_send", "retry": self.request.retries, **metadata},
        )
        db.commit()
        try:
            countdown = backoff_schedule[self.request.retries]
            raise self.retry(exc=exc, countdown=countdown)
        except IndexError:
            raise
    finally:
        db.close()
@celery_app.task(name="app.workers.flow_execution.resume_flow_node")
def resume_flow_node(conversation_id: str, node_id: str, inbound_text: str, msg_sequence_val: int):
    db = SessionLocal()
    try:
        service = FlowServiceV2()
        future = executor.submit(
            lambda: asyncio.run(
                service.resume_node_execution(
                    db=db, 
                    conversation_id=conversation_id, 
                    node_id=node_id, 
                    inbound_text=inbound_text, 
                    msg_sequence_val=msg_sequence_val
                )
            )
        )
        return future.result()
    finally:
        db.close()