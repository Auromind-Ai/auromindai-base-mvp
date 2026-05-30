from __future__ import annotations
import logging
import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app import models
from app.core.config import settings

logger = logging.getLogger(__name__)


class ChannelConnectionService:
    @staticmethod
    def connect_meta_whatsapp(db: Session, data: dict):
        code = data.get("code")
        fb_token = data.get("fb_access_token")
        workspace_id = data.get("workspace_id")
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")

        app_id = settings.META_APP_ID or settings.IG_APP_ID
        app_secret = settings.META_APP_SECRET or settings.IG_APP_SECRET
        redirect_uri = settings.META_REDIRECT_URI or settings.IG_REDIRECT_URI

        token_res = requests.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "client_id": app_id,
                "client_secret": app_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            },
            timeout=10,
        ).json()

        access_token = fb_token or token_res.get("access_token")
        if not access_token:
            logger.error("Token error: %s", token_res)
            raise HTTPException(status_code=400, detail="Failed to get access token")

        business_res = requests.get(
            "https://graph.facebook.com/v19.0/me/businesses",
            params={"access_token": access_token},
            timeout=10,
        ).json()
        if not business_res.get("data"):
            raise HTTPException(status_code=400, detail="No business found")

        business_id = business_res["data"][0]["id"]
        waba_res = requests.get(
            f"https://graph.facebook.com/v19.0/{business_id}/owned_whatsapp_business_accounts",
            params={"access_token": access_token},
            timeout=10,
        ).json()
        if not waba_res.get("data"):
            raise HTTPException(status_code=400, detail="No WhatsApp Business Account found")

        waba_id = waba_res["data"][0]["id"]
        phone_res = requests.get(
            f"https://graph.facebook.com/v19.0/{waba_id}/phone_numbers",
            params={"access_token": access_token},
            timeout=10,
        ).json()
        if not phone_res.get("data"):
            raise HTTPException(status_code=400, detail="No phone number found")

        phone_number_id = phone_res["data"][0]["id"]
        display_number = phone_res["data"][0].get("display_phone_number")
        workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
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
            "display_number": display_number,
        }

    @staticmethod
    def connect_instagram(db: Session, data: dict):
        code = data.get("code")
        workspace_id = data.get("workspace_id")
        if not code:
            raise HTTPException(status_code=400, detail="Missing OAuth code")
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Missing workspace_id")
        print("IG_APP_ID:", settings.IG_APP_ID)
        print("IG_APP_SECRET:", settings.IG_APP_SECRET)
        print("IG_REDIRECT_URI:", settings.IG_REDIRECT_URI)
        

        token_res = requests.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "client_id": settings.IG_APP_ID,
                "client_secret": settings.IG_APP_SECRET,
                "redirect_uri": settings.IG_REDIRECT_URI,
                "code": code,
            },
            timeout=10,
        ).json()
        access_token = token_res.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_res}")

        long_token_res = requests.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.IG_APP_ID,
                "client_secret": settings.IG_APP_SECRET,
                "fb_exchange_token": access_token,
            },
            timeout=10,
        ).json()
        long_lived_token = long_token_res.get("access_token", access_token)

        pages_res = requests.get(
            "https://graph.facebook.com/v19.0/me/accounts",
            params={"access_token": long_lived_token},
            timeout=10,
        ).json()
        pages = pages_res.get("data", [])
        if not pages:
            raise HTTPException(400, "No Facebook Pages found")

        page = pages[0]
        page_id = page["id"]
        page_access_token = page["access_token"]

        ig_data = requests.get(
            f"https://graph.facebook.com/v19.0/{page_id}",
            params={
                "fields": "instagram_business_account",
                "access_token": page_access_token,
            },
            timeout=10,
        ).json()
        ig_id = ig_data.get("instagram_business_account", {}).get("id")
        if not ig_id:
            raise HTTPException(400, "No Instagram Business Account linked")

        ig_profile = requests.get(
            f"https://graph.facebook.com/v19.0/{ig_id}",
            params={
                "fields": "username,name",
                "access_token": page_access_token,
            },
            timeout=10,
        ).json()
        username = ig_profile.get("username") or ig_profile.get("name") or ig_id

        workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(404, "Workspace not found")
        

        workspace.meta_access_token = page_access_token
        workspace.meta_business_id = page_id
        workspace.meta_ig_id = ig_id
        db.commit()

        return {
            "status": "connected",
            "page_id": page_id,
            "ig_id": ig_id,
            "username": username,
        }
