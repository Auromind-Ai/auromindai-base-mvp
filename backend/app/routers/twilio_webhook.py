from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .. import models, schemas, database
from app.services.twilio_service import TwilioService
from twilio.twiml.messaging_response import MessagingResponse
import logging
import uuid
from app.services.agentic_rag.rag_service import get_rag_service
from app.workers.tasks import process_whatsapp_message
from datetime import datetime
from app.models.message import MessageStatus

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

async def process_incoming_message(from_number: str, body: str, db: Session):

    logger.info(f"Processing message from {from_number}: {body}")

    try:

        workspace = db.query(models.Workspace).first()
        if not workspace:
            logger.error("No workspace found")
            return

        workspace_id = workspace.id

        # 🔹 Find conversation
        conversation = db.query(models.Conversation).filter(
            models.Conversation.phone == from_number
        ).first()

        # 🔹 Create conversation if not exists
        if not conversation:
            # include timestamps here so SQLAlchemy inserts valid values even
            # if the underlying table lacks a default for updated_at.
           

            now = datetime.utcnow()
            conversation = models.Conversation(
                id=str(uuid.uuid4()),
                phone=from_number,
                workspace_id=workspace_id,
                created_at=now,
                updated_at=now,
            )

            db.add(conversation)
            db.commit()
            db.refresh(conversation)

            logger.info(f"New conversation created: {conversation.id}")

        # 🔹 Save user message (ALWAYS)
        user_message = models.Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            content=body,
            sender_type=models.SenderType.USER,
            status=models.MessageStatus.RECEIVED
        )

        db.add(user_message)
        db.commit()
                
        # 1. Generate AI Response
        rag = get_rag_service()

        ai_reply = rag.agent_loop(
            db=db,
            workspace_id=workspace_id,
            query=body
        )

        if not ai_reply:
            ai_reply = "I'm here to help. Could you please provide more details?"

        
        # Save AI message
        ai_message = models.Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            content=ai_reply,
            sender_type=models.SenderType.AI,
            status=models.MessageStatus.SUGGESTED
        )

        db.add(ai_message)
        db.commit()

        # # Send message
        # twilio_service = TwilioService()
        # twilio_service.send_whatsapp_message(
        #     f"whatsapp:{from_number}",
        #     ai_reply
        # )

    except Exception as e:
        logger.error(f"Error processing incoming message: {e}")

@router.post("/webhook")

async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    print("TWILIO WEBHOOK HIT")
    """
    Webhook endpoint for Twilio to send incoming messages.
    Offloads processing to Celery.
    """
    try:
        form_data = await request.form()
        from_number = form_data.get("From")
        body = form_data.get("Body")
        
        if not from_number or not body:
            return {"status": "ignored", "reason": "missing_data"}
            
        logger.info(f"Received WhatsApp message from {from_number}. Queuing task.")
        
        # Prepare data for serializable task
        message_data = {
            "from": from_number.replace("whatsapp:", ""),
            "message": body,
            "raw_from": from_number
        }
        
        # Enqueue Task
        await process_incoming_message(
            from_number.replace("whatsapp:", ""),
            body,
            db
        )
        print("Processing incoming message:", from_number, body)
        # Return empty TwiML to signal we handled it
        resp = MessagingResponse()
        return str(resp)
        
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        return {"status": "error", "reason": str(e)}

@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db)):

    conversations = db.query(models.Conversation).all()

    return conversations

@router.post("/send-reply")
def send_reply(data: schemas.SendReply, db: Session = Depends(get_db)):

    message = models.Message(
        id=str(uuid.uuid4()),
        conversation_id=data.conversation_id,
        content=data.message,
        sender_type=models.SenderType.AGENT,
        status=MessageStatus.SENT
    )

    db.add(message)
    db.commit()

    twilio = TwilioService()
    twilio.send_whatsapp_message(
        f"whatsapp:{data.phone}",
        data.message
    )

    return {"status": "sent"}

@router.get("/conversations/{conversation_id}")
def get_messages(conversation_id: str, db: Session = Depends(get_db)):

    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.timestamp.asc()).all()

    return messages

@router.post("/ai-suggest")
def ai_suggest(data: schemas.AISuggest, db: Session = Depends(get_db)):

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

    rag = get_rag_service()

    reply = rag.agent_loop(
        db=db,
        workspace_id=data.workspace_id,
        query=query
    )

    return {"suggestion": reply}