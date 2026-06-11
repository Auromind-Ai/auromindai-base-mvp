from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import logging
import asyncio
import secrets as secrets_module
import time
from collections import deque
from typing import Optional
from pydantic import BaseModel
import urllib.parse
from fastapi.responses import RedirectResponse

from sqlalchemy.orm import Session
from app.schemas.auth import (
    EmailLoginRequest,
    UserResponse,
    WorkspaceResponse,
    SecretLoginRequest,
    AdminLoginRequest,
)
from app.database import get_db
from app.services.auth_service import AuthService
from app.utils.auth import create_access_token, decode_access_token
import uuid
from datetime import datetime, timezone
from app.core.config import settings
from app.models.user import User

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

logger = logging.getLogger(__name__)

_ADMIN_LOGIN_ATTEMPTS: dict[str, deque[float]] = {}
_ADMIN_LOGIN_WINDOW_SECONDS = 60
_ADMIN_LOGIN_MAX_ATTEMPTS = 3

async def admin_login_rate_limit(request: Request):
    client_host = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = _ADMIN_LOGIN_ATTEMPTS.setdefault(client_host, deque())
    while attempts and now - attempts[0] > _ADMIN_LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= _ADMIN_LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts, please try again later.",
        )
    attempts.append(now)
    return True

class CurrentUser:
    def __init__(self, user, workspace_id, impersonated=False, admin_id=None):
        self.id = user.id
        self.email = user.email
        self.full_name = user.full_name
        self.workspace_id = workspace_id
        self.user = user
        self.impersonated = impersonated
        self.admin_id = admin_id

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    def log_auth(msg):
        try:
            import os
            log_dir = "logs"
            if not os.path.exists(log_dir):
                os.makedirs(log_dir)
            with open(os.path.join(log_dir, "auth_debug.log"), "a") as f:
                f.write(f"{datetime.now(timezone.utc)}: {msg}\n")
        except:
            pass

    log_auth("🔒 Authenticating token...")
    
    token = request.cookies.get("auth_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            
    if not token:
        log_auth("No token found in cookie or Authorization header")
        raise credentials_exception
    
    try:
        payload = decode_access_token(token)
    except Exception:
        log_auth("Token decode failed")
        raise credentials_exception

    if payload is None:
        log_auth("Token payload is None")
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    role = payload.get("role")
    
    if role == "platform_admin" or user_id == "platform_admin":
        log_auth("❌ Platform admin token rejected on normal route")
        raise credentials_exception

    workspace_id: str = payload.get("workspace_id")
    impersonated = payload.get("impersonated", False)
    admin_id = payload.get("admin_id")

    if user_id is None:
        log_auth(" Token missing sub")
        raise credentials_exception

    log_auth(f"👤 Token claims user_id: {user_id}")
    user = AuthService.get_user_by_id(db, user_id)

    if user is None:
        log_auth(f" User {user_id} not found in DB")
        raise credentials_exception

    log_auth(f"Authenticated: {user.email}")
    return CurrentUser(
        user=user,
        workspace_id=workspace_id,
        impersonated=impersonated,
        admin_id=admin_id
    )

# ---------- OTP Login & Signup ----------

class SendOTPRequest(BaseModel):
    email: str
    auth_type: str  # "login" or "signup"

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str
    auth_type: str
    full_name: Optional[str] = None
    workspace_name: Optional[str] = None

@router.post("/send-otp")
async def send_otp(request: SendOTPRequest, db: Session = Depends(get_db)):
    try:
        AuthService.send_otp(db, request.email, request.auth_type)
        return {"status": "success", "message": "OTP sent successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest, response: Response, db: Session = Depends(get_db)):
    try:
        result = AuthService.verify_otp(
            db,
            request.email,
            request.otp,
            request.auth_type,
            request.full_name,
            request.workspace_name
        )
        token = result.pop("access_token", None)
        result.pop("token_type", None)
        
        IS_PROD = settings.ENVIRONMENT == "production"
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            secure=IS_PROD,
            samesite="strict" if IS_PROD else "lax",
            path="/",
            max_age=60 * 60 * 24 * 7,
        )
        result["access_token"] = token
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

# Kept for backward compatibility
@router.post("/login")
async def login(request: dict, response: Response, db: Session = Depends(get_db)):
    try:
        email = request.get('email')
        full_name = request.get('full_name')
        workspace_name = request.get('workspace_name', 'My Workspace')
        
        result = AuthService.email_login(
            db=db,
            email=email,
            full_name=full_name,
            workspace_name=workspace_name
        )
        token = result.pop("access_token", None)
        result.pop("token_type", None)
        
        IS_PROD = settings.ENVIRONMENT == "production"
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            secure=IS_PROD,
            samesite="strict" if IS_PROD else "lax",
            path="/",
            max_age=60 * 60 * 24 * 7,  # 7 days
        )
        result["access_token"] = token
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

# ---------- Google Auth ----------

@router.get("/google/login")
async def google_login(type: str = "login"):
    # In a real app, integrate authlib or similar here.
    return RedirectResponse(url=f"/auth/google/callback?code=mock_code&state={type}")

@router.get("/google/callback")
async def google_callback(code: str, state: str = "login", db: Session = Depends(get_db)):
    # Mocking Google user fetching
    email = "googleuser@example.com"
    full_name = "Google User"
    
    try:
        result = AuthService.google_auth(db, email, full_name, state)
        token = result["access_token"]
        
        frontend_url = "http://localhost:3000/user/admin/dashboard"
        
        # Create response and set cookie
        response = RedirectResponse(url=f"{frontend_url}?token={token}")
        IS_PROD = settings.ENVIRONMENT == "production"
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            secure=IS_PROD,
            samesite="strict" if IS_PROD else "lax",
            path="/",
            max_age=60 * 60 * 24 * 7,
        )
        return response
    except ValueError as e:
        return RedirectResponse(url=f"http://localhost:3000/login?error={urllib.parse.quote(str(e))}")

# ---------- Secrets / Admin Login ----------

@router.post("/login/secret")
async def login_secret(
    request: SecretLoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    master_key = settings.OWNER_SECRET_KEY
    if not master_key or request.key != master_key:
        raise HTTPException(status_code=401, detail="Invalid secret key")
    
    admin = db.query(User).order_by(User.created_at.asc()).first()
    if not admin:
        raise HTTPException(status_code=404, detail="No users found in platform")
    
    result = AuthService.login(db, admin.email)
    token = result.pop("access_token", None)
    result.pop("token_type", None)
    
    IS_PROD = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=IS_PROD,
        samesite="strict" if IS_PROD else "lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    result["access_token"] = token
    return result

@router.post("/admin/login")
async def admin_login(
    request: Request,
    body: AdminLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    _rate_limit: bool = Depends(admin_login_rate_limit),
):
    from app.core.config import settings
    from app.models import User

    is_valid = secrets_module.compare_digest(
        body.secret_key,
        settings.OWNER_SECRET_KEY
    )
    if not is_valid:
        await asyncio.sleep(1)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if hasattr(User, "is_superadmin"):
        owner = db.query(User).filter(User.is_superadmin == True).first()
    else:
        owner = db.query(User).order_by(User.created_at.asc()).first()

    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    admin_data = AuthService.login(db, owner.email)
    access_token = create_access_token({
        "sub": str(owner.id),
        "role": "superadmin",
        "workspace_id": admin_data.get("workspaces", [])[0].get("id") if admin_data.get("workspaces") else None,
    })

    IS_PROD = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="auth_token",
        value=access_token,
        httponly=True,
        secure=IS_PROD,
        samesite="strict" if IS_PROD else "lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )

    return {
        "message": "Access granted",
        "user": admin_data.get("user"),
        "workspaces": admin_data.get("workspaces"),
        "access_token": access_token
    }

# ---------- Current user ----------

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "workspace_id": current_user.workspace_id,
        "impersonated": current_user.impersonated
    }


# ---------- Workspaces ----------

@router.get("/workspaces")
async def get_workspaces(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspaces = AuthService.get_user_workspaces(db, current_user.id)
    return {"workspaces": workspaces}


@router.post("/logout")
async def logout(response: Response):
    IS_PROD = settings.ENVIRONMENT == "production"
    response.delete_cookie(
        key="auth_token",
        path="/",
        secure=IS_PROD,
        httponly=True,
        samesite="strict" if IS_PROD else "lax",
    )
    response.delete_cookie(
        key="admin_backup_token",
        path="/",
        secure=IS_PROD,
        httponly=True,
        samesite="strict" if IS_PROD else "lax",
    )
    return {"status": "success"}

@router.post("/stop-impersonation")
async def stop_impersonation(request: Request, response: Response):
    admin_token = request.cookies.get("admin_backup_token")
    if not admin_token:
        raise HTTPException(status_code=400, detail="No impersonation session active")
    
    IS_PROD = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="auth_token",
        value=admin_token,
        httponly=True,
        secure=IS_PROD,
        samesite="strict" if IS_PROD else "lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    response.delete_cookie(
        key="admin_backup_token",
        path="/",
        secure=IS_PROD,
        httponly=True,
        samesite="strict" if IS_PROD else "lax"
    )
    return {"status": "success"}
