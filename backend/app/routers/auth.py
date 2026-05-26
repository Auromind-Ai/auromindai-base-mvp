from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import logging
import asyncio
import secrets as secrets_module
import time
from collections import deque

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


# ---------- Dependency: get current user ----------

async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
   
):
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    def log_auth(msg):
        try:
            with open("/tmp/auth_debug.log", "a") as f:
                f.write(f"{datetime.now(timezone.utc)}: {msg}\n")
        except:
            pass

    log_auth("🔒 Authenticating token...")
    
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
    return CurrentUser(
        user=user,
        workspace_id=workspace_id,
        impersonated=impersonated,
        admin_id=admin_id
    )


# ---------- Email Login ----------

@router.post("/login")
async def login(request: dict, db: Session = Depends(get_db)):
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
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

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

@router.post("/admin/login")
async def admin_login(
    request: Request,
    body: AdminLoginRequest,
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

    response = {
        "message": "Access granted",
        "access_token": access_token,
        "token_type": "bearer",
        "user": admin_data.get("user"),
        "workspaces": admin_data.get("workspaces"),
    }

    return response


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
