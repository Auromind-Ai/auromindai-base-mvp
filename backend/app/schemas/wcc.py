from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class WCCBalanceResponse(BaseModel):
    balance: Decimal
    currency: str = "INR"
    current_balance: Optional[Decimal] = None
    reference_full_amount: Optional[Decimal] = None
    fill_percentage: Optional[float] = None
    last_recharge_amount: Optional[Decimal] = None
    last_recharge_at: Optional[datetime] = None
    overage_balance: Optional[Decimal] = Decimal("0.00")   # Outstanding debt
    overage_enabled: Optional[bool] = False                  # Workspace overage policy
    status: Optional[str] = "Healthy"                        # Canonical status: Empty / Low / Healthy / Full
    wcc_locked: bool = False                                 # Entitlement lock state based on subscription
    spending_allowed: bool = True                            # WCC spending permission
    subscription_state: Optional[str] = "ACTIVE"             # ACTIVE / EXPIRED / FREE
    status_message: Optional[str] = None                     # Explanatory lock message for UI

    class Config:
        from_attributes = True


class WCCRateItem(BaseModel):
    category: str
    region: str
    rate_per_message: Decimal
    customer_price: Decimal
    is_active: bool

    class Config:
        from_attributes = True


class WCCEstimateRequest(BaseModel):
    audience_size: int = Field(..., gt=0)
    category: str
    workspace_id: Optional[str] = None


class WCCEstimateResponse(BaseModel):
    estimated_cost: Decimal
    balance_sufficient: bool
    rate_applied: Decimal


class WCCRechargeInitiateRequest(BaseModel):
    amount: Decimal = Field(..., ge=Decimal("100.00"))
    workspace_id: Optional[str] = None


class WCCRechargeInitiateResponse(BaseModel):
    gateway_order_id: str
    amount: int  # Amount in paise (e.g. 100000 for ₹1000)
    currency: str
    public_key: str
    recharge_log_id: str


class WCCRechargeVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    workspace_id: Optional[str] = None



class WCCSessionItem(BaseModel):
    date: str
    session_id: str
    category: str
    status: str
    message_count: int
    debit_amount: Decimal
    rate_applied: Decimal

    class Config:
        from_attributes = True


class WCCSessionHistoryResponse(BaseModel):
    sessions: List[WCCSessionItem]
    total_count: int
    page: int
    limit: int
