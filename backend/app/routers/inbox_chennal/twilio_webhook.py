from fastapi import APIRouter, HTTPException, Request, Depends, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.services.inbox_agents.orchestration_layer import AgentOrchestration
from ... import models, schemas, database
from app.services.inbox_agents.twilio_service import TwilioService
from twilio.twiml.messaging_response import MessagingResponse
import logging
import uuid
from datetime import datetime
from app.models.message import MessageStatus
import os
from dotenv import load_dotenv
load_dotenv()


logger = logging.getLogger(__name__)

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


@router.post("/connect")
def connect_twilio(data: dict, db: Session = Depends(get_db)):
    try:
        print("Incoming data:", data)

        workspace = db.query(models.Workspace).filter(
            models.Workspace.id == data.get("workspace_id")
        ).first()

        if not workspace:
            raise HTTPException(404, "Workspace not found")

        workspace.twilio_account_sid = data.get("sid")
        workspace.twilio_auth_token = data.get("token")
        workspace.twilio_phone_number = data.get("phone")

        db.commit()
        db.refresh(workspace)

        print("✅ Twilio connected for workspace:", workspace.id)
        return {"status": "connected"}

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", str(e))
        raise HTTPException(500, str(e))


async def process_incoming_message(
    from_number: str,
    body: str,
    to_number: str,
    db: Session
):
    print("🚀 Processing message...")
    print("📞 From:", from_number)
    print("📥 To:", to_number)
    print("💬 Message:", body)

    logger.info(f"[WhatsApp] {from_number}: {body}")

    # ✅ Clean TO number (Twilio number)
    clean_to = to_number.replace("whatsapp:", "").strip()

    # ✅ Find workspace using Twilio number
    workspace = db.query(models.Workspace).filter(
        models.Workspace.twilio_phone_number == clean_to
    ).first()

    if not workspace:
        print("❌ No workspace found for number:", clean_to)
        return

    print("✅ Workspace found:", workspace.id)

    # ✅ Check Twilio config
    if not workspace.twilio_account_sid or not workspace.twilio_auth_token:
        print("❌ Twilio not configured for workspace")
        return

    # ✅ Find existing conversation
    conversation = db.query(models.Conversation).filter(
        models.Conversation.phone == from_number,
        models.Conversation.channel == models.ChannelType.TWILIO
    ).first()

    # ✅ Create conversation if not exists
    if not conversation:
        conversation = models.Conversation(
            id=uuid.uuid4(),  # ✅ FIXED (no str)
            phone=from_number,
            workspace_id=workspace.id,
            channel=models.ChannelType.TWILIO,  # ✅ FIXED ENUM
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        print("✅ New conversation created:", conversation.id)
    else:
        conversation.updated_at = datetime.utcnow()
        db.commit()

    # ✅ Save USER message
    user_msg = models.Message(
        id=uuid.uuid4(),
        conversation_id=conversation.id,
        content=body,
        sender_type=models.SenderType.USER,
        status=models.MessageStatus.RECEIVED,
        timestamp=datetime.utcnow()
    )
    db.add(user_msg)
    db.commit()
    print("✅ User message saved")

    # 🤖 AI Reply
    try:
        orchestrator = AgentOrchestration(db=db)
        response = await orchestrator.process_message(
            payload={
                "user_id": from_number,
                "message": body
            },
            channel="twilio"
        )

        reply = response.get("text")
       
    except Exception as e:
        print(f"❌ AI agent error: {e}")
        reply = None

    if not reply:
        print("⚠️ No AI reply generated")
        return

    # ✅ Send via Twilio
    try:
        twilio = TwilioService(
            workspace.twilio_account_sid,
            workspace.twilio_auth_token,
            workspace.twilio_phone_number
        )

        twilio.send_whatsapp_message(from_number, reply)

        # ✅ Save AI message
        ai_msg = models.Message(
            id=uuid.uuid4(),
            conversation_id=conversation.id,
            content=reply,
            sender_type=models.SenderType.AI,
            status=models.MessageStatus.SENT,
            timestamp=datetime.utcnow()
        )
        db.add(ai_msg)
        db.commit()

        print("✅ AI reply sent and saved")

    except Exception as e:
        print(f"❌ Twilio send error: {e}")


# WHATSAPP WEBHOOK
@router.post("/webhook")
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        form_data = await request.form()
        print("🔥 RAW TWILIO DATA:", dict(form_data))

        from_number = form_data.get("From", "")
        to_number = form_data.get("To", "")   # ✅ important
        body = form_data.get("Body", "")

        print("📩 From:", from_number)
        print("📥 To:", to_number)
        print("💬 Body:", body)

        if not from_number or not body:
            print("⚠️ Missing From or Body, ignoring")
            return PlainTextResponse(str(MessagingResponse()), media_type="text/xml")

        # ✅ clean both numbers
        clean_from = from_number.replace("whatsapp:", "").strip()
        clean_to = to_number.replace("whatsapp:", "").strip()

        print("✅ Clean FROM:", clean_from)
        print("✅ Clean TO:", clean_to)

        # 🔥 THIS IS THE MAIN FIX
        await process_incoming_message(clean_from, body, clean_to, db)

        return PlainTextResponse(str(MessagingResponse()), media_type="text/xml")

    except Exception as e:
        print(f"❌ Webhook error: {e}")
        logger.error(f"Webhook error: {e}")
        return PlainTextResponse(str(MessagingResponse()), media_type="text/xml")



# AI SUGGEST
@router.post("/ai-suggest")
async def ai_suggest(data: schemas.AISuggest, req: Request, db: Session = Depends(get_db)):
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




@router.get("/status/{workspace_id}")
def twilio_status(workspace_id: str, db: Session = Depends(get_db)):

    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id
    ).first()

    if not workspace:
        raise HTTPException(404, "Workspace not found")

    is_connected = (
        workspace.twilio_account_sid and
        workspace.twilio_auth_token and
        workspace.twilio_phone_number
    )

    return {
        "connected": bool(is_connected)
    }