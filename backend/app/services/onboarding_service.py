import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import requests
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.workspace import Workspace
from app.core.security import to_uuid

logger = logging.getLogger(__name__)


class OnboardingService:
    @staticmethod
    def get_onboarding_status(db: Session, workspace_id: str) -> Dict[str, Any]:
        ws_uuid = to_uuid(workspace_id)
        ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

        whatsapp_connected = bool(ws.meta_access_token and ws.meta_phone_number_id)
        two_factor_enabled = bool(ws.meta_2fa_enabled)
        business_verification_status = ws.meta_business_verification_status or "not_verified"
        onboarding_dismissed = bool(ws.meta_onboarding_dismissed)

        all_completed = bool(whatsapp_connected and two_factor_enabled and business_verification_status == "verified")

        if all_completed and not ws.meta_onboarding_completed_at:
            ws.meta_onboarding_completed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(ws)
        elif not all_completed and ws.meta_onboarding_completed_at:
            # If account state reverted (e.g. WhatsApp disconnected)
            ws.meta_onboarding_completed_at = None
            db.commit()
            db.refresh(ws)

        completed_count = 0
        if whatsapp_connected:
            completed_count += 1
        if two_factor_enabled:
            completed_count += 1
        if business_verification_status == "verified":
            completed_count += 1

        percentage = round((completed_count / 3.0) * 100)

        steps = {
            "step_1": {
                "step": 1,
                "id": "connect_whatsapp",
                "title": "Connect WhatsApp",
                "subtitle": "Link your Meta business account",
                "completed": whatsapp_connected,
                "status": "completed" if whatsapp_connected else "pending",
                "status_label": "WhatsApp Business connected" if whatsapp_connected else "Action required",
                "phone": ws.meta_display_phone,
                "waba_id": ws.meta_waba_id,
                "phone_number_id": ws.meta_phone_number_id,
                "business_id": ws.meta_business_id,
            },
            "step_2": {
                "step": 2,
                "id": "two_factor_auth",
                "title": "Secure Business Suite",
                "checklist_title": "Enable two-factor authentication",
                "subtitle": "Enable two-factor authentication",
                "checklist_subtitle": "Secure your Meta Business Suite",
                "completed": two_factor_enabled,
                "status": "completed" if two_factor_enabled else "action_required",
                "status_label": "Completed" if two_factor_enabled else "Action required",
            },
            "step_3": {
                "step": 3,
                "id": "business_verification",
                "title": "Verify your business",
                "checklist_title": "Complete business verification",
                "subtitle": "Complete Meta business verification",
                "checklist_subtitle": "Verify your business with Meta",
                "completed": business_verification_status == "verified",
                "status": business_verification_status,
                "status_label": (
                    "Completed"
                    if business_verification_status == "verified"
                    else "In review"
                    if business_verification_status == "pending"
                    else "Failed"
                    if business_verification_status == "failed"
                    else "Action required"
                ),
            },
        }

        return {
            "workspace_id": str(ws.id),
            "whatsapp_connected": whatsapp_connected,
            "two_factor_enabled": two_factor_enabled,
            "business_verification_status": business_verification_status,
            "onboarding_completed": all_completed,
            "onboarding_completed_at": ws.meta_onboarding_completed_at.isoformat() if ws.meta_onboarding_completed_at else None,
            "onboarding_dismissed": onboarding_dismissed,
            "completed_count": completed_count,
            "total_steps": 3,
            "progress_percentage": percentage,
            "steps": steps,
            "meta_display_phone": ws.meta_display_phone,
            "meta_business_id": ws.meta_business_id,
            "meta_waba_id": ws.meta_waba_id,
        }

    @staticmethod
    def set_onboarding_dismissed(db: Session, workspace_id: str, dismissed: bool = True) -> Dict[str, Any]:
        ws_uuid = to_uuid(workspace_id)
        ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

        ws.meta_onboarding_dismissed = dismissed
        db.commit()
        db.refresh(ws)
        return OnboardingService.get_onboarding_status(db, workspace_id)

    @staticmethod
    def check_2fa_status(
        db: Session,
        workspace_id: str,
        manual_confirm: bool = False
    ) -> Dict[str, Any]:
        ws_uuid = to_uuid(workspace_id)
        ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

        meta_verified = False
        meta_message = None

        if ws.meta_access_token and ws.meta_business_id:
            try:
                res = requests.get(
                    f"https://graph.facebook.com/v19.0/{ws.meta_business_id}",
                    params={
                        "fields": "two_factor_type",
                        "access_token": ws.meta_access_token,
                    },
                    timeout=10,
                )
                data = res.json()
                if "error" not in data:
                    two_factor_type = data.get("two_factor_type")
                    if two_factor_type in ["everyone", "admin_only"]:
                        meta_verified = True
                        ws.meta_2fa_enabled = True
                    meta_message = f"Meta Business two_factor_type: {two_factor_type or 'none'}"
                else:
                    meta_message = data.get("error", {}).get("message")
            except Exception as e:
                logger.warning(f"Failed to query Meta for 2FA status: {e}")
                meta_message = str(e)

        if manual_confirm and not meta_verified:
            ws.meta_2fa_enabled = True

        all_completed = bool(
            (ws.meta_access_token and ws.meta_phone_number_id)
            and ws.meta_2fa_enabled
            and (ws.meta_business_verification_status == "verified")
        )
        if all_completed and not ws.meta_onboarding_completed_at:
            ws.meta_onboarding_completed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(ws)

        status_result = OnboardingService.get_onboarding_status(db, workspace_id)
        status_result["meta_verified"] = meta_verified
        status_result["meta_message"] = meta_message
        return status_result

    @staticmethod
    def check_business_verification(
        db: Session,
        workspace_id: str,
        manual_status: Optional[str] = None
    ) -> Dict[str, Any]:
        ws_uuid = to_uuid(workspace_id)
        ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

        meta_verified = False
        meta_status = None
        meta_message = None

        if ws.meta_access_token:
            # 1. Try Business Manager ID
            if ws.meta_business_id:
                try:
                    res = requests.get(
                        f"https://graph.facebook.com/v19.0/{ws.meta_business_id}",
                        params={
                            "fields": "verification_status",
                            "access_token": ws.meta_access_token,
                        },
                        timeout=10,
                    )
                    data = res.json()
                    if "error" not in data:
                        raw_status = str(data.get("verification_status") or "").lower()
                        meta_status = raw_status
                        if raw_status in ["verified", "approved"]:
                            ws.meta_business_verification_status = "verified"
                            meta_verified = True
                        elif raw_status in ["pending", "in_review", "submitted"]:
                            ws.meta_business_verification_status = "pending"
                        elif raw_status in ["failed", "rejected"]:
                            ws.meta_business_verification_status = "failed"
                    else:
                        meta_message = data.get("error", {}).get("message")
                except Exception as e:
                    logger.warning(f"Failed to query Meta Business verification_status: {e}")
                    meta_message = str(e)

            # 2. Try WABA verification status if business query didn't confirm
            if not meta_verified and ws.meta_waba_id:
                try:
                    res = requests.get(
                        f"https://graph.facebook.com/v19.0/{ws.meta_waba_id}",
                        params={
                            "fields": "account_review_status,business_verification_status",
                            "access_token": ws.meta_access_token,
                        },
                        timeout=10,
                    )
                    data = res.json()
                    if "error" not in data:
                        waba_bv = str(data.get("business_verification_status") or "").lower()
                        if waba_bv in ["verified", "approved"]:
                            ws.meta_business_verification_status = "verified"
                            meta_verified = True
                            meta_status = waba_bv
                        elif waba_bv in ["pending", "in_review", "submitted"]:
                            ws.meta_business_verification_status = "pending"
                            meta_status = waba_bv
                except Exception as e:
                    logger.warning(f"Failed to query WABA business_verification_status: {e}")

        # If user explicitly provides manual_status ('pending', 'verified', 'not_verified')
        if manual_status and manual_status in ["not_verified", "pending", "verified", "failed"]:
            ws.meta_business_verification_status = manual_status

        all_completed = bool(
            (ws.meta_access_token and ws.meta_phone_number_id)
            and ws.meta_2fa_enabled
            and (ws.meta_business_verification_status == "verified")
        )
        if all_completed and not ws.meta_onboarding_completed_at:
            ws.meta_onboarding_completed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(ws)

        status_result = OnboardingService.get_onboarding_status(db, workspace_id)
        status_result["meta_verified"] = meta_verified
        status_result["meta_status"] = meta_status
        status_result["meta_message"] = meta_message
        return status_result
