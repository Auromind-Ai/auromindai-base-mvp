from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class EmailLoginRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    workspace_name: Optional[str] = Field(default="My Workspace", min_length=1, max_length=255)

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    platform_role: str = "user"
    workspace_id: str | None = None
    impersonated: bool | None = False
    two_factor_enabled: bool = False
    deletion_scheduled_at: Optional[datetime] = None
    csrf_token: Optional[str] = None

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    role: str



class AdminLoginRequest(BaseModel):
    secret_key: str = Field(..., min_length=8, max_length=255)


class SendOTPRequest(BaseModel):
    email: EmailStr
    auth_type: str = Field(..., pattern="^(login|signup|reset_password)$")
    turnstile_token: Optional[str] = Field(None, max_length=2048)


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10, pattern=r"^\d{4,10}$")
    auth_type: str = Field(..., pattern="^(login|signup|reset_password)$")
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    workspace_name: Optional[str] = Field(None, min_length=1, max_length=255)
    session_expiry_hours: Optional[int] = Field(None, ge=1, le=8760)
    turnstile_token: Optional[str] = Field(None, max_length=2048)



