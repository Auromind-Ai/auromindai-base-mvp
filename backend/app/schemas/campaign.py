from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class PreflightEstimateRequest(BaseModel):
    workspace_id: str
    valid_recipients_count: int
    category: str = "marketing"


class PreflightEstimateResponse(BaseModel):
    estimated_cost: float
    rate_per_message: float
    current_balance: float
    held_balance: float
    available_balance: float
    is_balance_sufficient: bool
    shortfall: float
    portfolio_tier_limit: int
    portfolio_used_today: int
    portfolio_remaining_today: int
    next_unlock_at: Optional[str] = None


class RecipientInput(BaseModel):
    lead_id: Optional[str] = None
    phone_number: Optional[str] = None
    phone: Optional[str] = None
    normalized_phone: Optional[str] = None
    recipient_name: Optional[str] = None
    name: Optional[str] = None
    variables: Dict[str, Any] = {}

    @model_validator(mode="before")
    @classmethod
    def resolve_phone_and_name(cls, values):
        if isinstance(values, dict):
            p = values.get("phone_number") or values.get("phone") or ""
            values["phone_number"] = p
            values["phone"] = p
            n = values.get("recipient_name") or values.get("name") or ""
            values["recipient_name"] = n
            values["name"] = n
        return values


class CampaignCreateRequest(BaseModel):
    workspace_id: str
    name: str
    campaign_type: str = "promotional"
    campaign_goal: Optional[str] = None
    phone_number_id: Optional[str] = None
    audience_source: str = "existing_contacts"
    message_type: str = "template"
    template_id: Optional[str] = None
    message_content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    schedule_type: str = "now"
    scheduled_at: Optional[datetime] = None
    timezone: str = "Asia/Kolkata"
    send_gradually: bool = True
    messages_per_minute: int = 100
    skip_invalid_numbers: bool = True
    stop_on_high_failure_rate: bool = False
    failure_rate_threshold: float = 10.0
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "08:00"
    estimated_cost: float = 0.0
    whatsapp_number: Optional[str] = None
    auto_launch: bool = False
    segment: Optional[str] = None
    recipients: List[RecipientInput] = []


class CampaignResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    campaign_type: str
    campaign_goal: Optional[str] = None
    phone_number_id: str
    portfolio_id: Optional[str] = None
    status: str
    total_recipients: int
    valid_recipients: int
    invalid_recipients: int
    message_type: str
    schedule_type: str
    scheduled_at: Optional[datetime] = None
    timezone: str
    send_gradually: bool
    messages_per_minute: int
    skip_invalid_numbers: bool = True
    stop_on_high_failure_rate: bool = False
    failure_rate_threshold: float = 10.0
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "08:00"
    message_content: Optional[str] = None
    media_url: Optional[str] = None
    estimated_cost: float
    held_cost: float
    actual_cost: float
    accepted_count: int
    sent_count: int
    delivered_count: int
    read_count: int
    failed_count: int
    skipped_marketing_cap_count: int
    paused_reason: Optional[str] = None
    next_available_capacity_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ContactListCreateRequest(BaseModel):
    workspace_id: str
    name: str
    description: Optional[str] = None
    lead_ids: Optional[List[str]] = None
