from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


class InviteMemberRequest(BaseModel):
    name: Optional[str] = Field(default=None, description="Name of the team member")
    email: EmailStr = Field(..., description="Email address of the team member")
    role: str = Field(default="member", description="Role to assign: 'admin' (full access) or 'member' (granular permissions)")
    permissions: Optional[Union[Dict[str, Any], List[str]]] = Field(
        default=None,
        description="Granular permissions if role is 'member'"
    )


class UpdateMemberRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(default=None, description="Role to update: 'admin' or 'member'")
    permissions: Optional[Union[Dict[str, Any], List[str]]] = None
    is_active: Optional[bool] = None


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(..., description="Role to update: 'admin' or 'member'")


class WorkspaceMemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: Optional[str] = None
    name: Optional[str] = None
    role: str
    permissions: Optional[Union[Dict[str, Any], List[str]]] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    is_owner: bool = False

    model_config = ConfigDict(from_attributes=True)


class WorkspaceInvitationResponse(BaseModel):
    id: str
    workspace_id: str
    workspace_name: str
    name: Optional[str] = None
    email: str
    role: str
    permissions: Optional[Union[Dict[str, Any], List[str]]] = None
    token: Optional[str] = None
    email_sent: Optional[bool] = None
    status: str
    invited_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    invite_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceSeatsSummaryResponse(BaseModel):
    workspace_id: str
    workspace_name: str
    plan_type: str
    total_member_seats: int
    used_member_seats: int
    available_member_seats: int
    total_seats: int
    used_seats: int
    available_seats: int
    members: List[WorkspaceMemberResponse]
    invitations: List[WorkspaceInvitationResponse]
    permissions_schema: Dict[str, Any] = Field(default_factory=dict)


class AcceptInvitationRequest(BaseModel):
    token: str


class PublicInvitationDetailsResponse(BaseModel):
    id: str
    workspace_id: str
    workspace_name: str
    name: Optional[str] = None
    email: str
    role: str
    permissions: Optional[Union[Dict[str, Any], List[str]]] = None
    invited_by_name: Optional[str] = None
    status: str
    is_expired: bool
    is_valid: bool
