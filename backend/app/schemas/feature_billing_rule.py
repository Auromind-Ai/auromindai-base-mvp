from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class FeatureBillingRuleBase(BaseModel):
    feature_key: str = Field(..., description="Unique code identifier for the feature")
    feature_name: str = Field(..., description="Human-readable name of the feature")
    billing_type: str = Field(..., description="Billing type e.g. TOKEN, FLAT, PER_MB, etc.")
    unit_value: int = Field(1, description="Unit calculation denominator e.g. 1000 tokens")
    credit_cost: Decimal = Field(Decimal("0.0000"), description="Credits cost per unit")
    is_active: bool = Field(True, description="Whether this rule is active")
    description: Optional[str] = Field(None, description="Detailed description of the feature billing")


class FeatureBillingRuleCreate(FeatureBillingRuleBase):
    pass


class FeatureBillingRuleUpdate(BaseModel):
    feature_name: Optional[str] = None
    billing_type: Optional[str] = None
    unit_value: Optional[int] = None
    credit_cost: Optional[Decimal] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class FeatureBillingRuleResponse(FeatureBillingRuleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
