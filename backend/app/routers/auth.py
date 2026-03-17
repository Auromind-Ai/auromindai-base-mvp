from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.services.auth_service import AuthService
from app.utils.auth import decode_access_token

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

    try:
        payload = decode_access_token(token)
    except Exception:
        raise credentials_exception

    user_id = payload.get("sub")
    workspace_id = payload.get("workspace_id")

    impersonated = payload.get("impersonated", False)
    admin_id = payload.get("admin_id")

    user = AuthService.get_user_by_id(db, user_id)

    if user is None:
        raise credentials_exception

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

    workspaces = AuthService.get_user_workspaces(db, current_user.id)

    return {"workspaces": workspaces}
