from pydantic import BaseModel, EmailStr, Field

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

class AdminLoginRequest(BaseModel):
    secret_key: str = Field(..., min_length=8)
