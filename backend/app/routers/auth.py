from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.services.auth_service import AuthService
from app.utils.auth import decode_access_token
import uuid
from datetime import datetime, timezone

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------- Request Models ----------

class EmailLoginRequest(BaseModel):
    email: EmailStr
    full_name: str | None = None
    workspace_name: str | None = "My Workspace"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    role: str

class SecretLoginRequest(BaseModel):
    key: str


# ---------- Current User Wrapper ----------

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
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
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
    return CurrentUser(
        user=user,
        workspace_id=workspace_id,
        impersonated=impersonated,
        admin_id=admin_id
    )


# ---------- Email Login ----------

@router.post("/login")
async def login(request: EmailLoginRequest, db: Session = Depends(get_db)):
    try:
        result = AuthService.email_login(
            db=db,
            email=request.email,
            full_name=request.full_name,
            workspace_name=request.workspace_name
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
    import os
    from dotenv import load_dotenv
    load_dotenv(override=True)
    
    master_key = os.getenv("OWNER_SECRET_KEY")
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
