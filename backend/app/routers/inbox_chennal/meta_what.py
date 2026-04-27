from datetime import datetime
import os
import uuid
import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
import logging
from app.services.inbox_agents.orchestration_layer import AgentOrchestration
from app.services.inbox_agents.whatsapp import WhatsAppService





logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/whatsapp/connect")
async def connect_whatsapp(data: dict, db: Session = Depends(get_db)):

    code = data.get("code")
    fb_token = data.get("fb_access_token")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        #Exchange code → access_token
        token_res = requests.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "client_id": os.getenv("META_APP_ID"),
                "client_secret": os.getenv("META_APP_SECRET"),
                "redirect_uri": os.getenv("META_REDIRECT_URI"),
                "code": code
            }
        ).json()

        access_token = fb_token or token_res.get("access_token")

        if not access_token:
            logger.error(f"Token error: {token_res}")
            raise HTTPException(status_code=400, detail="Failed to get access token")

        #Get Business ID
        business_res = requests.get(
            "https://graph.facebook.com/v19.0/me/businesses",
            params={"access_token": access_token}
        ).json()

        if not business_res.get("data"):
            raise HTTPException(status_code=400, detail="No business found")

        business_id = business_res["data"][0]["id"]

        #Get WABA ID
        waba_res = requests.get(
            f"https://graph.facebook.com/v19.0/{business_id}/owned_whatsapp_business_accounts",
            params={"access_token": access_token}
        ).json()

        if not waba_res.get("data"):
            raise HTTPException(status_code=400, detail="No WhatsApp Business Account found")

        waba_id = waba_res["data"][0]["id"]

        #Get Phone Number ID
        phone_res = requests.get(
            f"https://graph.facebook.com/v19.0/{waba_id}/phone_numbers",
            params={"access_token": access_token}
        ).json()

        if not phone_res.get("data"):
            raise HTTPException(status_code=400, detail="No phone number found")

        phone_number_id = phone_res["data"][0]["id"]
        display_number = phone_res["data"][0].get("display_phone_number")

        # Save to DB (IMPORTANT: workspace-based)
        workspace = db.query(models.Workspace).filter(
            models.Workspace.id == data.get("workspace_id")
        ).first()

        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        workspace.meta_access_token = access_token
        workspace.meta_business_id = business_id
        workspace.meta_waba_id = waba_id
        workspace.meta_phone_number_id = phone_number_id

        db.commit()

        return {
            "status": "connected",
            "business_id": business_id,
            "waba_id": waba_id,
            "phone_number_id": phone_number_id,
            "display_number": display_number
        }

    except Exception as e:
        logger.error(f"WhatsApp connect error: {str(e)}")
        raise HTTPException(status_code=500, detail="WhatsApp connection failed")
    
@router.get("/whatsapp/webhook")
async def verify_webhook(request: Request):
    VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN")

    if (
        request.query_params.get("hub.mode") == "subscribe"
        and request.query_params.get("hub.verify_token") == VERIFY_TOKEN
    ):
        return int(request.query_params.get("hub.challenge"))

    return {"status": "failed"}

@router.post("/whatsapp/webhook")
async def receive_whatsapp(request: Request, db: Session = Depends(get_db)):

    try:
        data = await request.json()

        for entry in data.get("entry", []):
            for change in entry.get("changes", []):

                value = change.get("value", {})

                messages = value.get("messages")
                metadata = value.get("metadata")

                if not messages:
                    continue

                msg = messages[0]

                from_number = msg.get("from")  # customer number
                msg_text = msg.get("text", {}).get("body", "")

                phone_number_id = metadata.get("phone_number_id")

                if not from_number or not msg_text:
                    continue

                # FIND WORKSPACE USING phone_number_id
                workspace = db.query(models.Workspace).filter(
                    models.Workspace.meta_phone_number_id == phone_number_id
                ).first()

                if not workspace:
                    logger.warning(f"No workspace for phone_number_id: {phone_number_id}")
                    continue

                # FIND OR CREATE CONVERSATION
                conversation = db.query(models.Conversation).filter(
                    models.Conversation.phone == from_number,
                    models.Conversation.workspace_id == workspace.id
                ).first()

                if not conversation:
                    conversation = models.Conversation(
                        id=uuid.uuid4(),
                        phone=from_number,
                        workspace_id=workspace.id,
                        channel=models.ChannelType.WHATSAPP,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(conversation)
                    db.commit()
                    db.refresh(conversation)

                #SAVE USER MESSAGE
                user_msg = models.Message(
                    id=uuid.uuid4(),
                    conversation_id=conversation.id,
                    content=msg_text,
                    sender_type=models.SenderType.USER,
                    status=models.MessageStatus.RECEIVED
                )

                db.add(user_msg)
                db.commit()

                logger.info(f"Message saved: {from_number} → {msg_text}")

                # AUTO AI REPLY  
                orchestrator = AgentOrchestration(db=db)
                response = await orchestrator.process_message(
                    payload={
                        "user_id": from_number,
                        "message": msg_text
                    },
                    channel="whatsapp"
                )

                reply = response.get("text")

                if reply:
                    wa = WhatsAppService(
                        access_token=workspace.meta_access_token,
                        phone_number_id=workspace.meta_phone_number_id
                    )

                    wa.send_text_message(from_number, reply)

                    # SAVE AI MESSAGE
                    ai_msg = models.Message(
                        id=uuid.uuid4(),
                        conversation_id=conversation.id,
                        content=reply,
                        sender_type=models.SenderType.AI,
                        status=models.MessageStatus.SENT
                    )

                    db.add(ai_msg)
                    db.commit()

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error"}