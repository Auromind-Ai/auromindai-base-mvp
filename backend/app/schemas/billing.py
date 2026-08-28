from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
import re

class CreditsPurchaseRequest(BaseModel):
    pack_id: str = Field(..., min_length=1, max_length=100)
    workspace_id: Optional[str] = None
    provider: str = Field(default="razorpay", max_length=50)


class CreditsVerifyRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=1, max_length=255)
    razorpay_payment_id: str = Field(..., min_length=1, max_length=255)
    razorpay_signature: str = Field(..., min_length=1, max_length=512)
    workspace_id: Optional[str] = None
    provider: str = Field(default="razorpay", max_length=50)


class UnifiedBillingItem(BaseModel):
    id: str
    date: str
    amount: float
    status: str
    payment_id: Optional[str] = None
    payment_type: str
    payment_method: Optional[str] = None
    provider: str
    description: str
    invoice_available: bool
    invoice_number: Optional[str] = None
    pdf_url: Optional[str] = None
    taxable_amount: Optional[float] = None
    gst_amount: Optional[float] = None
    total_amount: Optional[float] = None


class UnifiedBillingResponse(BaseModel):
    payments: List[UnifiedBillingItem]
    pagination: Dict[str, int]


class UpdateBillingProfileRequest(BaseModel):
    billing_name: Optional[str] = Field(None, max_length=255)
    billing_contact_name: Optional[str] = Field(None, max_length=255)
    billing_email: Optional[str] = Field(None, max_length=255)
    billing_phone: Optional[str] = Field(None, max_length=50)
    billing_address: Optional[str] = Field(None, max_length=500)
    billing_city: Optional[str] = Field(None, max_length=100)
    billing_state: Optional[str] = Field(None, max_length=100)
    billing_country: Optional[str] = Field(None, max_length=100)
    billing_postal_code: Optional[str] = Field(None, max_length=20)
    has_gst_registration: Optional[bool] = None
    billing_gstin: Optional[str] = Field(None, max_length=20)
    legal_business_name: Optional[str] = Field(None, max_length=255)
    business_type: Optional[str] = Field(None, max_length=100)

    @field_validator("billing_gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            v_clean = v.strip().upper()
            gstin_regex = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
            if not re.match(gstin_regex, v_clean):
                raise ValueError("Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5")
            return v_clean
        return None

    @field_validator("billing_email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            v_clean = v.strip()
            if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v_clean):
                raise ValueError("Invalid email format for billing email.")
            return v_clean
        return None


class CreateSubscriptionRequest(BaseModel):
    workspace_id: str
    plan: str = Field(..., min_length=1, max_length=50)
    billing_cycle: str = Field(default="monthly", pattern="^(monthly|yearly|annual)$")
    provider: str = Field(default="razorpay", max_length=50)


class VerifyPaymentRequest(BaseModel):
    workspace_id: str
    plan: str = Field(..., min_length=1, max_length=50)
    billing_cycle: str = Field(default="monthly", pattern="^(monthly|yearly|annual)$")
    provider: str = Field(default="razorpay", max_length=50)
    payment_id: Optional[str] = Field(None, max_length=255)
    subscription_id: Optional[str] = Field(None, max_length=255)
    signature: Optional[str] = Field(None, max_length=512)


class ReportPaymentFailureRequest(BaseModel):
    workspace_id: Optional[str] = Field(None, max_length=100)
    payment_id: Optional[str] = Field(None, max_length=255)
    order_id: Optional[str] = Field(None, max_length=255)
    subscription_id: Optional[str] = Field(None, max_length=255)
    plan: Optional[str] = Field(None, max_length=50)
    billing_cycle: Optional[str] = Field(default="monthly", pattern="^(monthly|yearly|annual)$")
    plan_label: Optional[str] = Field(None, max_length=100)
    pack_id: Optional[str] = Field(None, max_length=100)
    amount: Optional[float | int] = Field(None, ge=0)
    currency: Optional[str] = Field(default="INR", max_length=10)
    provider: str = Field(default="razorpay", max_length=50)
    error_code: Optional[str] = Field(None, max_length=100)
    error_description: Optional[str] = Field(None, max_length=1000)
    error_reason: Optional[str] = Field(None, max_length=500)
    error_source: Optional[str] = Field(None, max_length=100)
    error_step: Optional[str] = Field(None, max_length=100)


class LegacyCreateOrderRequest(BaseModel):
    workspace_id: str = Field(..., min_length=1, max_length=100)
    amount: int = Field(..., gt=0, le=100000000)


class LegacyUpgradePlanRequest(BaseModel):
    workspace_id: str = Field(..., min_length=1, max_length=100)
    plan: str = Field(..., min_length=1, max_length=50)


class PlanPurchaseRequest(BaseModel):
    workspace_id: Optional[str] = Field(None, max_length=100)
    plan: str = Field(..., min_length=1, max_length=50)
    billing_cycle: str = Field(default="monthly", pattern="^(monthly|yearly|annual)$")
    provider: str = Field(default="razorpay", max_length=50)


class PlanVerifyRequest(BaseModel):
    workspace_id: Optional[str] = Field(None, max_length=100)
    plan: str = Field(..., min_length=1, max_length=50)
    billing_cycle: str = Field(default="monthly", pattern="^(monthly|yearly|annual)$")
    razorpay_order_id: Optional[str] = Field(None, max_length=255)
    razorpay_payment_id: Optional[str] = Field(None, max_length=255)
    razorpay_signature: Optional[str] = Field(None, max_length=512)
    order_id: Optional[str] = Field(None, max_length=255)
    payment_id: Optional[str] = Field(None, max_length=255)
    signature: Optional[str] = Field(None, max_length=512)
    provider: str = Field(default="razorpay", max_length=50)


class RetryPaymentOpRequest(BaseModel):
    target_id: str = Field(..., min_length=1, max_length=255)
    reason: Optional[str] = Field(None, max_length=500)


class ReplayWebhookOpRequest(BaseModel):
    target_id: str = Field(..., min_length=1, max_length=255)
    reason: Optional[str] = Field(None, max_length=500)


class ManualVerifyPaymentOpRequest(BaseModel):
    payment_id: str = Field(..., min_length=1, max_length=255)
    reason: Optional[str] = Field(None, max_length=500)


class RetryRechargeOpRequest(BaseModel):
    recharge_log_id: str = Field(..., min_length=1, max_length=255)
    reason: Optional[str] = Field(None, max_length=500)


class RetryCreditPurchaseOpRequest(BaseModel):
    payment_id: str = Field(..., min_length=1, max_length=255)
    reason: Optional[str] = Field(None, max_length=500)


class RepairBillingOpRequest(BaseModel):
    issue_type: str = Field(..., min_length=1, max_length=100)
    workspace_id: Optional[str] = Field(None, max_length=255)
    metadata: Optional[Dict[str, Any]] = None


