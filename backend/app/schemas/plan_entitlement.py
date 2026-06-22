from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class PlanEntitlementBase(BaseModel):
    included_ai_credits: int = Field(0, description="Number of AI credits included in the plan")
    included_wcc_wallet: Decimal = Field(Decimal("0.00"), description="Promotional WCC wallet balance included")
    storage_limit_mb: int = Field(500, description="Storage limit in megabytes")
    team_limit: int = Field(2, description="Max team members allowed")
    knowledge_base_limit: int = Field(5, description="Max knowledge base documents")
    gmail_limit: int = Field(1, description="Max Gmail accounts/connections")
    lead_limit: int = Field(100, description="Max leads in the CRM")
    meeting_limit: int = Field(10, description="Max meetings/events")
    automation_limit: int = Field(2, description="Max active automation flows")

    allow_ai_topup: bool = Field(True, description="Whether workspace is allowed to purchase AI top-up credits")
    allow_wcc_recharge: bool = Field(True, description="Whether workspace is allowed to recharge WCC wallet balance")
    included_credit_reset_policy: str = Field("EXPIRE", description="AI credits renewal reset policy: EXPIRE or ROLLOVER")
    included_wallet_reset_policy: str = Field("EXPIRE", description="WCC wallet renewal reset policy: EXPIRE or ROLLOVER")

    feature_flags: Dict[str, Any] = Field(default_factory=dict, description="Custom feature toggles")


class PlanEntitlementCreate(PlanEntitlementBase):
    plan_id: UUID


class PlanEntitlementUpdate(BaseModel):
    included_ai_credits: Optional[int] = None
    included_wcc_wallet: Optional[Decimal] = None
    storage_limit_mb: Optional[int] = None
    team_limit: Optional[int] = None
    knowledge_base_limit: Optional[int] = None
    gmail_limit: Optional[int] = None
    lead_limit: Optional[int] = None
    meeting_limit: Optional[int] = None
    automation_limit: Optional[int] = None

    allow_ai_topup: Optional[bool] = None
    allow_wcc_recharge: Optional[bool] = None
    included_credit_reset_policy: Optional[str] = None
    included_wallet_reset_policy: Optional[str] = None

    feature_flags: Optional[Dict[str, Any]] = None


class PlanEntitlementResponse(PlanEntitlementBase):
    id: UUID
    plan_id: UUID
    plan_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EntitlementCheckRequest(BaseModel):
    resource: str
    value: int = Field(1, description="Quantity to check/deduct")


class EntitlementCheckResponse(BaseModel):
    allowed: bool
    current: int
    limit: int
    remaining: int
    reason: Optional[str] = None

