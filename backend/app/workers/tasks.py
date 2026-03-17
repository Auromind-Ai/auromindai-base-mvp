from app.core.celery_app import celery_app
from app.services.after_hours_service import OfficeHoursManager, AfterHoursResponder, IntentClassifier
# from app.mcp.orchestrator import MCPOrchestrator
from app.services.ai_response_service import AIResponseService
from app.database import SessionLocal
from app.models import Conversation, Message
from app.core.websockets import manager
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@celery_app.task(bind=True)
def process_whatsapp_message(self, message_data: dict):
    """
    Celery task to process incoming WhatsApp message.
    Wraps async logic since Celery tasks are synchronous by default.
    """
    asyncio.run(handle_message_async(message_data))

async def handle_message_async(message_data: dict):
    phone = message_data['from']
    body = message_data['message']
    
    logger.info(f"Processing message from {phone}: {body}")
    
    db = SessionLocal()
    try:
        # 1. Get Conversation/Lead
        conversation = db.query(Conversation).filter(Conversation.contact_phone == phone).first()
        if not conversation:
            logger.warning(f"No conversation found for {phone}, skipping.")
            return

        # 2. Check Office Hours
        office_mgr = OfficeHoursManager()
        
        if office_mgr.is_office_hours():
            # DURIG HOURS: Enriched AI Response via WebSocket
            logger.info("During Office Hours -> Generating AI suggestion.")
            
            ai_service = AIResponseService()
            
            # Generate Variants with MCP Context
            # Note: ai_service.generate_variants internally calls MCPOrchestrator via enrich_context
            variants = await ai_service.generate_variants(db, conversation.id)
            
            # Notify Frontend via WebSocket
            await manager.broadcast({
                "type": "new_message",
                "conversation_id": conversation.id,
                "message": body,
                "ai_suggestions": variants
            })
            
        else:
            # AFTER HOURS: Auto-Response
            logger.info("After Hours -> Auto-responding.")
            
            responder = AfterHoursResponder()
            
            # Context for intent classifier
            context = {"history": "..."} # Simplified for now
            
            # Classify & Respond
            response_data = await responder.handle_request(body, phone, context, db)
            
            # Verify if response was sent (AfterHoursResponder handles sending via Twilio)
            logger.info(f"Auto-response generated: {response_data}")
            
            # Notify Frontend of the auto-response
            await manager.broadcast({
                "type": "auto_response",
                "conversation_id": conversation.id,
                "user_message": body,
                "bot_message": response_data.get("response", "")
            })

    except Exception as e:
        logger.error(f"Error in process_whatsapp_message: {e}")
    finally:
        db.close()
