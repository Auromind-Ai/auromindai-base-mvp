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

        if code == "mock_development_code_123":
            mock_phone = data.get("mock_phone", "+1 234 567 8900")
            workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
            if not workspace:
                raise HTTPException(status_code=404, detail="Workspace not found")
            workspace.meta_access_token = "mock_token"
            workspace.meta_business_id = "mock_biz_id"
            workspace.meta_waba_id = "mock_waba_id"
            workspace.meta_phone_number_id = "mock_phone_id"
            workspace.meta_display_phone = mock_phone
            db.commit()
            return {
                "status": "connected",
                "business_id": "mock_biz_id",
                "waba_id": "mock_waba_id",
                "phone_number_id": "mock_phone_id",
                "display_number": mock_phone,
            }

        client_id = settings.META_APP_ID or settings.IG_APP_ID
        client_secret = settings.META_APP_SECRET or settings.IG_APP_SECRET
        passed_uri = data.get("redirect_uri") or ""
        
        # Build variations list to match the FB SDK's exact initiator URI
        redirect_variations = [""]
        if passed_uri:
            redirect_variations.append(passed_uri)
            if passed_uri.endswith("/"):
                redirect_variations.append(passed_uri[:-1])
            else:
                redirect_variations.append(passed_uri + "/")
        
        # Add common local secure port variations
        if "localhost:3001" in passed_uri:
            redirect_variations.extend(["https://localhost:3001/", "https://localhost:3001"])
        elif "localhost:3000" in passed_uri:
            redirect_variations.extend(["http://localhost:3000/", "http://localhost:3000"])
            
        # Add env fallbacks
        if settings.META_REDIRECT_URI:
            redirect_variations.append(settings.META_REDIRECT_URI)
        if settings.IG_REDIRECT_URI:
            redirect_variations.append(settings.IG_REDIRECT_URI)
            
        # De-duplicate while preserving order
        seen = set()
        redirect_variations = [x for x in redirect_variations if not (x in seen or seen.add(x))]
        
        logger.info("Attempting token exchange with redirect_uri variations: %s", redirect_variations)
        
        access_token = None
        token_res = {}
        for uri in redirect_variations:
            try:
                res = requests.get(
                    "https://graph.facebook.com/v19.0/oauth/access_token",
                    params={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uri": uri,
                        "code": code,
                    },
                    timeout=10,
                ).json()
                if "access_token" in res:
                    access_token = res["access_token"]
                    token_res = res
                    logger.info("Successfully exchanged code for access token using redirect_uri: %s", uri)
                    break
                else:
                    token_res = res
                    logger.warning("Failed exchange for redirect_uri %s: %s", uri, res)
            except Exception as e:
                logger.error("Error during exchange for redirect_uri %s: %s", uri, e)
                
        if not access_token:
            logger.error("All token exchange variations failed. Final error: %s", token_res)
            raise HTTPException(status_code=400, detail="Failed to get access token")

        access_token = fb_token or token_res.get("access_token")
        if not access_token:
            logger.error("Token error: %s", token_res)
            raise HTTPException(status_code=400, detail=f"Failed to get access token: {token_res}")

        phone_number_id = data.get("phone_number_id")
        waba_id = data.get("waba_id")
        business_id = data.get("business_id")
        display_number = None

        if phone_number_id and waba_id:
            # Use direct selected IDs from the Meta Embedded Signup popup!
            phone_res = requests.get(
                f"https://graph.facebook.com/v19.0/{phone_number_id}",
                params={"access_token": access_token},
                timeout=10,
            ).json()
            display_number = phone_res.get("display_phone_number")
            logger.info("Using direct user-selected WhatsApp assets: phone_number_id=%s, waba_id=%s", phone_number_id, waba_id)
        else:
            # Fallback: Search all business portfolios, all WABAs, and all phone numbers
            logger.info("No WABA/phone selected in payload. Searching all associated business portfolios...")
            business_res = requests.get(
                "https://graph.facebook.com/v19.0/me/businesses",
                params={"access_token": access_token},
                timeout=10,
            ).json()
            if not business_res.get("data"):
                raise HTTPException(status_code=400, detail="No business found associated with this Meta account.")

            found_phone = False
            for biz in business_res["data"]:
                biz_id = biz["id"]
                waba_res = requests.get(
                    f"https://graph.facebook.com/v19.0/{biz_id}/owned_whatsapp_business_accounts",
                    params={"access_token": access_token},
                    timeout=10,
                ).json()
                if not waba_res.get("data"):
                    continue
                
                for waba in waba_res["data"]:
                    w_id = waba["id"]
                    p_res = requests.get(
                        f"https://graph.facebook.com/v19.0/{w_id}/phone_numbers",
                        params={"access_token": access_token},
                        timeout=10,
                    ).json()
                    if p_res.get("data"):
                        # Found phone numbers! Prefer one starting with +91 (Indian number)
                        selected_phone = p_res["data"][0]
                        for phone in p_res["data"]:
                            disp = phone.get("display_phone_number") or ""
                            # Remove non-digits to check country code
                            digits = "".join(filter(str.isdigit, disp))
                            if digits.startswith("91"):
                                selected_phone = phone
                                logger.info("Preferred Indian WhatsApp number found: %s", disp)
                                break
                        
                        business_id = biz_id
                        waba_id = w_id
                        phone_number_id = selected_phone["id"]
                        display_number = selected_phone.get("display_phone_number")
                        found_phone = True
                        break
                if found_phone:
                    break
            
            if not found_phone:
                raise HTTPException(status_code=400, detail="No active WhatsApp phone numbers found in any associated business accounts.")

        workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Programmatically subscribe the WABA to the App's webhooks
        try:
            sub_res = requests.post(
                f"https://graph.facebook.com/v19.0/{waba_id}/subscribed_apps",
                params={"access_token": access_token},
                timeout=10,
            ).json()
            logger.info("Programmatic webhook subscription response: %s", sub_res)
        except Exception as e:
            logger.error("Failed to programmatically subscribe WABA to webhooks: %s", e)

        workspace.meta_access_token = access_token
        workspace.meta_business_id = business_id
        workspace.meta_waba_id = waba_id
        workspace.meta_phone_number_id = phone_number_id
        workspace.meta_display_phone = display_number
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
