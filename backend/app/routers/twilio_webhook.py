from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .. import models, schemas, database
from app.services.twilio_service import TwilioService
from app.services.rag_service import get_rag_service
from twilio.twiml.messaging_response import MessagingResponse
import logging
import uuid

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

async def process_incoming_message(from_number: str, body: str, conversation_id: str, db: Session):
    """
    Process incoming WhatsApp message:
    1. Generate AI Response via RAG
    2. Save AI reply to database
    3. Send Reply via Twilio
    """
    logger.info(f"Processing message from {from_number}: {body}")
    try:
        # Get conversation
        conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
        if not conversation:
            logger.error(f"Conversation {conversation_id} not found")
            return

        workspace = db.query(models.Workspace).first()
        if not workspace:
            logger.error("No workspace found for AI processing")
            return

        workspace_id = workspace.id
        
        # 1. Generate AI Response
        rag_service = get_rag_service()
        
        response = rag_service.query(
            db=db,
            workspace_id=workspace_id,
            question=body,
            chat_mode="auto"
        )
        
        ai_reply = response.get("answer", "I'm sorry, I couldn't process that.")
        
        # 2. Save AI Reply to database
        ai_message = models.Message(
            conversation_id=conversation.id,
            content=ai_reply,
            sender_type=models.SenderType.AI
        )
        db.add(ai_message)
        db.commit()
        
        logger.info(f"AI reply saved to conversation {conversation.id}")

        # 3. Send Reply
        logger.info(f"Sending reply: {ai_reply}")
        twilio_service = TwilioService()
        twilio_service.send_whatsapp_message(from_number, ai_reply)
        
    except Exception as e:
        logger.error(f"Error processing incoming message: {e}")

@router.post("/webhook")
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
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
        from app.workers.tasks import process_whatsapp_message
        task = process_whatsapp_message.delay(message_data)
        
        # Return empty TwiML to signal we handled it
        resp = MessagingResponse()
        return str(resp)
        
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        return {"status": "error", "reason": str(e)}
