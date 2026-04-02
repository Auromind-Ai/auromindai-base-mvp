from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from .. import models, schemas, database
from app.services.twilio_service import TwilioService
from twilio.twiml.messaging_response import MessagingResponse
import logging
import uuid
from datetime import datetime
from app.models.message import MessageStatus
import requests
import os
from dotenv import load_dotenv
load_dotenv()
from app.services.lead_agent_local import lead_agent_local
from app.services.lead_agent_local import get_all_conversations, get_messages as get_local_messages  
from fastapi import Request

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/twilio",
    tags=["twilio"],
    responses={404: {"description": "Not found"}},
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# COMMON MESSAGE PROCESSOR (WHATSAPP + INSTAGRAM)
async def process_incoming_message(from_number: str, body: str, db: Session, channel: str):

    logger.info(f"[{channel}] Processing message from {from_number}: {body}")

    try:
        workspace = db.query(models.Workspace).first()
        if not workspace:
            return

        workspace_id = workspace.id

        #Find conversation
        conversation = db.query(models.Conversation).filter(
            models.Conversation.phone == from_number,
            models.Conversation.channel == channel
        ).first()

        #Create conversation
        if not conversation:
            now = datetime.utcnow()
            conversation = models.Conversation(
                id=str(uuid.uuid4()),
                phone=from_number,
                workspace_id=workspace_id,
                channel=channel,
                created_at=now,
                updated_at=now,
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        #Save ONLY USER message
        user_message = models.Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            content=body,
            sender_type=models.SenderType.USER,
            status=models.MessageStatus.RECEIVED
        )

        db.add(user_message)
        db.commit()

       
        #AUTO LEAD AGENT REPLY

        reply = lead_agent_local(from_number, body)

        if reply:
            # ONLY INSTAGRAM
            if channel == "INSTAGRAM":
                send_instagram_message(from_number, reply)

    except Exception as e:
        logger.error(f"Error: {e}")



# WHATSAPP WEBHOOK

@router.post("/webhook")
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        form_data = await request.form()
        from_number = form_data.get("From")
        body = form_data.get("Body")

        if not from_number or not body:
            return {"status": "ignored"}

        await process_incoming_message(
            from_number.replace("whatsapp:", ""),
            body,
            db,
            channel="whatsapp"
        )

        resp = MessagingResponse()
        return str(resp)

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# INSTAGRAM WEBHOOK VERIFY
@router.get("/instagram/webhook")
async def verify_instagram(request: Request):
    VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN")

    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return int(challenge)   #  MUST return only this

    return "Verification failed"

# INSTAGRAM RECEIVE

@router.post("/instagram/webhook")
async def instagram_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()

        for entry in data.get("entry", []):

            #  messaging format (REAL DM)
            for msg_event in entry.get("messaging", []):
                sender_id = msg_event.get("sender", {}).get("id")
                text = msg_event.get("message", {}).get("text")

                if sender_id and text:

                    await process_incoming_message(
                        sender_id,
                        text,
                        db,
                        channel="INSTAGRAM"
                    )

            #  changes format (test button)
            for change in entry.get("changes", []):
                value = change.get("value", {})

                sender_id = value.get("sender", {}).get("id")
                text = value.get("message", {}).get("text")

                if sender_id and text:

                    await process_incoming_message(
                        sender_id,
                        text,
                        db,
                        channel="INSTAGRAM"
                    )

        return {"status": "ok"}

    except Exception as e:
        return {"status": "error"}



# SEND INSTAGRAM MESSAGE
def send_instagram_message(psid: str, text: str):
    page_id = os.getenv("META_PAGE_ID")

    url = f"https://graph.facebook.com/v18.0/{page_id}/messages"

    payload = {
        "recipient": {"id": psid},
        "message": {"text": text},
        "messaging_type": "RESPONSE"
    }

    params = {
        "access_token": os.getenv("META_PAGE_ACCESS_TOKEN")
    }

    res = requests.post(url, json=payload, params=params)

    return res.json()



# GET CONVERSATIONS
@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db)):
    return db.query(models.Conversation).all()

#GET MESSAGES

@router.get("/conversations/{conversation_id}")
def get_messages(conversation_id: str, db: Session = Depends(get_db)):
    return db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.timestamp.asc()).all()



#SEND REPLY (MULTI CHANNEL)
@router.post("/send-reply")
def send_reply(data: schemas.SendReply, db: Session = Depends(get_db)):

    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == data.conversation_id
    ).first()

    message = models.Message(
        id=str(uuid.uuid4()),
        conversation_id=data.conversation_id,
        content=data.message,
        sender_type=models.SenderType.AGENT,
        status=MessageStatus.SENT
    )

    db.add(message)
    db.commit()

    if conversation.channel == "whatsapp":
        twilio = TwilioService()
        twilio.send_whatsapp_message(
            f"whatsapp:{data.phone}",
            data.message
        )

    elif conversation.channel == "INSTAGRAM":
        send_instagram_message(
            conversation.phone, 
            data.message
        )
        
        return {"status": "sent"}



# AI SUGGEST
@router.post("/ai-suggest")
async def ai_suggest(data: schemas.AISuggest, req: Request,  db: Session = Depends(get_db)):

    messages = db.query(models.Message).filter(
        models.Message.conversation_id == data.conversation_id
    ).order_by(models.Message.timestamp.desc()).limit(5).all()

    history = "\n".join(
        [f"{m.sender_type}: {m.content}" for m in reversed(messages)]
    )

    query = f"""
    Conversation History:
    {history}

    User Message:
    {data.message}
    """

    orchestrator = req.app.state.orchestrator

    reply = await orchestrator.agent_loop(
        db=db,
        workspace_id=data.workspace_id,
        query=query
    )

    return {"suggestion": reply}

@router.get("/local/conversations")
def local_conversations():
    return get_all_conversations()

@router.get("/local/conversations/{user_id}")
def local_messages(user_id: str):
    return get_local_messages(user_id)  