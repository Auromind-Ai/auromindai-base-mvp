import json
import logging
import os
import uuid
from datetime import datetime

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from twilio.twiml.messaging_response import MessagingResponse
from twilio.request_validator import RequestValidator
from app.models.twilio import TwilioConfig
from app.models.outbound_message import OutboundMessage
from app import database, models, schemas
from app.models.conversation import Conversation
from app.models.message import MessageStatus
from app.models.workspace import WorkspaceMember
from app.routers.auth import CurrentUser, get_current_user
from app.services.agentic_rag.rag_service import get_rag_service
from app.services.flow_service_v2 import FlowServiceV2
from app.core.security import verify_workspace_access
from app.services.lead_agent_local import (
    get_all_conversations,
    get_messages as get_local_messages,
    lead_agent_local,
)
from app.services.twilio_service import TwilioService
from app.workers.flow_execution import execute_incoming_message, send_next_pending_message

load_dotenv()

logger = logging.getLogger(__name__)
flow_service_v2 = FlowServiceV2()

router = APIRouter(
    prefix="/twilio",
    tags=["twilio"],
    responses={404: {"description": "Not found"}},
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_workspace_for_phone_number(db: Session, to_number: str):
    clean_number = to_number.replace("whatsapp:", "").strip()

    config = db.query(TwilioConfig).filter(
        TwilioConfig.phone_number == clean_number
    ).first()

    if not config:
        raise Exception(f"No workspace mapped for Twilio number {clean_number}")

    return config.workspace_id


def _get_or_create_conversation(db: Session, from_number: str, channel: str, to_number: str):
    workspace_id = _get_workspace_for_phone_number(db, to_number)
    
    # 1. Try to fetch the existing conversation FIRST
    conversation = db.query(models.Conversation).filter(
        models.Conversation.workspace_id == workspace_id,
        models.Conversation.phone == from_number,
        models.Conversation.channel == channel,
    ).first()
    
    if conversation:
        return conversation
        
    # 2. If it doesn't exist, create it safely
    try:
        conversation = models.Conversation(
            id=uuid.uuid4(),
            phone=from_number,
            workspace_id=workspace_id,
            channel=channel,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation
    except IntegrityError:
        # Just in case another concurrent request created it exactly at the same millisecond
        db.rollback()
        return db.query(models.Conversation).filter(
            models.Conversation.workspace_id == workspace_id,
            models.Conversation.phone == from_number,
            models.Conversation.channel == channel,
        ).first()


def _persist_user_message(
    db: Session,
    *,
    conversation_id: str,
    body: str,
    metadata: dict,
):
    message = models.Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        content=body,
        sender_type=models.SenderType.USER,
        status=models.MessageStatus.RECEIVED,
        metadata_json=json.dumps(metadata),
    )
    db.add(message)


def _enqueue_whatsapp_execution(conversation_id: str, body: str, metadata: dict):
    execute_incoming_message.delay(conversation_id=str(conversation_id), message=body, metadata=metadata)


async def process_incoming_message(
    from_number: str,
    body: str,
    db: Session,
    channel: str,
    interactive_value: str | None = None,
    interactive_label: str | None = None,
    to_number: str = None
):
    logger.info("[%s] Processing message from %s", channel, from_number)

    try:
        conversation = _get_or_create_conversation(db, from_number, channel, to_number)
        if not conversation:
            return {"status": "ignored"}

        message_metadata = {
            "interactive_value": interactive_value,
            "interactive_label": interactive_label,
        }
        _persist_user_message(
            db,
            conversation_id=conversation.id,
            body=body,
            metadata=message_metadata,
        )
        db.commit()

        if channel == "WHATSAPP":
            _enqueue_whatsapp_execution(conversation.id, body, message_metadata)
            return {"status": "queued", "conversation_id": str(conversation.id)}

        reply = lead_agent_local(from_number, body)
        if reply and channel == "INSTAGRAM":
            send_instagram_message(from_number, reply)

        return {"status": "processed", "conversation_id": str(conversation.id)}
    except Exception as exc:
        db.rollback()
        logger.exception("Error processing incoming %s message: %s", channel, exc)
        return {"status": "error"}


@router.post("/webhook")
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        form_data = await request.form()
        from_number = form_data.get("From")
        body = form_data.get("Body") or form_data.get("ButtonText")
        to_number = form_data.get("To")
        interactive_value = (
            form_data.get("ButtonPayload")
            or form_data.get("ButtonId")
            or form_data.get("InteractiveButtonReplyId")
        )
        interactive_label = (
            form_data.get("ButtonText")
            or form_data.get("InteractiveButtonReplyTitle")
        )

        if not from_number or not body:
            return {"status": "ignored"}

        await process_incoming_message(
            from_number.replace("whatsapp:", ""),
            body,
            db,
            channel="WHATSAPP",
            interactive_value=interactive_value,
            interactive_label=interactive_label,
            to_number=to_number,
        )
        return str(MessagingResponse())
    except Exception as exc:
        logger.exception("Webhook error: %s", exc)
        return {"status": "error"}


@router.get("/instagram/webhook")
async def verify_instagram(request: Request):
    verify_token = os.getenv("META_VERIFY_TOKEN")
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == verify_token:
        return int(challenge)
    return "Verification failed"


@router.post("/instagram/webhook")
async def instagram_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()

        for entry in data.get("entry", []):
            for msg_event in entry.get("messaging", []):
                sender_id = msg_event.get("sender", {}).get("id")
                text = msg_event.get("message", {}).get("text")
                if sender_id and text:
                    await process_incoming_message(sender_id, text, db, channel="INSTAGRAM")

            for change in entry.get("changes", []):
                value = change.get("value", {})
                sender_id = value.get("sender", {}).get("id")
                text = value.get("message", {}).get("text")
                if sender_id and text:
                    await process_incoming_message(sender_id, text, db, channel="INSTAGRAM")

        return {"status": "ok"}
    except Exception:
        logger.exception("Instagram webhook error")
        return {"status": "error"}


def send_instagram_message(psid: str, text: str):
    page_id = os.getenv("META_PAGE_ID")
    url = f"https://graph.facebook.com/v18.0/{page_id}/messages"
    payload = {
        "recipient": {"id": psid},
        "message": {"text": text},
        "messaging_type": "RESPONSE",
    }
    params = {"access_token": os.getenv("META_PAGE_ACCESS_TOKEN")}
    response = requests.post(url, json=payload, params=params)
    return response.json()


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return db.query(models.Conversation).filter(
        models.Conversation.workspace_id == workspace_id
    ).all()


@router.get("/conversations/{conversation_id}")
def get_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return (
        db.query(models.Message)
        .join(models.Conversation, models.Message.conversation_id == models.Conversation.id)
        .filter(
            models.Message.conversation_id == conversation_id,
            models.Conversation.workspace_id == workspace_id,
        )
        .order_by(models.Message.timestamp.asc())
        .all()
    )


@router.post("/test-trigger")
async def test_trigger(
    message: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    conversation = db.query(Conversation).filter(
        Conversation.workspace_id == workspace_id
    ).first()
    if not conversation:
        return {"status": "no conversation found"}

    result = await flow_service_v2.execute_incoming_message(
        db,
        conversation_id=conversation.id,
        inbound_text=message,
        metadata={},
    )
    return {"status": "trigger tested", "handled": result}


@router.post("/send-reply")
def send_reply(
    data: schemas.SendReply,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == data.conversation_id,
        models.Conversation.workspace_id == workspace_id,
    ).first()
    if not conversation:
        return {"status": "not_found"}

    message = models.Message(
        id=str(uuid.uuid4()),
        conversation_id=data.conversation_id,
        content=data.message,
        sender_type=models.SenderType.AGENT,
        status=MessageStatus.SENT,
    )
    db.add(message)
    db.commit()

    if conversation.channel == "WHATSAPP":
        TwilioService().send_whatsapp_message(f"whatsapp:{data.phone}", data.message)
    elif conversation.channel == "INSTAGRAM":
        send_instagram_message(conversation.phone, data.message)

    return {"status": "sent"}


@router.post("/ai-suggest")
async def ai_suggest(
    data: schemas.AISuggest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == data.conversation_id,
        models.Conversation.workspace_id == workspace_id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == data.conversation_id)
        .order_by(models.Message.timestamp.desc())
        .limit(5)
        .all()
    )
    history = "\n".join([f"{m.sender_type}: {m.content}" for m in reversed(messages)])
    query = f"""
    Conversation History:
    {history}

    User Message:
    {data.message}
    """

    rag = get_rag_service()
    reply = await rag.agent_loop(
        db=db,
        workspace_id=workspace_id,
        query=query,
    )
    return {"suggestion": reply}


@router.get("/local/conversations")
def local_conversations():
    return get_all_conversations()


@router.get("/local/conversations/{user_id}")
def local_messages(user_id: str):
    return get_local_messages(user_id)


# ---------------------------------------------------------------------------
# Twilio status callback — drives per-conversation ordered delivery
# ---------------------------------------------------------------------------

@router.post("/status-callback")
async def twilio_status_callback(request: Request, db: Session = Depends(get_db)):
    """Receive Twilio message status updates and advance the outbound queue.

    Twilio posts form-encoded data with at minimum:
        MessageSid    — the SID returned when the message was created
        MessageStatus — queued | sending | sent | delivered | undelivered | failed
    """
    try:
        form = await request.form()
        message_sid = form.get("MessageSid") or form.get("SmsSid")
        message_status = (form.get("MessageStatus") or form.get("SmsStatus") or "").lower()

        if not message_sid or not message_status:
            logger.warning("[status-callback] Missing MessageSid or MessageStatus — ignored")
            return str(MessagingResponse())

        logger.info(
            "[status-callback] sid=%s status=%s", message_sid, message_status
        )

        row = (
            db.query(OutboundMessage)
            .filter(OutboundMessage.twilio_sid == message_sid)
            .with_for_update()
            .first()
        )

        if not row:
            # Callback for a message not in our outbox (e.g. manual sends) — ignore.
            logger.debug("[status-callback] No outbox row for sid=%s", message_sid)
            return str(MessagingResponse())

        conversation_id = str(row.conversation_id)

        if message_status in ("sent", "delivered"):
    # Guard: if already advanced by whichever status arrived first, skip
            if row.status not in ("in_progress", "sent"):
                logger.info(
                    "[status-callback] ⚠️ Already processed | conversation=%s seq=%d sid=%s current_status=%s",
                    conversation_id, row.sequence, message_sid, row.status,
                )
                return str(MessagingResponse())

            row.status = "delivered" if message_status == "delivered" else "sent"
            db.commit()

            logger.info(
                "[status-callback] %s | conversation=%s seq=%d sid=%s",
                row.status, conversation_id, row.sequence, message_sid,
            )

            # Advance queue — send_next_pending_message is idempotent so safe to call twice
            next_msg = db.query(OutboundMessage).filter(
                OutboundMessage.conversation_id == conversation_id,
                OutboundMessage.status == "pending",
            ).first()

            if next_msg:
                logger.info(
                    "[status-callback] Triggering next message | conversation=%s",
                    conversation_id,
                )
                send_next_pending_message.delay(conversation_id)
            else:
                logger.info(
                    "[status-callback] Flow completed | conversation=%s",
                    conversation_id,
                )

        elif message_status == "delivered":
            pass  # now handled above — this branch is unreachable but harmless

        elif message_status in ("failed", "undelivered"):
            row.status = "failed"
            db.commit()
            logger.error(
                "[status-callback] Failed/undelivered | conversation=%s seq=%d sid=%s status=%s",
                conversation_id, row.sequence, message_sid, message_status,
            )
            send_next_pending_message.delay(conversation_id)

        # All other statuses (queued, sending) — no action needed.
        return str(MessagingResponse())

    except Exception:
        logger.exception("[status-callback] Unhandled error")
        return str(MessagingResponse())
