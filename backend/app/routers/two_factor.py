"""All /2fa/* endpoints — setup, verify-setup, verify-login, disable, status."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user, CurrentUser
from app.services.totp_service import (
    generate_totp_secret, generate_qr_code,
    encrypt_secret, decrypt_secret, verify_totp,
)
from app.core.config import settings

router = APIRouter()


# ─ Helpers ─

def _redis():
    # Deprecated: Redis is no longer used for 2FA caching
    pass


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
    pending_token: str
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

    from datetime import datetime, timedelta, timezone
    from app.models.user import EmailOTP

    try:
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        # Use 2fa_setup:{current_user.id} as the email key, and the secret as the otp value
        new_setup = EmailOTP(email=f"2fa_setup:{current_user.id}", otp=secret, expires_at=expires)
        db.merge(new_setup)
        db.commit()
    except Exception:
        db.rollback()
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
    from app.models.user import EmailOTP
    from datetime import datetime, timezone

    try:
        setup_record = db.query(EmailOTP).filter(EmailOTP.email == f"2fa_setup:{current_user.id}").first()
        if not setup_record or setup_record.expires_at < datetime.now(timezone.utc):
            if setup_record:
                db.delete(setup_record)
                db.commit()
            raise HTTPException(status_code=400, detail="Setup session expired. Please try again.")
        temp_secret = setup_record.otp
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Setup service temporarily unavailable.")

    if not verify_totp(temp_secret, req.code):
        raise HTTPException(status_code=400, detail="Invalid code. Please try again.")

    user = db.query(User).filter(User.id == current_user.id).first()
    user.two_factor_secret  = encrypt_secret(temp_secret)
    user.two_factor_enabled = True
    db.commit()

    try:
        setup_record = db.query(EmailOTP).filter(EmailOTP.email == f"2fa_setup:{current_user.id}").first()
        if setup_record:
            db.delete(setup_record)
            db.commit()
    except Exception:
        pass

    return {"success": True, "message": "Two-factor authentication enabled."}


# ─ POST /2fa/verify-login 

@router.post("/verify-login")
async def verify_login(
    req: VerifyLoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Verify TOTP during login. Issues auth cookie only on success."""
    from app.models.user import EmailOTP
    from datetime import datetime, timezone

    try:
        pending_record = db.query(EmailOTP).filter(EmailOTP.email == f"pending_2fa:{req.pending_token}").first()
        if not pending_record or pending_record.expires_at < datetime.now(timezone.utc):
            if pending_record:
                db.delete(pending_record)
                db.commit()
            raise HTTPException(status_code=400, detail="Session expired. Please log in again.")
        email = pending_record.otp
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Session service temporarily unavailable.")

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.two_factor_enabled or not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Invalid session.")

    if not verify_totp(decrypt_secret(user.two_factor_secret), req.code):
        raise HTTPException(status_code=400, detail="Invalid authenticator code. Please try again.")

    # Delete used pending token immediately
    try:
        pending_record = db.query(EmailOTP).filter(EmailOTP.email == f"pending_2fa:{req.pending_token}").first()
        if pending_record:
            db.delete(pending_record)
            db.commit()
    except Exception:
        pass

    # Complete login — reuse existing session logic
    from app.services.auth_service import AuthService
    result = AuthService.email_login(db, email)

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

    return {"success": True, "message": "Two-factor authentication disabled."}