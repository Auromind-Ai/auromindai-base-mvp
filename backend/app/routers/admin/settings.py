from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app.services.platform_settings_service import get_all_settings, update_settings, SENSITIVE_KEYS, _parse_value
from app.utils.crypto import is_encrypted, decrypt_value
from app.models.admin_audit_log import AdminAuditLog
from jose import jwt
from app.core.config import settings as core_settings

router = APIRouter()

SENSITIVE_MASK = "••••••••"


def _sanitize_response(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Mask all sensitive values before sending to the client."""
    sanitized = settings.copy()
    for key in SENSITIVE_KEYS:
        if key in sanitized and sanitized[key]:
            sanitized[key] = SENSITIVE_MASK
    return sanitized


@router.get("/settings")
async def get_platform_settings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    
    try:
        return _sanitize_response(get_all_settings(db))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching settings: {str(e)}")


@router.post("/settings")
async def update_platform_settings(
    request: Request,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    
    try:
        # Determine admin user identity
        admin_user = "platform_admin"
        token = request.cookies.get("admin_session")
        if token:
            try:
                payload = jwt.decode(token, core_settings.SECRET_KEY, algorithms=[core_settings.ALGORITHM])
                admin_user = payload.get("sub", "platform_admin")
            except Exception:
                pass

        # Identify client IP
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.headers.get("x-real-ip", request.client.host if request.client else "unknown").strip()

        # Fetch old values of the keys being updated
        from app.models.platform_setting import PlatformSetting
        old_settings = db.query(PlatformSetting).filter(PlatformSetting.key.in_(updates.keys())).all()
        old_values = {}
        for s in old_settings:
            val = s.value
            if s.key in SENSITIVE_KEYS and val:
                if is_encrypted(val):
                    try:
                        val = decrypt_value(val)
                    except Exception:
                        pass
            else:
                val = _parse_value(val, s.value_type)
            old_values[s.key] = val

        # Now update the settings
        result = update_settings(db, updates)

        # Diff old and new values to check for changes
        changes_old = {}
        changes_new = {}
        for key, new_val in updates.items():
            old_val = old_values.get(key)
            if old_val != new_val:
                changes_old[key] = old_val
                changes_new[key] = new_val

        # Create AdminAuditLog if there are changes
        if changes_old or changes_new:
            def mask_val(k, v):
                return "••••••••" if k in SENSITIVE_KEYS and v else v
            
            masked_old = {k: mask_val(k, v) for k, v in changes_old.items()}
            masked_new = {k: mask_val(k, v) for k, v in changes_new.items()}

            infra_keys = {
                "smtp_host", "smtp_port", "smtp_user", "smtp_password", "from_email",
                "google_client_id", "google_client_secret", "oauth_redirect_uri", "google_integration_redirect_uri",
                "meta_verify_token", "meta_app_id", "meta_app_secret", "meta_system_user_token",
                "ig_app_id", "ig_app_secret", "ig_redirect_uri",
                "storage_provider", "supabase_url", "supabase_service_role_key", "supabase_bucket",
                "aws_access_key_id", "aws_secret_access_key", "aws_region", "aws_s3_bucket",
                "aws_s3_endpoint_url", "aws_s3_public_base_url"
            }
            
            is_infra_update = any(k in infra_keys for k in changes_new.keys())
            action_name = "UPDATE_INFRASTRUCTURE_SETTINGS" if is_infra_update else "UPDATE_PLATFORM_SETTINGS"

            log = AdminAuditLog(
                admin_user_id=admin_user,
                action=action_name,
                old_value=masked_old,
                new_value=masked_new,
                ip_address=ip
            )
            db.add(log)

        # Synchronize plans table
        from app.services.billing.plan_service import PlanService
        plan_service = PlanService()
        for plan_key in ["free", "pro", "enterprise"]:
            config = plan_service._get_plan_config(db, plan_key)
            plan_service._get_or_create_plan(db, config)
        db.commit()

        return _sanitize_response(result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")

