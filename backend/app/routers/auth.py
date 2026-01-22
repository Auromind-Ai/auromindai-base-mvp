from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.services.auth_service import AuthService
from app.utils.auth import decode_access_token
import uuid

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Pydantic models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    workspace_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = None  # Optional for testing

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    role: str

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
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = AuthService.get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    
    return user

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

@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access token"""
    try:
        result = AuthService.login(db, request.email, request.password)
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
