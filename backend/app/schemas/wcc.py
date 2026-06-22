from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class WCCBalanceResponse(BaseModel):
    balance: Decimal
    currency: str


class WCCRateItem(BaseModel):
    category: str
    region: str
    rate_per_message: Decimal
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
