from datetime import datetime
import uuid
import os
import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app import models
from app.services.inbox_agents.instagram_service import InstagramService
from app.database import get_db
from app.services.inbox_agents.orchestration_layer import AgentOrchestration

router = APIRouter(prefix="/instagram", tags=["instagram"])




# POST /api/instagram/connect
@router.post("/connect")
def connect_instagram(data: dict, db: Session = Depends(get_db)):

    code         = data.get("code")
    workspace_id = data.get("workspace_id")

    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing workspace_id")

    #Exchange code → short-lived token
    token_res = requests.get(
        "https://graph.facebook.com/v19.0/oauth/access_token",
        params={
            "client_id":     os.getenv("IG_APP_ID"),
            "client_secret": os.getenv("IG_APP_SECRET"),
            "redirect_uri":  os.getenv("IG_REDIRECT_URI"),
            "code":          code,
        },
        timeout=10,
    ).json()

    print("Token response:", token_res)

    access_token = token_res.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=400,
            detail=f"Token exchange failed: {token_res}"
        )

    #Long-lived token
    long_token_res = requests.get(
        "https://graph.facebook.com/v19.0/oauth/access_token",
        params={
            "grant_type":        "fb_exchange_token",
            "client_id":         os.getenv("IG_APP_ID"),
            "client_secret":     os.getenv("IG_APP_SECRET"),
            "fb_exchange_token": access_token,
        },
        timeout=10,
    ).json()

    long_lived_token = long_token_res.get("access_token", access_token)

    #Get pages
    pages_res = requests.get(
        "https://graph.facebook.com/v19.0/me/accounts",
        params={"access_token": long_lived_token},
        timeout=10,
    ).json()

    print("Pages response:", pages_res)

    pages = pages_res.get("data", [])
    if not pages:
        raise HTTPException(400, "No Facebook Pages found")

    page = pages[0]

    page_id = page["id"]
    page_access_token = page["access_token"]   # ✅ IMPORTANT FIX

    #Get IG account
    ig_data = requests.get(
        f"https://graph.facebook.com/v19.0/{page_id}",
        params={
            "fields": "instagram_business_account",
            "access_token": page_access_token,   # ✅ USE PAGE TOKEN
        },
        timeout=10,
    ).json()

    ig_id = ig_data.get("instagram_business_account", {}).get("id")

    if not ig_id:
        raise HTTPException(400, "No Instagram Business Account linked")

    #Get username
    ig_profile = requests.get(
        f"https://graph.facebook.com/v19.0/{ig_id}",
        params={
            "fields": "username,name",
            "access_token": page_access_token,
        },
        timeout=10,
    ).json()

    username = ig_profile.get("username") or ig_profile.get("name") or ig_id

    #Save to DB
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id
    ).first()

    if not workspace:
        raise HTTPException(404, "Workspace not found")

    workspace.meta_access_token = page_access_token   # ✅ FIXED
    workspace.meta_business_id  = page_id
    workspace.meta_ig_id        = ig_id
    workspace.updated_at        = datetime.utcnow()

    db.commit()

    print("✅ SAVED:", page_id, ig_id)

    return {
        "status":   "connected",
        "page_id":  page_id,
        "ig_id":    ig_id,
        "username": username,
    }



@router.post("/webhook")
async def receive_instagram(request: Request, db: Session = Depends(get_db)):
    print("🔥 WEBHOOK HIT")

    data = await request.json()
    print("📦 FULL PAYLOAD:", data)

    for entry in data.get("entry", []):
        ig_id = entry.get("id")
        print("📍 IG ID:", ig_id)

        # ✅ FIX: Instagram uses "messaging" directly
        messages = entry.get("messaging") or []

        if not messages:
            print("⚠️ No messaging events found")
            continue

        for msg in messages:
            print("📨 RAW MESSAGE:", msg)

            message_data = msg.get("message", {})

            # ❌ Ignore echo (your own messages)
            if message_data.get("is_echo"):
                print("⚠️ Ignoring echo message")
                continue

            # ✅ ADD THIS BLOCK HERE 👇
            message_id = message_data.get("mid")

            if message_id:
                existing = db.query(models.Message).filter(
                    models.Message.external_id == message_id
                ).first()

                if existing:
                    print("⚠️ Duplicate message skipped")
                    continue

            text = message_data.get("text")
            sender_id = msg.get("sender", {}).get("id")

            print("📩 TEXT:", text)
            print("👤 SENDER:", sender_id)

            if not text:
                print("⚠️ Skipping non-text message")
                continue

            if not sender_id:
                print("⚠️ Missing sender_id")
                continue

            # FIND WORKSPACE
            workspace = db.query(models.Workspace).filter(
                models.Workspace.meta_ig_id == ig_id
            ).first()

            print("🏢 WORKSPACE FOUND:", workspace)

            if not workspace:
                print("❌ No workspace mapped for IG ID")
                continue

            # FETCH USER PROFILE (ADD HERE)
            profile = requests.get(
                f"https://graph.facebook.com/v19.0/{sender_id}",
                params={
                    "fields": "name,username,profile_pic",
                    "access_token": workspace.meta_access_token,
                }
            ).json()

            print("👤 PROFILE:", profile)

            contact_name = profile.get("username") or profile.get("name") or sender_id
            profile_pic = profile.get("profile_pic")

            # UPSERT CONVERSATION 
            conversation = db.query(models.Conversation).filter(
                models.Conversation.external_id == sender_id,
                models.Conversation.workspace_id == workspace.id,
                models.Conversation.channel == models.ChannelType.INSTAGRAM,
            ).first()

            if not conversation:
                print("🆕 Creating new conversation")

                conversation = models.Conversation(
                    id=uuid.uuid4(),
                    external_id=sender_id,
                    workspace_id=workspace.id,
                    channel=models.ChannelType.INSTAGRAM,
                    contact_name=contact_name,   # ✅ ADD
                    profile_pic=profile_pic,     # ✅ ADD
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
            else:
                print("♻️ Updating existing conversation")
                conversation.updated_at = datetime.utcnow()

                if contact_name:
                    conversation.contact_name = contact_name

                if profile_pic:
                    conversation.profile_pic = profile_pic

                db.commit()

            #SAVE MESSAGE 
            print("💾 Saving message to DB")

            db.add(models.Message(
                id=uuid.uuid4(),
                conversation_id=conversation.id,
                external_id=message_id,
                content=text,
                sender_type=models.SenderType.USER,
                status=models.MessageStatus.RECEIVED,
                timestamp=datetime.utcnow(),
            ))
            db.commit()

            # GENERATE AI REPLY 
            try:
                print("🤖 Generating AI reply...")
                orchestrator = AgentOrchestration(db=db)
                response = await orchestrator.process_message(
                    payload={
                        "user_id": sender_id,
                        "message": text
                    },
                    channel="instagram"
                )

                reply = response.get("text")

                print("🤖 AI REPLY:", reply)
            except Exception as e:
                print("❌ AI ERROR:", e)
                reply = None

            #SEND REPLY
            if reply:
                print("📤 Sending reply to Instagram...")

                insta = InstagramService(
                    access_token=workspace.meta_access_token,
                    page_id=workspace.meta_business_id,
                )

                db.add(models.Message(
                    id=uuid.uuid4(),
                    conversation_id=conversation.id,
                    content=reply,
                    sender_type=models.SenderType.AGENT,
                    status=models.MessageStatus.SENT,
                    timestamp=datetime.utcnow(),
                ))
                db.commit()

                res = insta.send_message(sender_id, reply)
                print("📤 SEND RESPONSE:", res)
            else:
                print("⚠️ No reply generated")

    return {"status": "ok"}



# Meta webhook verification
@router.get("/webhook")
async def verify_instagram(request: Request):
    VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", "your_verify_token")

    mode      = request.query_params.get("hub.mode")
    token     = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return int(challenge)

    raise HTTPException(status_code=403, detail="Verification failed")