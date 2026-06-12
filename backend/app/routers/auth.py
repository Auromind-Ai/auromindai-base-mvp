from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import logging

from sqlalchemy.orm import Session
from app.schemas.auth import EmailLoginRequest, UserResponse, WorkspaceResponse, SecretLoginRequest
from app.database import get_db
from app.services.auth_service import AuthService
from app.utils.auth import decode_access_token
import uuid
from datetime import datetime, timezone
from fastapi import Request

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

logger = logging.getLogger(__name__)

class CurrentUser:
    def __init__(self, user, workspace_id, impersonated=False, admin_id=None):
        self.id = user.id
        self.email = user.email
        self.full_name = user.full_name
        self.workspace_id = workspace_id
        self.user = user
        self.impersonated = impersonated
        self.admin_id = admin_id


# ---------- Dependency: get current user ----------

async def get_current_user(
    request: Request,
    header_token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
   
):
   
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = request.cookies.get("auth_token") or header_token
    if not token:
        raise credentials_exception
   
    def log_auth(msg):
        try:
            with open("/tmp/auth_debug.log", "a") as f:
                f.write(f"{datetime.now(timezone.utc)}: {msg}\n")
        except:
            pass

    log_auth(f"🔒 Authenticating token: {token[:10]}...")
   
    try:
        payload = decode_access_token(token)
    except Exception:
        log_auth("❌ Token decode failed")
        raise credentials_exception

    if payload is None:
        log_auth("❌ Token payload is None")
        raise credentials_exception
   
    user_id: str = payload.get("sub")
    workspace_id: str = payload.get("workspace_id")
    impersonated = payload.get("impersonated", False)
    admin_id = payload.get("admin_id")

    if user_id is None:
        log_auth("❌ Token missing sub")
        raise credentials_exception

    log_auth(f"👤 Token claims user_id: {user_id}")
    user = AuthService.get_user_by_id(db, user_id)

    if user is None:
        log_auth(f"❌ User {user_id} not found in DB")
        raise credentials_exception

    log_auth(f"Authenticated: {user.email}")
    logger.info(f"[AUTH HEADER] {request.headers.get('Authorization')}")
    return CurrentUser(
        user=user,
        workspace_id=workspace_id,
        impersonated=impersonated,
        admin_id=admin_id
    )


# ---------- Email Login & Signup (OTP) ----------

from app.schemas.auth import EmailLoginRequest
from pydantic import BaseModel
from typing import Optional

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

from fastapi import Response

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
        
        token = result["access_token"]
        from app.core.config import settings
        is_prod = settings.ENVIRONMENT.lower() == "production"
        
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            secure=is_prod,
            samesite="strict" if is_prod else "lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/",
        )
        
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

# Kept for backward compatibility
@router.post("/login")
async def login(request: dict, db: Session = Depends(get_db)):
    try:
        from app.models import User
        email = request.get('email')
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your email is not registered. Please sign up first.",
            )
        result = AuthService.email_login(db=db, email=email)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

# ---------- Google Auth ----------

from fastapi.responses import RedirectResponse
import urllib.parse

import httpx

@router.get("/google/login")
async def google_login(request: Request, type: str = "login"):
    from app.core.config import settings
    redirect_uri = settings.OAUTH_REDIRECT_URI

    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        "access_type=offline&"
        f"state={type}"
    )
    print(f"GOOGLE REDIRECT URI = {redirect_uri}")
    print(f"FRONTEND URL = {settings.FRONTEND_URL}")
    return RedirectResponse(url=auth_url)

@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, state: str = "login", db: Session = Depends(get_db)):
    from app.core.config import settings
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    is_prod = settings.ENVIRONMENT.lower() == "production"

    if not code:
        return RedirectResponse(url=f"{frontend_url}/login?error=Authentication+failed")

    redirect_uri = settings.OAUTH_REDIRECT_URI

    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            token_data = token_res.json()
            if "error" in token_data:
                raise ValueError(token_data.get("error_description", "Failed to exchange authorization code"))
            
            access_token = token_data["access_token"]
            
            profile_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            profile_data = profile_res.json()
            
            email = profile_data.get("email")
            full_name = profile_data.get("name", "Google User")
            
            if not email:
                raise ValueError("Google account has no associated email")

        result = AuthService.google_auth(db, email, full_name, state)
       
        jwt_token = result["access_token"]
        response = RedirectResponse(url=f"{frontend_url}/user/admin/dashboard")
        
        response.set_cookie(
            key="auth_token",
            value=jwt_token,
            httponly=True,
            secure=is_prod,
            samesite="strict" if is_prod else "lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/",
        )
        return response
    except ValueError as e:
        return RedirectResponse(url=f"{frontend_url}/login?error={urllib.parse.quote(str(e))}")
    except Exception as e:
        return RedirectResponse(url=f"{frontend_url}/login?error={urllib.parse.quote('Internal Server Error')}")


@router.post("/login/secret")
async def login_secret(
    request: SecretLoginRequest,
    db: Session = Depends(get_db)
):
    from app.core.config import settings
   
    master_key = settings.OWNER_SECRET_KEY
    if not master_key or request.key != master_key:
        raise HTTPException(status_code=401, detail="Invalid secret key")
   
    # Login as the first user found in DB (usually the owner/admin)
    from app.models import User
    admin = db.query(User).order_by(User.created_at.asc()).first()
    if not admin:
        raise HTTPException(status_code=404, detail="No users found in platform")
   
    return AuthService.login(db, admin.email)


# ---------- Current user ----------

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name
    }


# ---------- Workspaces ----------

@router.get("/workspaces")
async def get_workspaces(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workspaces for current user"""
    workspaces = AuthService.get_user_workspaces(db, current_user.id)
    return {"workspaces": workspaces}

@router.post("/logout")
async def logout(response: Response):
    from app.core.config import settings
    is_prod = settings.ENVIRONMENT.lower() == "production"
    
    response.delete_cookie(
        key="auth_token",
        path="/",
        samesite="strict" if is_prod else "lax",
    )
    return {"status": "success", "message": "Logged out"}