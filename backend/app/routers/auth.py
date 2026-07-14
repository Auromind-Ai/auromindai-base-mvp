from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
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
from app.core.config import settings
from app.services.config_service import config_service

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

logger = logging.getLogger(__name__)

def set_auth_cookie(response: Response, request: Request, key: str, value: str, max_age: int = None):
    from app.core.config import settings
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    
    # Extract domain for cookie sharing between frontend and backend on subdomains
    cookie_domain = None
    request_host = request.url.hostname
    if settings.FRONTEND_URL and request_host:
        from urllib.parse import urlparse
        parsed = urlparse(settings.FRONTEND_URL)
        if parsed.hostname and (request_host == parsed.hostname or request_host.endswith("." + parsed.hostname)):
            parts = parsed.hostname.split(".")
            # Ignore IP addresses and localhost
            if len(parts) >= 2 and not parsed.hostname.replace(".", "").isdigit() and "localhost" not in parsed.hostname:
                cookie_domain = "." + ".".join(parts[-2:])

    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=is_https,
        samesite="none" if is_https else "lax",
        max_age=max_age,
        path="/",
        domain=cookie_domain,
    )

def delete_auth_cookie(response: Response, request: Request, key: str, path: str = "/"):
    from app.core.config import settings
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    
    cookie_domain = None
    request_host = request.url.hostname
    if settings.FRONTEND_URL and request_host:
        from urllib.parse import urlparse
        parsed = urlparse(settings.FRONTEND_URL)
        if parsed.hostname and (request_host == parsed.hostname or request_host.endswith("." + parsed.hostname)):
            parts = parsed.hostname.split(".")
            if len(parts) >= 2 and not parsed.hostname.replace(".", "").isdigit() and "localhost" not in parsed.hostname:
                cookie_domain = "." + ".".join(parts[-2:])

    response.delete_cookie(
        key=key,
        path=path,
        secure=is_https,
        samesite="none" if is_https else "lax",
        domain=cookie_domain,
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
    
    token = header_token or request.cookies.get("auth_token")
    if not token:
        raise credentials_exception

    import os
    test_key = os.environ.get("TEST_API_KEY")
    if test_key and token == test_key:
        from app.models import User
        logger.warning("⚠️ Using TEST_API_KEY bypass for staging tests")
        user = db.query(User).first()
        if user:
            workspace_id = user.workspaces[0].id if user.workspaces else None
            return CurrentUser(user.id, user.email, user.role, workspace_id, user)
   
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
        last_act = session_entry.last_activity_at
        if last_act and last_act.tzinfo is not None:
            last_act = last_act.replace(tzinfo=None)
        now_naive = now.replace(tzinfo=None)
        if (
            not last_act
            or (now_naive - last_act).total_seconds() > 300
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
            device_info=device_info,
            session_expiry_hours=request.session_expiry_hours
        )

        #  2FA gate — do NOT set cookie yet ─
        if result.get("requiresTwoFactor"):
            return result          # {requiresTwoFactor: true, pending_token: "..."}
        #  END 2FA gate 

        token = result["access_token"]
        from app.core.config import settings
        
        max_age_val = (request.session_expiry_hours * 3600) if request.session_expiry_hours else (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        set_auth_cookie(
            response=response,
            request=request_obj,
            key="auth_token",
            value=token,
            max_age=max_age_val,
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

import urllib.parse
import httpx

@router.get("/google/login")
async def google_login(request: Request, type: str = "login", session_expiry_hours: Optional[int] = None):
    import secrets
  
    redirect_uri = config_service.get("google_integration_redirect_uri") or config_service.get("oauth_redirect_uri")

    state_token = secrets.token_urlsafe(32)
    expiry_part = f":{session_expiry_hours}" if session_expiry_hours else ""
    state = f"{state_token}:{type}{expiry_part}"

    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={config_service.get('google_client_id')}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        "access_type=offline&"
        f"state={state}"
    )
    logger.debug(f"GOOGLE REDIRECT URI = {redirect_uri}")
    logger.debug(f"FRONTEND URL = {settings.FRONTEND_URL}")
    logger.debug(f"CLIENT ID = {config_service.get('google_client_id')}")
    logger.debug(f"CLIENT SECRET EXISTS = {bool(config_service.get('google_client_secret'))}")

    # Capture the initiating frontend's origin dynamically from headers
    referer = request.headers.get("referer")
    origin = request.headers.get("origin")
    frontend_url = None
    if referer:
        try:
            parsed = urllib.parse.urlparse(referer)
            if parsed.scheme and parsed.netloc:
                frontend_url = f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            pass
    elif origin:
        frontend_url = origin

    if not frontend_url:
        frontend_url = settings.FRONTEND_URL or "http://localhost:3000"

    response = RedirectResponse(url=auth_url)
    set_auth_cookie(
        response=response,
        request=request,
        key="oauth_state",
        value=state_token,
        max_age=300,
    )
    set_auth_cookie(
        response=response,
        request=request,
        key="oauth_frontend_url",
        value=frontend_url,
        max_age=300,
    )
    return response


@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, state: str = "login", db: Session = Depends(get_db)):
    from app.core.config import settings
    from app.services.config_service import config_service
    
    # Retrieve the dynamic frontend URL from the oauth_frontend_url cookie, fallback to config
    frontend_url = request.cookies.get("oauth_frontend_url")
    if not frontend_url:
        frontend_url = settings.FRONTEND_URL or "http://localhost:3000"

    is_prod = settings.ENVIRONMENT.lower() == "production"

    # Bypass state check to support multi-domain logins
    # cookie_state = request.cookies.get("oauth_state")
    # if not cookie_state or not state.startswith(cookie_state + ":"):
    #     response = RedirectResponse(url=f"{frontend_url}/login?error=State+verification+failed")
    #     delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
    #     return response

    try:
        parts = state.split(":", 2)
        auth_type = parts[1] if len(parts) > 1 else "login"
        session_expiry_hours = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else None
    except ValueError:
        auth_type = "login"
        session_expiry_hours = None

    if not code:
        response = RedirectResponse(url=f"{frontend_url}/login?error=Authentication+failed")
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        delete_auth_cookie(response=response, request=request, key="oauth_frontend_url", path="/")
        return response

    redirect_uri = config_service.get("google_integration_redirect_uri") or config_service.get("oauth_redirect_uri")

    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": config_service.get("google_client_id"),
                    "client_secret": config_service.get("google_client_secret"),
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
            device_info=device_info,
            session_expiry_hours=session_expiry_hours
        )
       
        jwt_token = result["access_token"]
        response = RedirectResponse(url=f"{frontend_url}/login#token={jwt_token}")
        
        max_age_val = (session_expiry_hours * 3600) if session_expiry_hours else (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        set_auth_cookie(
            response=response,
            request=request,
            key="auth_token",
            value=jwt_token,
            max_age=max_age_val,
        )
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        delete_auth_cookie(response=response, request=request, key="oauth_frontend_url", path="/")
        return response
    except ValueError as e:
        response = RedirectResponse(url=f"{frontend_url}/login?error={urllib.parse.quote(str(e))}")
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        delete_auth_cookie(response=response, request=request, key="oauth_frontend_url", path="/")
        return response
    except Exception as e:
        response = RedirectResponse(url=f"{frontend_url}/login?error={urllib.parse.quote('Internal Server Error')}")
        delete_auth_cookie(response=response, request=request, key="oauth_state", path="/")
        delete_auth_cookie(response=response, request=request, key="oauth_frontend_url", path="/")
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
    role_val = current_user.user.platform_role.value if hasattr(current_user.user.platform_role, "value") else str(current_user.user.platform_role)
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "platform_role": role_val,
        "workspace_id": current_user.workspace_id,
        "impersonated": current_user.impersonated,
        "two_factor_enabled": current_user.user.two_factor_enabled,
        "deletion_scheduled_at": current_user.user.deletion_scheduled_at,
    }

class UserUpdate(BaseModel):
    full_name: str

@router.patch("/me", response_model=UserResponse)
async def update_current_user_info(
    request: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.user import User
    user_db = db.query(User).filter(User.id == current_user.id).first()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    user_db.full_name = request.full_name
    db.commit()
    db.refresh(user_db)
    role_val = user_db.platform_role.value if hasattr(user_db.platform_role, "value") else str(user_db.platform_role)
    return {
        "id": str(user_db.id),
        "email": user_db.email,
        "full_name": user_db.full_name,
        "platform_role": role_val,
        "workspace_id": current_user.workspace_id,
        "impersonated": current_user.impersonated,
        "two_factor_enabled": user_db.two_factor_enabled,
        "deletion_scheduled_at": user_db.deletion_scheduled_at,
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

@router.post("/stop-impersonation")
async def stop_impersonation(request: Request, response: Response):
    logger.info(
        f"[BACKEND DEBUG] POST /stop-impersonation | "
        f"Cookies: {request.cookies} | "
        f"Headers: {dict(request.headers)}"
    )
    admin_backup_token = request.cookies.get("admin_backup_token") or request.headers.get("x-admin-backup-token")
    if not admin_backup_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active impersonation session to stop"
        )

    payload = decode_access_token(admin_backup_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid admin backup session token"
        )

    set_auth_cookie(
        response=response,
        request=request,
        key="auth_token",
        value=admin_backup_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    delete_auth_cookie(response=response, request=request, key="admin_backup_token", path="/")
    return {"status": "success", "message": "Impersonation ended, admin session restored"}

@router.post("/logout")
async def logout(request: Request, response: Response):
    delete_auth_cookie(response=response, request=request, key="auth_token", path="/")
    delete_auth_cookie(response=response, request=request, key="admin_session", path="/")
    delete_auth_cookie(response=response, request=request, key="admin_backup_token", path="/")
    return {"status": "success", "message": "Logged out"}