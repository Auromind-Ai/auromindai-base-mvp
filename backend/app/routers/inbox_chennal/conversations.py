from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
from app import models, schemas
from app.database import get_db
from app.services.inbox_agents.twilio_service import TwilioService
from app.services.inbox_agents.whatsapp import WhatsAppService
from app.services.inbox_agents.instagram_service import InstagramService

router = APIRouter(prefix="/api", tags=["Unified Inbox"])



# GET CONVERSATIONS
@router.get("/conversations")
def get_conversations(workspace_id: str, channel: str = None, db: Session = Depends(get_db)):

    query = db.query(models.Conversation).filter(
        models.Conversation.workspace_id == workspace_id
    )

    if channel:
        query = query.filter(
            models.Conversation.channel == models.ChannelType[channel.upper()]
        )

    return query.order_by(models.Conversation.updated_at.desc()).all()



# GET MESSAGES
@router.get("/messages/{conversation_id}")
def get_messages(conversation_id: str, db: Session = Depends(get_db)):

    return db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.timestamp.asc()).all()


# SEND MESSAGE (MULTI CHANNEL)
@router.post("/send-reply")
def send_reply(data: schemas.SendReply, db: Session = Depends(get_db)):

    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == data.conversation_id
    ).first()

    if not conversation:
        raise HTTPException(404, "Conversation not found")

    workspace = conversation.workspace

    # SAVE MESSAGE
    msg = models.Message(
        id=uuid.uuid4(),
        conversation_id=conversation.id,
        content=data.message,
        sender_type=models.SenderType.AGENT,
        status=models.MessageStatus.SENT,
        timestamp=datetime.utcnow()
    )
    db.add(msg)

    conversation.updated_at = datetime.utcnow()
    db.commit()


    # CHANNEL SWITCH
    if conversation.channel == models.ChannelType.TWILIO:

        twilio = TwilioService(
            workspace.twilio_account_sid,
            workspace.twilio_auth_token,
            workspace.twilio_phone_number
        )

        twilio.send_whatsapp_message(conversation.phone, data.message)

    elif conversation.channel == models.ChannelType.WHATSAPP:

        wa = WhatsAppService(
            access_token=workspace.meta_access_token,
            phone_number_id=workspace.meta_phone_number_id
        )

        wa.send_text_message(conversation.phone, data.message)

    elif conversation.channel == models.ChannelType.INSTAGRAM:

        insta = InstagramService(
            workspace.meta_access_token,
            workspace.meta_ig_id
        )

        insta.send_message(conversation.external_id, data.message)

    else:
        raise HTTPException(400, "Unsupported channel")

    return {"status": "sent"}