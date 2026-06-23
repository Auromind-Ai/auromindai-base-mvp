"""All /2fa/* endpoints — setup, verify-setup, verify-login, disable, status."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response
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
    import redis
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def _get_cookie_kwargs() -> dict:
    is_prod = settings.ENVIRONMENT.lower() == "production"
    return dict(
        httponly=True,
        secure=is_prod,
        samesite="strict" if is_prod else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
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
    db.commit()

    try:
        r.delete(f"2fa_setup:{current_user.id}")
    except Exception:
        pass

    return {"success": True, "message": "Two-factor authentication enabled."}


# ─ POST /2fa/verify-login 

@router.post("/verify-login")
async def verify_login(
    req: VerifyLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Verify TOTP during login. Issues auth cookie only on success."""
    try:
        r = _redis()
        email = r.get(f"pending_2fa:{req.pending_token}")
    except Exception:
        raise HTTPException(status_code=503, detail="Session service temporarily unavailable.")

    if not email:
        raise HTTPException(status_code=400, detail="Session expired. Please log in again.")

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.two_factor_enabled or not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Invalid session.")

    if not verify_totp(decrypt_secret(user.two_factor_secret), req.code):
        raise HTTPException(status_code=400, detail="Invalid authenticator code. Please try again.")

    # Delete used pending token immediately
    try:
        r.delete(f"pending_2fa:{req.pending_token}")
    except Exception:
        pass

    # Complete login — reuse existing session logic
    from app.services.auth_service import AuthService
    result = AuthService.email_login(db, email)

    response.set_cookie(key="auth_token", value=result["access_token"], **_get_cookie_kwargs())
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