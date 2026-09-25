from __future__ import annotations

import logging

import requests
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app import models
from app.services.marketing.whatsapp_tier_service import WhatsAppTierService

logger = logging.getLogger(__name__)


class ChannelConnectionService:
    @staticmethod
    def connect_meta_whatsapp(db: Session, data: dict):
        code = data.get("code")
        fb_token = data.get("fb_access_token")
        from app.core.security import to_uuid
        workspace_id = to_uuid(data.get("workspace_id"))
        if not code and not fb_token:
            raise HTTPException(status_code=400, detail="Missing required credentials: code or fb_access_token is required")

        from app.services.config_service import config_service
        app_id = config_service.get("meta_app_id") or config_service.get("ig_app_id")
        app_secret = config_service.get("meta_app_secret") or config_service.get("ig_app_secret")
        if not app_id or not app_secret:
            raise HTTPException(status_code=400, detail="Meta credentials (App ID & Secret) are not configured in system settings.")

        access_token = fb_token
        if not access_token:
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
            # Access token is not printed or logged for security
            access_token = token_res.get("access_token")
            if not access_token:
                error_detail = token_res.get("error", {})
                logger.error("Token error: response does not contain access token. Meta error: %s", error_detail)
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to get access token: {error_detail.get('message', 'Unknown Meta error')}"
                )

        # Debug logging requested by the user to verify token permissions and Graph API responses
        waba_debug_data = None
        business_debug_data = None
        permissions_debug_data = None

        try:
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
        except Exception as e:
            logger.error(f"Error during debug_token Meta OAuth verification: {e}")
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

        import re
        # Validate phone number format
        cleaned_phone = re.sub(r"\D", "", display_number)
        if not display_number.startswith("+") or len(cleaned_phone) < 7 or len(cleaned_phone) > 15:
            raise HTTPException(
                status_code=400,
                detail=f"Retrieved WhatsApp phone number '{display_number}' does not follow a valid phone number format."
            )

        # WhatsApp duplicate check across workspaces
   
        duplicate_filters = [models.Workspace.meta_phone_number_id == phone_number_id]
        if waba_id:
            duplicate_filters.append(models.Workspace.meta_waba_id == waba_id)
        if display_number:
            duplicate_filters.append(models.Workspace.meta_display_phone == display_number)

        existing_ws = db.query(models.Workspace).filter(
            or_(*duplicate_filters),
            models.Workspace.id != workspace_id
        ).first()
        if existing_ws:
            phone_text = f" ({display_number})" if display_number else ""
            logger.warning(
                "WhatsApp duplicate connection rejected: Account/number %s (%s) already connected to workspace %s",
                display_number, phone_number_id, existing_ws.id
            )
            raise HTTPException(
                status_code=400,
                detail=f"This WhatsApp number{phone_text} is already connected to another workspace or user account. Please disconnect it from that account before connecting here."
            )

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
            subscribe_res = requests.post(
                f"https://graph.facebook.com/v19.0/{waba_id}/subscribed_apps",
                headers={"Authorization": f"Bearer {system_token}"},
                timeout=10,
            )

            check = requests.get(
                f"https://graph.facebook.com/v19.0/{waba_id}/subscribed_apps",
                headers={
                    "Authorization": f"Bearer {system_token}"
                },
                timeout=10,
            )
            
            logger.info(f"WABA webhook subscription status: {subscribe_res.status_code}")
            logger.info(f"WABA webhook subscription check status: {check.status_code}")

        except Exception as e:
            logger.error(f"Failed to subscribe app to WABA webhooks: {e}")

        # Register the phone number to enable messaging (important for Embedded Signup)
        try:
            whatsapp_pin = config_service.get("meta_whatsapp_pin") or config_service.get("whatsapp_pin") or "123456"
            logger.info("Registering WhatsApp phone number %s with PIN: %s", phone_number_id, whatsapp_pin)
            register_res = requests.post(
                f"https://graph.facebook.com/v21.0/{phone_number_id}/register",
                headers={"Authorization": f"Bearer {access_token}"},
                json={
                    "messaging_product": "whatsapp",
                    "pin": whatsapp_pin
                },
                timeout=10,
            )
            logger.info("WhatsApp registration status: %s, response: %s", register_res.status_code, register_res.text)
        except Exception as e:
            logger.error("Failed to automatically register WhatsApp phone number: %s", e)

        # Fetch and persist initial Meta messaging tier limit upon channel connection
        try:
            tier_info = WhatsAppTierService.fetch_live_portfolio_tier(
                waba_id=waba_id,
                access_token=access_token,
                business_id=business_id,
                phone_number_id=phone_number_id,
            )
            if tier_info.get("daily_limit"):
                workspace.meta_tier_limit = tier_info["daily_limit"]
                logger.info("Saved initial Meta tier limit upon connection: %s", tier_info["daily_limit"])
        except Exception as e:
            logger.warning("Could not fetch initial Meta tier limit on connection: %s", e)

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
        from app.core.security import to_uuid
        code = data.get("code")
        workspace_id = to_uuid(data.get("workspace_id"))
        if not code:
            raise HTTPException(status_code=400, detail="Missing OAuth code")
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Missing workspace_id")
        from app.services.config_service import config_service
        ig_app_id = config_service.get("ig_app_id")
        ig_app_secret = config_service.get("ig_app_secret")
        if not ig_app_id or not ig_app_secret:
            raise HTTPException(status_code=400, detail="Instagram credentials (App ID & Secret) are not configured in system settings.")
        
        # Configuration details are not printed to standard output for security
        

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
            error_detail = token_res.get("error", {})
            logger.error("Instagram token exchange failed: %s", error_detail)
            raise HTTPException(
                status_code=400,
                detail=f"Token exchange failed: {error_detail.get('message', 'Unknown Meta error')}"
            )

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

        # Instagram duplicate check
        existing_ig = db.query(models.Workspace).filter(
            models.Workspace.meta_ig_id == ig_id,
            models.Workspace.id != workspace_id
        ).first()
        if existing_ig:
            raise HTTPException(
                status_code=400,
                detail="This Instagram Business Account is already connected to another workspace."
            )

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

        # Subscribe the Facebook Page to this app's webhooks for Instagram messaging
        try:
            sub_res = requests.post(
                f"https://graph.facebook.com/v19.0/{page_id}/subscribed_apps",
                params={
                    "subscribed_fields": "messages,messaging_postbacks,message_reactions",
                    "access_token": page_access_token,
                },
                timeout=10,
            ).json()
            logger.info("Instagram page subscribed_apps response: %s", sub_res)
        except Exception as sub_err:
            logger.warning("Failed to subscribe page to app webhooks: %s", sub_err)

        return {
            "status": "connected",
            "page_id": page_id,
            "ig_id": ig_id,
            "username": username,
        }

    @staticmethod
    def get_whatsapp_profile(db: Session, workspace_id: str):
        from app.core.security import to_uuid
        ws_uuid = to_uuid(workspace_id)
        workspace = db.query(models.Workspace).filter(models.Workspace.id == ws_uuid).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        if not workspace.meta_phone_number_id or not workspace.meta_access_token:
            raise HTTPException(status_code=400, detail="WhatsApp is not connected to this workspace")
        
        phone_number_id = workspace.meta_phone_number_id
        access_token = workspace.meta_access_token
        
        profile_data = {}
        try:
            profile_res = requests.get(
                f"https://graph.facebook.com/v21.0/{phone_number_id}/whatsapp_business_profile",
                params={
                    "fields": "about,address,description,email,profile_picture_url,websites,vertical,messaging_product",
                    "access_token": access_token
                },
                timeout=12
            )
            if profile_res.status_code == 200:
                data_list = profile_res.json().get("data", [])
                if data_list:
                    profile_data = data_list[0]
            else:
                logger.warning("WhatsApp business profile fetch status %s: %s", profile_res.status_code, profile_res.text)
        except Exception as e:
            logger.error("Failed to fetch WhatsApp business profile from Meta: %s", e)
        
        phone_meta = {}
        try:
            phone_res = requests.get(
                f"https://graph.facebook.com/v21.0/{phone_number_id}",
                params={
                    "fields": "verified_name,display_phone_number,name_status,quality_rating,code_verification_status,new_display_name,new_name_status",
                    "access_token": access_token
                },
                timeout=12
            )
            if phone_res.status_code == 200:
                phone_meta = phone_res.json()
            else:
                logger.warning("WhatsApp phone details fetch status %s: %s", phone_res.status_code, phone_res.text)
        except Exception as e:
            logger.error("Failed to fetch WhatsApp phone metadata from Meta: %s", e)

        raw_vertical = profile_data.get("vertical")
        if not raw_vertical or raw_vertical == "UNDEFINED":
            vertical = "OTHER"
        else:
            vertical = raw_vertical

        return {
            "phone_number_id": phone_number_id,
            "waba_id": workspace.meta_waba_id,
            "display_phone_number": phone_meta.get("display_phone_number") or workspace.meta_display_phone or "",
            "verified_name": phone_meta.get("verified_name") or "",
            "name_status": phone_meta.get("name_status") or "APPROVED",
            "quality_rating": phone_meta.get("quality_rating") or "UNKNOWN",
            "code_verification_status": phone_meta.get("code_verification_status") or "",
            "new_display_name": phone_meta.get("new_display_name") or "",
            "new_name_status": phone_meta.get("new_name_status") or "",
            "about": profile_data.get("about") or "",
            "address": profile_data.get("address") or "",
            "description": profile_data.get("description") or "",
            "email": profile_data.get("email") or "",
            "profile_picture_url": profile_data.get("profile_picture_url") or "",
            "websites": profile_data.get("websites") or [],
            "vertical": vertical,
        }

    @staticmethod
    def update_whatsapp_profile(db: Session, data: dict):
        from app.core.security import to_uuid
        workspace_id = to_uuid(data.get("workspace_id"))
        workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        if not workspace.meta_phone_number_id or not workspace.meta_access_token:
            raise HTTPException(status_code=400, detail="WhatsApp is not connected to this workspace")
        
        phone_number_id = workspace.meta_phone_number_id
        access_token = workspace.meta_access_token
        
        body = {
            "messaging_product": "whatsapp"
        }
        if "about" in data and data["about"] is not None:
            body["about"] = data["about"][:139]
        if "address" in data and data["address"] is not None:
            body["address"] = data["address"][:256]
        if "description" in data and data["description"] is not None:
            body["description"] = data["description"][:512]
        if "email" in data and data["email"] is not None:
            clean_email = data["email"].strip()
            if clean_email:
                body["email"] = clean_email[:128]
            else:
                body["email"] = ""
        if "websites" in data and data["websites"] is not None:
            clean_websites = []
            for w in data["websites"]:
                if w and isinstance(w, str) and w.strip():
                    url_str = w.strip()
                    if not (url_str.startswith("http://") or url_str.startswith("https://")):
                        url_str = f"https://{url_str}"
                    clean_websites.append(url_str[:256])
            body["websites"] = clean_websites[:2]
        if "vertical" in data and data["vertical"] is not None:
            v = str(data["vertical"]).strip()
            if v and v != "UNDEFINED":
                body["vertical"] = v
        
        try:
            name_msg = ""
            new_name = data.get("new_display_name")
            current_name = data.get("current_verified_name") or ""
            # Only request display name change if user provided a non-empty name different from current name
            if new_name and isinstance(new_name, str) and new_name.strip():
                clean_new_name = new_name.strip()
                if clean_new_name != current_name.strip():
                    try:
                        name_res = requests.post(
                            f"https://graph.facebook.com/v21.0/{phone_number_id}",
                            headers={
                                "Authorization": f"Bearer {access_token}",
                                "Content-Type": "application/json"
                            },
                            json={"new_display_name": clean_new_name},
                            timeout=15
                        )
                        name_json = name_res.json()
                        if name_res.status_code != 200 or not name_json.get("success"):
                            name_err = name_json.get("error", {}).get("message") or "Meta rejected display name update."
                            logger.warning("Meta display name update issue (%s): %s", name_res.status_code, name_json)
                            name_msg = f" (Display Name notice: {name_err})"
                        else:
                            name_msg = " Display name submitted for Meta review."
                    except Exception as ne:
                        logger.error("Error submitting display name to Meta: %s", ne)

            update_res = requests.post(
                f"https://graph.facebook.com/v21.0/{phone_number_id}/whatsapp_business_profile",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=body,
                timeout=15
            )
            update_json = update_res.json()
            if update_res.status_code != 200 or not update_json.get("success"):
                error_obj = update_json.get("error", {})
                error_msg = error_obj.get("message") or "Failed to update WhatsApp profile on Meta."
                logger.error("Meta WhatsApp profile update failed (%s): %s", update_res.status_code, update_json)
                raise HTTPException(status_code=400, detail=f"Meta API Error: {error_msg}")
            
            logger.info("WhatsApp business profile updated successfully for workspace %s", workspace_id)
            # Re-fetch profile to return fresh state
            fresh_profile = ChannelConnectionService.get_whatsapp_profile(db, str(workspace_id))
            return {
                "status": "success",
                "message": f"WhatsApp profile updated successfully.{name_msg}",
                "profile": fresh_profile
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Error updating WhatsApp business profile: %s", e)
            raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

    @staticmethod
    def update_whatsapp_profile_photo(db: Session, workspace_id: str, file_bytes: bytes, content_type: str, filename: str = "profile.jpg"):
        import io
        import os
        from PIL import Image
        from app.core.security import to_uuid
        from app.services.config_service import config_service

        ws_uuid = to_uuid(workspace_id)
        workspace = db.query(models.Workspace).filter(models.Workspace.id == ws_uuid).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        if not workspace.meta_phone_number_id or not workspace.meta_access_token:
            raise HTTPException(status_code=400, detail="WhatsApp is not connected to this workspace")
        
        phone_number_id = workspace.meta_phone_number_id
        access_token = workspace.meta_access_token

        # Resolve Meta App ID: platform settings -> environment -> dynamically from token
        app_id = config_service.get("meta_app_id") or config_service.get("ig_app_id") or os.getenv("META_APP_ID")
        if not app_id:
            try:
                app_res = requests.get(
                    "https://graph.facebook.com/v21.0/app",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10
                )
                if app_res.status_code == 200:
                    app_id = app_res.json().get("id")
            except Exception as ae:
                logger.warning(f"Could not resolve App ID via /app: {ae}")

        if not app_id:
            try:
                debug_res = requests.get(
                    "https://graph.facebook.com/v21.0/debug_token",
                    params={
                        "input_token": access_token,
                        "access_token": access_token
                    },
                    timeout=10
                )
                if debug_res.status_code == 200:
                    app_id = debug_res.json().get("data", {}).get("app_id")
            except Exception as de:
                logger.warning(f"Could not resolve App ID via debug_token: {de}")

        if not app_id:
            raise HTTPException(status_code=400, detail="Meta App ID could not be resolved. Please configure Meta App ID in platform settings.")
        
        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit.")
        
        # Optimize and square-crop image using Pillow to guarantee Meta requirements (square 1:1, RGB JPEG/PNG)
        processed_bytes = file_bytes
        processed_mime = content_type or "image/jpeg"
        processed_filename = filename or "profile.jpg"
        try:
            img = Image.open(io.BytesIO(file_bytes))
            # Center crop to 1:1 square if not square
            w, h = img.size
            if w != h:
                min_dim = min(w, h)
                left = (w - min_dim) // 2
                top = (h - min_dim) // 2
                img = img.crop((left, top, left + min_dim, top + min_dim))
            
            # WhatsApp profile pictures recommended 640x640, max 1024x1024
            if img.width > 1024:
                img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
            elif img.width < 192:
                img = img.resize((192, 192), Image.Resampling.LANCZOS)

            # Convert color profile
            target_fmt = "PNG" if "png" in processed_mime.lower() else "JPEG"
            if target_fmt == "JPEG":
                if img.mode != "RGB":
                    if img.mode == "RGBA":
                        bg = Image.new("RGB", img.size, (255, 255, 255))
                        bg.paste(img, mask=img.split()[3])
                        img = bg
                    else:
                        img = img.convert("RGB")
                processed_mime = "image/jpeg"
                processed_filename = "profile.jpg"
            else:
                if img.mode not in ("RGB", "RGBA"):
                    img = img.convert("RGBA")
                processed_mime = "image/png"
                processed_filename = "profile.png"

            out_buf = io.BytesIO()
            img.save(out_buf, format=target_fmt, quality=90, optimize=True)
            processed_bytes = out_buf.getvalue()
        except Exception as pe:
            logger.warning("Pillow profile image preprocessing fallback: %s", pe)
            processed_bytes = file_bytes

        try:
            # Step 1: Create Resumable Upload Session on Graph API v21.0
            session_res = requests.post(
                f"https://graph.facebook.com/v21.0/{app_id}/uploads",
                params={
                    "file_length": len(processed_bytes),
                    "file_type": processed_mime,
                    "file_name": processed_filename,
                    "access_token": access_token
                },
                timeout=15
            )
            session_json = session_res.json()
            upload_session_id = session_json.get("id")
            if not upload_session_id:
                error_obj = session_json.get("error", {})
                error_msg = error_obj.get("message") or "Failed to initiate photo upload session with Meta."
                logger.error("Failed to create upload session: %s", session_json)
                raise HTTPException(status_code=400, detail=f"Meta Upload Error: {error_msg}")
            
            # Step 2: Upload image binary to session
            upload_res = requests.post(
                f"https://graph.facebook.com/v21.0/{upload_session_id}",
                headers={
                    "Authorization": f"OAuth {access_token}",
                    "file_offset": "0",
                    "Content-Type": "application/octet-stream"
                },
                data=processed_bytes,
                timeout=30
            )
            upload_json = upload_res.json()
            handle = upload_json.get("h")
            if not handle:
                error_obj = upload_json.get("error", {})
                error_msg = error_obj.get("message") or "Failed to complete binary upload to Meta."
                logger.error("Failed to upload binary to session: %s", upload_json)
                raise HTTPException(status_code=400, detail=f"Meta Upload Error: {error_msg}")
            
            # Step 3: Attach profile picture handle to WhatsApp Business Profile
            profile_res = requests.post(
                f"https://graph.facebook.com/v21.0/{phone_number_id}/whatsapp_business_profile",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "messaging_product": "whatsapp",
                    "profile_picture_handle": handle
                },
                timeout=15
            )
            profile_json = profile_res.json()
            if profile_res.status_code != 200 or not profile_json.get("success"):
                error_obj = profile_json.get("error", {})
                error_msg = error_obj.get("message") or "Failed to update profile picture on WhatsApp."
                logger.error("Failed to set profile picture handle: %s", profile_json)
                raise HTTPException(status_code=400, detail=f"Meta API Error: {error_msg}")
            
            # Step 4: Fetch newly updated profile picture URL from Meta
            new_photo_url = ""
            try:
                fetch_res = requests.get(
                    f"https://graph.facebook.com/v21.0/{phone_number_id}/whatsapp_business_profile",
                    params={
                        "fields": "profile_picture_url",
                        "access_token": access_token
                    },
                    timeout=10
                )
                if fetch_res.status_code == 200:
                    data_list = fetch_res.json().get("data", [])
                    if data_list:
                        new_photo_url = data_list[0].get("profile_picture_url") or ""
            except Exception as fe:
                logger.warning("Could not immediately fetch new photo URL: %s", fe)
            
            return {
                "status": "success",
                "profile_picture_url": new_photo_url,
                "message": "WhatsApp profile picture updated successfully on Meta Business Suite."
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Error updating WhatsApp profile photo: %s", e)
            raise HTTPException(status_code=500, detail=f"Failed to upload profile picture: {str(e)}")