from typing import Optional, Dict, Any, List
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
    channel: str = Field("in_app", description="Channel: email, in_app, both, sms")
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
    rendered_html: Optional[str] = None


class TemplateTestSendRequest(BaseModel):
    recipient_email: str = Field(..., description="Target email address to receive test email")
    template_key: Optional[str] = Field(None, description="Template key")
    subject: Optional[str] = Field(None, description="Subject line template or custom subject")
    message: str = Field(..., description="Message body template")
    title: Optional[str] = Field(None, description="Title header template")
    variables: Dict[str, Any] = Field(default_factory=dict, description="Test dynamic variables")


class TemplateTestSendResponse(BaseModel):
    status: str = Field(..., description="SENT | FAILED | SIMULATED")
    message: str
    log_id: Optional[str] = None
    recipient_email: str


# Notification Rule Schemas
class NotificationRuleBase(BaseModel):
    event_name: str = Field(..., description="Event name e.g. lead.high_intent, payment.succeeded")
    template_key: str = Field(..., description="Matching NotificationTemplate key")
    recipient_roles: List[str] = Field(default_factory=list, description="Roles: assigned_agent, workspace_owner, billing_contact, managers, technical_contact, new_user")
    channels: List[str] = Field(default_factory=lambda: ["email"], description="Channels: email, in_app")
    conditions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional conditions e.g. {'lead_score_gte': 80}")
    delay_minutes: int = Field(0, description="Delay in minutes (0 = immediate)")
    dedup_window_seconds: int = Field(86400, description="Deduplication window in seconds")
    is_active: bool = Field(True, description="Whether rule is active")


class NotificationRuleCreate(NotificationRuleBase):
    pass


class NotificationRuleUpdate(BaseModel):
    event_name: Optional[str] = None
    template_key: Optional[str] = None
    recipient_roles: Optional[List[str]] = None
    channels: Optional[List[str]] = None
    conditions: Optional[Dict[str, Any]] = None
    delay_minutes: Optional[int] = None
    dedup_window_seconds: Optional[int] = None
    is_active: Optional[bool] = None


class NotificationRuleResponse(NotificationRuleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Notification Schedule Schemas
class NotificationScheduleBase(BaseModel):
    event_name: str
    display_name: str
    description: Optional[str] = None
    schedule_type: str = "daily"  # daily, weekly, interval_minutes
    time_of_day: Optional[str] = "08:00"
    day_of_week: Optional[str] = "monday"
    interval_minutes: Optional[int] = None
    default_timezone: str = "Asia/Kolkata"
    is_active: bool = True
    config_json: Optional[Dict[str, Any]] = Field(default_factory=dict)


class NotificationScheduleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    schedule_type: Optional[str] = None
    time_of_day: Optional[str] = None
    day_of_week: Optional[str] = None
    interval_minutes: Optional[int] = None
    default_timezone: Optional[str] = None
    is_active: Optional[bool] = None
    config_json: Optional[Dict[str, Any]] = None


class NotificationScheduleResponse(NotificationScheduleBase):
    id: UUID
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduleRunNowRequest(BaseModel):
    dry_run: bool = False
    test_recipient_email: Optional[str] = None
