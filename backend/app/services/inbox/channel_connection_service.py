from __future__ import annotations

import logging

import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models

logger = logging.getLogger(__name__)


class ChannelConnectionService:
    @staticmethod
    def connect_meta_whatsapp(db: Session, data: dict):
        code = data.get("code")
        fb_token = data.get("fb_access_token")
        workspace_id = data.get("workspace_id")
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")

        from app.services.config_service import config_service
        app_id = config_service.get("meta_app_id") or config_service.get("ig_app_id")
        app_secret = config_service.get("meta_app_secret") or config_service.get("ig_app_secret")
        
        params = {
            "client_id": app_id,
            "client_secret": app_secret,
            "code": code,
        }
        # For FB SDK, the redirect_uri must match the frontend exact URL or be omitted
        if "redirect_uri" in data:
            params["redirect_uri"] = data["redirect_uri"]
        else:
            # Fallback to empty string for JS SDK if not provided
            params["redirect_uri"] = ""

        logger.info(f"Token exchange params: client_id={app_id}, redirect_uri={params.get('redirect_uri')}")
        token_res = requests.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params=params,
            timeout=10,
        ).json()
        logger.info(f"Token response: {token_res}")

        access_token = fb_token or token_res.get("access_token")
        if not access_token:
            logger.error("Token error: %s", token_res)
            raise HTTPException(status_code=400, detail=f"Failed to get access token: {token_res}")

        # Debug logging requested by the user to verify token permissions and Graph API responses
        waba_debug_data = None
        business_debug_data = None
        permissions_debug_data = None

        try:
            print("START DEBUG META OAUTH RESPONSES")
            
            # Fetch token details using /debug_token (this is the Meta-recommended way for Embedded Signup)
            debug_token_res = requests.get(
                "https://graph.facebook.com/v19.0/debug_token",
                params={
                    "input_token": access_token,
                    "access_token": f"{app_id}|{app_secret}"
                },
                timeout=10,
            )
            debug_token_data = debug_token_res.json()
            print(f"Debug Token Response: {debug_token_data}")
            
            print("END DEBUG META OAUTH RESPONSES")
        except Exception as e:
            print(f"Error during debug_token Meta OAuth logging: {e}")
            debug_token_data = {}

        # Collect all unique candidate WABA IDs from all lookup flows
        candidate_waba_ids = []

        # 1. Extract WABA ID from granular scopes in the debug_token response
        if debug_token_data and debug_token_data.get("data"):
            granular_scopes = debug_token_data["data"].get("granular_scopes", [])
            for scope_obj in granular_scopes:
                scope_name = scope_obj.get("scope", "")
                if scope_name.startswith("whatsapp_business_"):
                    target_ids = scope_obj.get("target_ids", [])
                    for tid in target_ids:
                        if tid not in candidate_waba_ids:
                            candidate_waba_ids.append(tid)

        # 2. Try retrieving assigned accounts for System User
        try:
            assigned_res = requests.get(
                "https://graph.facebook.com/v19.0/me/assigned_whatsapp_business_accounts",
                params={"access_token": access_token},
                timeout=10,
            )
            assigned_data = assigned_res.json()
            logger.info(f"Assigned WABAs response: {assigned_data}")
            if assigned_data.get("data"):
                for item in assigned_data["data"]:
                    tid = item.get("id")
                    if tid and tid not in candidate_waba_ids:
                        candidate_waba_ids.append(tid)
        except Exception as e:
            logger.error(f"Failed to fetch assigned WABAs: {e}")

        # 3. Fallback to checking the user's businesses list
        try:
            business_res = requests.get(
                "https://graph.facebook.com/v19.0/me/businesses",
                params={"access_token": access_token},
                timeout=10,
            )
            business_data = business_res.json()
            logger.info(f"Fallback Business response: {business_data}")
            if business_data.get("data"):
                for bus in business_data["data"]:
                    bus_id = bus.get("id")
                    if bus_id:
                        waba_res = requests.get(
                            f"https://graph.facebook.com/v19.0/{bus_id}/owned_whatsapp_business_accounts",
                            params={"access_token": access_token},
                            timeout=10,
                        )
                        waba_res_data = waba_res.json()
                        logger.info(f"Fallback owned WABAs response: {waba_res_data}")
                        if waba_res_data.get("data"):
                            for item in waba_res_data["data"]:
                                tid = item.get("id")
                                if tid and tid not in candidate_waba_ids:
                                    candidate_waba_ids.append(tid)
        except Exception as e:
            logger.error(f"Failed to fetch fallback WABA: {e}")

        logger.info(f"Found candidate WABA IDs: {candidate_waba_ids}")

        # Gather all phone numbers across all candidate WABAs and score them
        candidates = []
        for w_id in candidate_waba_ids:
            try:
                phone_res = requests.get(
                    f"https://graph.facebook.com/v19.0/{w_id}/phone_numbers",
                    params={"access_token": access_token},
                    timeout=10,
                ).json()
                logger.info(f"Phone numbers response for WABA {w_id}: {phone_res}")
                if phone_res.get("data"):
                    for phone_data in phone_res["data"]:
                        display_num = phone_data.get("display_phone_number") or ""
                        platform_type = phone_data.get("platform_type") or ""
                        quality_rating = phone_data.get("quality_rating") or ""
                        code_verification = phone_data.get("code_verification_status") or ""
                        
                        # Calculate a score to select the best production number
                        score = 0
                        if platform_type == "CLOUD_API":
                            score += 10
                        if quality_rating != "UNKNOWN" and quality_rating != "":
                            score += 5
                        if code_verification == "VERIFIED":
                            score += 3
                        # Avoid choosing default Meta test phone numbers if possible
                        if not (display_num.startswith("+1 555-961") or display_num.startswith("+1 555-980") or "555-01" in display_num):
                            score += 2
                        
                        candidates.append({
                            "waba_id": w_id,
                            "phone_number_id": phone_data["id"],
                            "display_number": display_num,
                            "score": score
                        })
            except Exception as e:
                logger.error(f"Failed to fetch phone numbers for WABA {w_id}: {e}")

        if not candidates:
            raise HTTPException(
                status_code=400,
                detail="No WhatsApp Business Account or phone number found. Please ensure your WhatsApp Business Account is set up."
            )

        # Sort candidate phone numbers by score descending
        candidates.sort(key=lambda x: x["score"], reverse=True)
        best_candidate = candidates[0]
        
        waba_id = best_candidate["waba_id"]
        phone_number_id = best_candidate["phone_number_id"]
        display_number = best_candidate["display_number"]
        
        logger.info(f"Selected best candidate: {best_candidate}")

        # Try to retrieve the parent Business ID for the selected WABA
        business_id = None
        try:
            waba_info_res = requests.get(
                f"https://graph.facebook.com/v19.0/{waba_id}",
                params={"fields": "owner_business_info", "access_token": access_token},
                timeout=10,
            )
            waba_info_data = waba_info_res.json()
            logger.info(f"WABA details response: {waba_info_data}")
            owner_info = waba_info_data.get("owner_business_info")
            if owner_info:
                business_id = owner_info.get("id")
                logger.info(f"Successfully retrieved Business ID from WABA owner_business_info: {business_id}")
        except Exception as e:
            logger.error(f"Failed to fetch WABA details for Business ID: {e}")

        print("================================")
        print("DISPLAY NUMBER:", display_number)
        print("PHONE NUMBER ID:", phone_number_id)
        print("WABA ID:", waba_id)
        print("================================")
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
        
        # ACTIVATE WEBHOOKS: We must explicitly tell Meta to route messages for this WABA to our app's webhook URL
        # Note: Meta strictly requires the App's System User Token for this endpoint!
        from app.services.config_service import config_service
        system_token = config_service.get("meta_system_user_token") or access_token
        try:
            print(system_token)
            subscribe_res = requests.post(
                f"https://graph.facebook.com/v19.0/{waba_id}/subscribed_apps",
                headers={"Authorization": f"Bearer {system_token}"},
                timeout=10,
            )

            print("========== WABA SUBSCRIBE ==========")
            print("SUBSCRIBE STATUS:", subscribe_res.status_code)
            print("SUBSCRIBE BODY:", subscribe_res.text)

            check = requests.get(
                f"https://graph.facebook.com/v19.0/{waba_id}/subscribed_apps",
                headers={
                    "Authorization": f"Bearer {system_token}"
                },
                timeout=10,
            )

            print("CHECK STATUS:", check.status_code)
            print("CHECK SUBSCRIBED:", check.text)
            print("====================================")

        except Exception as e:
            logger.error(f"Failed to subscribe app to WABA webhooks: {e}")

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
        from app.services.config_service import config_service
        print("IG_APP_ID:", config_service.get("ig_app_id"))
        print("IG_APP_SECRET:", config_service.get("ig_app_secret"))
        print("IG_REDIRECT_URI:", config_service.get("ig_redirect_uri"))
        

        token_res = requests.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "client_id": config_service.get("ig_app_id"),
                "client_secret": config_service.get("ig_app_secret"),
                "redirect_uri": config_service.get("ig_redirect_uri"),
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
                "client_id": config_service.get("ig_app_id"),
                "client_secret": config_service.get("ig_app_secret"),
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

        page_id = None
        page_access_token = None
        ig_id = None

        for page in pages:
            temp_page_id = page["id"]
            temp_page_access_token = page["access_token"]

            ig_data = requests.get(
                f"https://graph.facebook.com/v19.0/{temp_page_id}",
                params={
                    "fields": "instagram_business_account",
                    "access_token": temp_page_access_token,
                },
                timeout=10,
            ).json()
            
            temp_ig_id = ig_data.get("instagram_business_account", {}).get("id")
            if temp_ig_id:
                page_id = temp_page_id
                page_access_token = temp_page_access_token
                ig_id = temp_ig_id
                break

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
