from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import logging
from sqlalchemy.orm import Session
from app.schemas.auth import  UserResponse, SecretLoginRequest
from app.database import get_db
from app.services.auth_service import AuthService
from app.utils.auth import decode_access_token
from datetime import datetime, timezone
from fastapi import Request
from app.core.config import settings
from app.models.user import User

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

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

    log_auth(f"Authenticating token: {token[:10]}...")
    
    try:
        payload = decode_access_token(token)
    except Exception:
        log_auth("Token decode failed")
        raise credentials_exception

    if payload is None:
        log_auth("Token payload is None")
        raise credentials_exception
    
    user_id: str = payload.get("sub")
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
    logger.info(f"[AUTH HEADER] {request.headers.get('Authorization')}")
    return CurrentUser(
        user=user,
        workspace_id=workspace_id,
        impersonated=impersonated,
        admin_id=admin_id
    )


#Email Login 
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
   
    master_key = settings.OWNER_SECRET_KEY
    if not master_key or request.key != master_key:
        raise HTTPException(status_code=401, detail="Invalid secret key")
    
    # Login as the first user found in DB (usually the owner/admin)
    
    admin = db.query(User).order_by(User.created_at.asc()).first()
    if not admin:
        raise HTTPException(status_code=404, detail="No users found in platform")
    
    return AuthService.login(db, admin.email)


#  Current user-
@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name
    }


#  Workspaces
@router.get("/workspaces")
async def get_workspaces(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    
    workspaces = AuthService.get_user_workspaces(db, current_user.id)
    return {"workspaces": workspaces}
