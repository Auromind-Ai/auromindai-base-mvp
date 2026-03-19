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

# Pydantic models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    workspace_name: str

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

class CurrentUser:
    def __init__(self, user, workspace_id):
        self.id = user.id
        self.email = user.email
        self.full_name = user.full_name
        self.workspace_id = workspace_id
        self.user = user

# Dependency to get current user
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
    payload = decode_access_token(token)
    if payload is None:
        log_auth("❌ Token decode failed")
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    workspace_id: str = payload.get("workspace_id")

    if user_id is None:
        log_auth("❌ Token missing sub")
        raise credentials_exception

    log_auth(f"👤 Token claims user_id: {user_id}")
    user = AuthService.get_user_by_id(db, user_id)
    if user is None:
        log_auth(f"❌ User {user_id} not found in DB")
        raise credentials_exception

    log_auth(f"✅ Authenticated: {user.email}")
    return  CurrentUser(user, workspace_id)

@router.post("/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Create a new user and workspace"""
    try:
        user, workspace = AuthService.signup(
            db=db,
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            workspace_name=request.workspace_name
        )
        
        # Auto-login after signup
        login_result = AuthService.login(db, request.email, request.password)
        
        return {
            "message": "User created successfully",
            **login_result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login/secret")
async def login_secret(
    request: SecretLoginRequest,
    db: Session = Depends(get_db)
):
    import os
    master_key = os.getenv("OWNER_SECRET_KEY")
    if not master_key or request.key != master_key:
        raise HTTPException(status_code=401, detail="Invalid secret key")
    
    # Login as the first user found in DB (usually the owner/admin)
    from app.models import User
    admin = db.query(User).order_by(User.created_at.asc()).first()
    if not admin:
        raise HTTPException(status_code=404, detail="No users found in platform")
    
    return AuthService.login(db, admin.email)

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        result = AuthService.login(
            db,
            email=form_data.username,   # username → email
            password=form_data.password
        )

        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name
    }

@router.get("/workspaces")
async def get_workspaces(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workspaces for current user"""
    workspaces = AuthService.get_user_workspaces(db, current_user.id)
    return {"workspaces": workspaces}
