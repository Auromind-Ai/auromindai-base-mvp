from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import logging

from sqlalchemy.orm import Session
from app.schemas.auth import EmailLoginRequest, UserResponse, WorkspaceResponse, SecretLoginRequest
from app.database import get_db
from app.services.auth_service import AuthService
from app.utils.auth import decode_access_token, get_client_ip, parse_user_agent
import uuid
from datetime import datetime, timezone

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

logger = logging.getLogger(__name__)

def set_auth_cookie(response: Response, request: Request, key: str, value: str, max_age: int = None):
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=is_https,
        samesite="none" if is_https else "lax",
        max_age=max_age,
        path="/",
    )

def delete_auth_cookie(response: Response, request: Request, key: str, path: str = "/"):
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    response.delete_cookie(
        key=key,
        path=path,
        secure=is_https,
        samesite="none" if is_https else "lax",
    )

class CurrentUser:
    def __init__(self, user, workspace_id, impersonated=False, admin_id=None, session_id=None):
        self.id = user.id
        self.email = user.email
        self.full_name = user.full_name
        self.workspace_id = workspace_id
        self.user = user
        self.impersonated = impersonated
        self.admin_id = admin_id
        self.session_id = session_id


#Dependency: get current user ----------

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
   
    logger.debug(f"🔒 Authenticating token: {token[:10]}...")
   
    try:
        payload = decode_access_token(token)
    except Exception:
        logger.debug("❌ Token decode failed")
        raise credentials_exception

    if payload is None:
        logger.debug("❌ Token payload is None")
        raise credentials_exception
   
    user_id: str = payload.get("sub")
    workspace_id: str = payload.get("workspace_id")
    impersonated = payload.get("impersonated", False)
    admin_id = payload.get("admin_id")
    session_id: str = payload.get("session_id")

    if user_id is None:
        logger.debug("❌ Token missing sub")
        raise credentials_exception

    logger.debug(f"👤 Token claims user_id: {user_id}")
    user = AuthService.get_user_by_id(db, user_id)

    if user is None:
        logger.debug(f"❌ User {user_id} not found in DB")
        raise credentials_exception

    # Session check (skip if session_id is None for backward compatibility)
    if session_id:
        from app.models import UserSession
        session_entry = db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session_entry:
            logger.debug(f"❌ Session {session_id} not found in DB")
            raise credentials_exception
        if session_entry.is_blocked:
            logger.debug(f"❌ Session {session_id} is blocked")
            raise credentials_exception
        if session_entry.revoked_at is not None:
            logger.debug(f"❌ Session {session_id} is revoked")
            raise credentials_exception
        
        # update last_activity_at only if more than 5 minutes have passed since the last update
        now = datetime.now(timezone.utc)
        if (
            not session_entry.last_activity_at
            or (now - session_entry.last_activity_at).total_seconds() > 300
        ):
            try:
                session_entry.last_activity_at = now
                db.commit()
            except Exception as e:
                logger.error(f"Failed to update session activity: {e}")
                db.rollback()

    logger.debug(f"Authenticated: {user.email}")
    logger.info(f"[AUTH HEADER] {request.headers.get('Authorization')}")
    return CurrentUser(
        user=user,
        workspace_id=workspace_id,
        impersonated=impersonated,
        admin_id=admin_id,
        session_id=session_id
    )


#Email Login & Signup (OTP) ----------

from app.schemas.auth import EmailLoginRequest, SendOTPRequest, VerifyOTPRequest
from typing import Optional

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
async def verify_otp(request_obj: Request, request: VerifyOTPRequest, response: Response, db: Session = Depends(get_db)):
    try:
        ip_address = get_client_ip(request_obj)
        user_agent = request_obj.headers.get("user-agent", "unknown")
        device_info = parse_user_agent(user_agent)
        
        result = AuthService.verify_otp(
            db=db,
            email=request.email,
            otp=request.otp,
            auth_type=request.auth_type,
            full_name=request.full_name,
            workspace_name=request.workspace_name,
            ip_address=ip_address,
            device_info=device_info
        )

        #  2FA gate — do NOT set cookie yet ─
        if result.get("requiresTwoFactor"):
            return result          # {requiresTwoFactor: true, pending_token: "..."}
        #  END 2FA gate 

        token = result["access_token"]
        from app.core.config import settings
        
        set_auth_cookie(
            response=response,
            request=request_obj,
            key="auth_token",
            value=token,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

# Kept for backward compatibility
@router.post("/login")
async def login(request_obj: Request, request: dict, db: Session = Depends(get_db)):
    try:
        from app.models import User
        email = request.get('email')
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your email is not registered. Please sign up first.",
            )
        
        ip_address = get_client_ip(request_obj)
        user_agent = request_obj.headers.get("user-agent", "unknown")
        device_info = parse_user_agent(user_agent)
        
        result = AuthService.email_login(
            db=db,
            email=email,
            ip_address=ip_address,
            device_info=device_info
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

#Google Auth ----------

from fastapi.responses import RedirectResponse
import urllib.parse

import httpx

@router.get("/google/login")
async def google_login(request: Request, type: str = "login"):
    import secrets
    from app.core.config import settings
    redirect_uri = settings.OAUTH_REDIRECT_URI

    state_token = secrets.token_urlsafe(32)
    state = f"{state_token}:{type}"

    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        "access_type=offline&"
        f"state={state}"
    )
    logger.debug(f"GOOGLE REDIRECT URI = {redirect_uri}")
    logger.debug(f"FRONTEND URL = {settings.FRONTEND_URL}")
    logger.debug(f"CLIENT ID = {settings.GOOGLE_CLIENT_ID}")
    logger.debug(f"CLIENT SECRET EXISTS = {bool(settings.GOOGLE_CLIENT_SECRET)}")

    response = RedirectResponse(url=auth_url)
    set_auth_cookie(
        response=response,
        request=request,
        key="oauth_state",
        value=state_token,
        max_age=300,
    )
    return response

@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, state: str = "login", db: Session = Depends(get_db)):
    from app.core.config import settings
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    is_prod = settings.ENVIRONMENT.lower() == "production"

    cookie_state = request.cookies.get("oauth_state")
    if not cookie_state or not state.startswith(cookie_state + ":"):
        response = RedirectResponse(url=f"{frontend_url}/login?error=State+verification+failed")
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        return response

    try:
        _, auth_type = state.split(":", 1)
    except ValueError:
        auth_type = "login"

    if not code:
        response = RedirectResponse(url=f"{frontend_url}/login?error=Authentication+failed")
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        return response

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

        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent", "unknown")
        device_info = parse_user_agent(user_agent)
        result = AuthService.google_auth(
            db=db,
            email=email,
            full_name=full_name,
            auth_type=auth_type,
            ip_address=ip_address,
            device_info=device_info
        )
       
        jwt_token = result["access_token"]
        response = RedirectResponse(url=f"{frontend_url}/user/admin/dashboard")
        
        set_auth_cookie(
            response=response,
            request=request,
            key="auth_token",
            value=jwt_token,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        return response
    except ValueError as e:
        response = RedirectResponse(url=f"{frontend_url}/login?error={urllib.parse.quote(str(e))}")
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        return response
    except Exception as e:
        response = RedirectResponse(url=f"{frontend_url}/login?error={urllib.parse.quote('Internal Server Error')}")
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        return response


@router.post("/login/secret")
async def login_secret(
    request_obj: Request,
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
   
    ip_address = get_client_ip(request_obj)
    user_agent = request_obj.headers.get("user-agent", "unknown")
    device_info = parse_user_agent(user_agent)
    
    return AuthService.login(db, admin.email, ip_address=ip_address, device_info=device_info)


#Current user ----------

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "two_factor_enabled": current_user.user.two_factor_enabled,
        "deletion_scheduled_at": current_user.user.deletion_scheduled_at,   # ← ADD
    }

class UserUpdate(BaseModel):
    full_name: str

@router.patch("/me", response_model=UserResponse)
async def update_current_user_info(
    request: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.user.full_name = request.full_name
    db.commit()
    db.refresh(current_user.user)
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.user.full_name,
        "two_factor_enabled": current_user.user.two_factor_enabled,
        "deletion_scheduled_at": current_user.user.deletion_scheduled_at,
    }


#Workspaces ----------

@router.get("/workspaces")
async def get_workspaces(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workspaces for current user"""
    workspaces = AuthService.get_user_workspaces(db, current_user.id)
    return {"workspaces": workspaces}

@router.post("/logout")
async def logout(request: Request, response: Response):
    delete_auth_cookie(response=response, request=request, key="auth_token", path="/")
    return {"status": "success", "message": "Logged out"}