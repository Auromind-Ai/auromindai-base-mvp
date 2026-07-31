from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class NotificationTemplateBase(BaseModel):
    category: str = Field(..., description="Category e.g. Security, Billing, Usage, Workflow, CRM, AI")
    template_key: str = Field(..., description="Unique key e.g. welcome_signup, payment_success")
    name: str = Field(..., description="Display name e.g. Welcome Signup Email")
    title: Optional[str] = Field(None, description="In-app title template / header")
    subject: Optional[str] = Field(None, description="Email subject line template")
    message: str = Field(..., description="Body text template with {{placeholders}}")
    channel: str = Field("in_app", description="Channel: email, in_app, sms")
    is_active: bool = Field(True, description="Whether template is active")


class NotificationTemplateCreate(NotificationTemplateBase):
    pass


class NotificationTemplateUpdate(BaseModel):
    category: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None
    channel: Optional[str] = None
    is_active: Optional[bool] = None


class NotificationTemplateResponse(NotificationTemplateBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class TemplateTestRenderRequest(BaseModel):
    template_key: Optional[str] = Field(None, description="Optional key e.g. welcome_signup to resolve action metadata")
    subject: Optional[str] = None
    message: str
    title: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict)


class TemplateTestRenderResponse(BaseModel):
    rendered_title: Optional[str] = None
    rendered_subject: Optional[str] = None
    rendered_message: str
