from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class PlanBase(BaseModel):
    name: str = Field(..., description="Unique key identifier for the plan e.g. free, solo, pro, enterprise, growth")
    display_name: Optional[str] = None
    monthly_price: float = Field(default=0.0, ge=0)
    yearly_price: float = Field(default=0.0, ge=0)
    description: Optional[str] = ""
    features: List[str] = Field(default_factory=list)
    display_order: int = Field(default=0)
    is_featured: bool = Field(default=False)
    is_active: bool = Field(default=True)
    currency: str = Field(default="INR")


class PlanCreate(PlanBase):
    token_limit: Optional[int] = 1000000


class PlanUpdate(BaseModel):
    display_name: Optional[str] = None
    monthly_price: Optional[float] = None
    yearly_price: Optional[float] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    display_order: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    token_limit: Optional[int] = None
    included_ai_credits: Optional[int] = None
    team_limit: Optional[int] = None
    knowledge_base_limit: Optional[int] = None
    storage_limit_mb: Optional[int] = None
    gmail_limit: Optional[int] = None
    lead_limit: Optional[int] = None
    automation_limit: Optional[int] = None


class PlanResponse(PlanBase):
    id: UUID
    price: float
    token_limit: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlanPublicItem(BaseModel):
    key: str
    name: str
    display_name: str
    monthly_price: float
    yearly_price: float
    description: str
    features: List[str]
    display_order: int
    is_featured: bool
    is_active: bool
    currency: str
    token_limit: int
    credits: float
