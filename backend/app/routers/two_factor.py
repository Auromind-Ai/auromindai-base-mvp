"""All /2fa/* endpoints — setup, verify-setup, verify-login, disable, status."""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user, CurrentUser
from app.services.totp_service import (
    generate_totp_secret, generate_qr_code,
    encrypt_secret, decrypt_secret, verify_totp,
)
from app.core.config import settings
from app.services.notification_service import NotificationService

router = APIRouter()


# ─ Helpers ─

def _redis():
    import redis
    return redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2.0, socket_timeout=2.0)


def _get_cookie_kwargs(request: Request = None) -> dict:
    is_prod = settings.ENVIRONMENT.lower() == "production"
    
    # Extract domain for cookie sharing between frontend and backend on subdomains
    cookie_domain = None
    if request:
        request_host = request.url.hostname
        if settings.FRONTEND_URL and request_host:
            from urllib.parse import urlparse
            parsed = urlparse(settings.FRONTEND_URL)
            if parsed.hostname and (request_host == parsed.hostname or request_host.endswith("." + parsed.hostname)):
                parts = parsed.hostname.split(".")
                # Ignore IP addresses and localhost
                if len(parts) >= 2 and not parsed.hostname.replace(".", "").isdigit() and "localhost" not in parsed.hostname:
                    cookie_domain = "." + ".".join(parts[-2:])
                
    return dict(
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        domain=cookie_domain,
    )


# ─ Request models 

class VerifySetupRequest(BaseModel):
    code: str

class VerifyLoginRequest(BaseModel):
    pending_token: Optional[str] = None
    code: str

class DisableRequest(BaseModel):
    code: str


# ─ GET /2fa/status ─

@router.get("/status")
async def get_status(current_user: CurrentUser = Depends(get_current_user)):
    return {"two_factor_enabled": current_user.user.two_factor_enabled}


# ─ POST /2fa/setup 

@router.post("/setup")
async def setup(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate secret + QR code. Does NOT enable 2FA yet — only on verify-setup."""
    secret = generate_totp_secret()
    qr_b64 = generate_qr_code(current_user.email, secret)

    try:
        r = _redis()
        r.setex(f"2fa_setup:{current_user.id}", 600, secret)   # 10 min
    except Exception:
        raise HTTPException(status_code=503, detail="Setup service temporarily unavailable.")

    return {
        "secret":   secret,
        "qr_code":  f"data:image/png;base64,{qr_b64}",
    }


# ─ POST /2fa/verify-setup 

@router.post("/verify-setup")
async def verify_setup(
    req: VerifySetupRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm first TOTP code → persist encrypted secret → enable 2FA."""
    try:
        r = _redis()
        temp_secret = r.get(f"2fa_setup:{current_user.id}")
    except Exception:
        raise HTTPException(status_code=503, detail="Setup service temporarily unavailable.")

    if not temp_secret:
        raise HTTPException(status_code=400, detail="Setup session expired. Please try again.")

    if not verify_totp(temp_secret, req.code):
        raise HTTPException(status_code=400, detail="Invalid code. Please try again.")

    user = db.query(User).filter(User.id == current_user.id).first()
    user.two_factor_secret  = encrypt_secret(temp_secret)
    user.two_factor_enabled = True

    import secrets
    from app.utils.auth import get_password_hash
    from sqlalchemy.orm.attributes import flag_modified

    recovery_codes = [secrets.token_hex(4).upper() for _ in range(8)]
    hashed_codes = [get_password_hash(c) for c in recovery_codes]

    prefs = user.preferences or {}
    prefs["2fa_recovery_codes"] = hashed_codes
    user.preferences = prefs
    flag_modified(user, "preferences")
    db.commit()

    try:
        r.delete(f"2fa_setup:{current_user.id}")
    except Exception:
        pass

    try:
        NotificationService.notify(
            db=db,
            user_id=current_user.id,
            workspace_id=None,
            type="security_alert",
            title=None,
            message=None,
            is_critical=True,
            email_subject=None,
            template_key="2fa_enabled",
            variables={
                "user_name": current_user.full_name or current_user.email,
                "login_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            }
        )
    except Exception as notif_exc:
        import logging
        logging.getLogger("app").error(f"Failed to send 2FA enabled notification: {notif_exc}")

    return {"success": True, "message": "Two-factor authentication enabled.", "recovery_codes": recovery_codes}



# ─ POST /2fa/verify-login 

@router.post("/verify-login")
async def verify_login(
    req: VerifyLoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Verify TOTP during login. Issues auth cookie only on success."""
    pending_token = req.pending_token
    if not pending_token or pending_token.strip() == "":
        pending_token = request.cookies.get("pending_2fa_token")
        
    if not pending_token:
        raise HTTPException(status_code=400, detail="Session expired or invalid. Please log in again.")

    try:
        r = _redis()
        attempts_key = f"otp_attempts:{pending_token}"
        attempts = r.get(attempts_key)
        if attempts and int(attempts) >= 5:
            raise HTTPException(
                status_code=429,
                detail="Too many failed attempts. Please try again after 5 minutes.",
                headers={"Retry-After": "300"}
            )
        pending_data = r.get(f"pending_2fa:{pending_token}")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Session service temporarily unavailable.")

    if not pending_data:
        raise HTTPException(status_code=400, detail="Session expired. Please log in again.")

    email = None
    provider = None
    try:
        import json
        data = json.loads(pending_data)
        if isinstance(data, dict):
            email = data.get("email")
            provider = data.get("provider")
        else:
            email = pending_data
    except Exception:
        email = pending_data

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.two_factor_enabled or not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Invalid session.")

    if not verify_totp(decrypt_secret(user.two_factor_secret), req.code):
        try:
            r.incr(attempts_key)
            r.expire(attempts_key, 300)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="Invalid authenticator code. Please try again.")

    # Delete used pending token immediately
    try:
        r.delete(f"pending_2fa:{pending_token}")
        r.delete(attempts_key)
    except Exception:
        pass

    # Delete pending 2FA token cookie if it was set
    from app.routers.auth import delete_auth_cookie
    delete_auth_cookie(response=response, request=request, key="pending_2fa_token", path="/")

    # Complete login — reuse existing session logic
    from app.services.auth_service import AuthService
    result = AuthService.email_login(db, email)

    if provider == "google":
        from sqlalchemy.orm.attributes import flag_modified
        prefs = user.preferences or {}
        if prefs.get("auth_provider") != "google":
            prefs["auth_provider"] = "google"
            user.preferences = prefs
            flag_modified(user, "preferences")
            db.commit()

    response.set_cookie(key="auth_token", value=result["access_token"], **_get_cookie_kwargs(request))
    return result


# ─ POST /2fa/disable ─

@router.post("/disable")
async def disable(
    req: DisableRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify current TOTP code then disable 2FA."""
    user = db.query(User).filter(User.id == current_user.id).first()

    if not user.two_factor_enabled or not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Two-factor authentication is not currently enabled.")

    if not verify_totp(decrypt_secret(user.two_factor_secret), req.code):
        raise HTTPException(status_code=400, detail="Invalid authenticator code.")

    user.two_factor_enabled = False
    user.two_factor_secret  = None
    db.commit()

    try:
        NotificationService.notify(
            db=db,
            user_id=current_user.id,
            workspace_id=None,
            type="security_alert",
            title=None,
            message=None,
            is_critical=True,
            email_subject=None,
            template_key="2fa_disabled",
            variables={
                "user_name": current_user.full_name or current_user.email,
                "login_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            }
        )
    except Exception as notif_exc:
        import logging
        logging.getLogger("app").error(f"Failed to send 2FA disabled notification: {notif_exc}")

    return {"success": True, "message": "Two-factor authentication disabled."}


# ─ POST /2fa/recovery-codes/regenerate ─

@router.post("/recovery-codes/regenerate")
async def regenerate_recovery_codes(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Regenerate 2FA recovery backup codes."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="Two-factor authentication is not enabled.")

    import secrets
    from app.utils.auth import get_password_hash
    from sqlalchemy.orm.attributes import flag_modified

    codes = [secrets.token_hex(4).upper() for _ in range(8)]
    hashed_codes = [get_password_hash(c) for c in codes]

    prefs = user.preferences or {}
    prefs["2fa_recovery_codes"] = hashed_codes
    user.preferences = prefs
    flag_modified(user, "preferences")
    db.commit()

    try:
        from app.services.notification_service import NotificationService
        from datetime import datetime, timezone
        NotificationService.notify(
            db=db,
            user_id=current_user.id,
            workspace_id=None,
            type="security_alert",
            title=None,
            message=None,
            is_critical=True,
            email_subject=None,
            template_key="recovery_codes",
            variables={
                "user_name": current_user.full_name or current_user.email,
                "login_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            }
        )
    except Exception as notif_exc:
        import logging
        logging.getLogger("app").error(f"Failed to send recovery codes notification: {notif_exc}")

    return {"success": True, "recovery_codes": codes}

