from typing import Optional, List, Dict
from pydantic import BaseModel


class CreditsPurchaseRequest(BaseModel):
    pack_id: str
    workspace_id: Optional[str] = None
    provider: str = "razorpay"


class CreditsVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    workspace_id: Optional[str] = None
    provider: str = "razorpay"


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
    billing_name: Optional[str] = None
    billing_contact_name: Optional[str] = None
    billing_email: Optional[str] = None
    billing_phone: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_country: Optional[str] = None
    billing_postal_code: Optional[str] = None
    has_gst_registration: Optional[bool] = None
    billing_gstin: Optional[str] = None
    legal_business_name: Optional[str] = None
    business_type: Optional[str] = None


class CreateSubscriptionRequest(BaseModel):
    workspace_id: str
    plan: str
    billing_cycle: str = "monthly"
    provider: str = "razorpay"


class VerifyPaymentRequest(BaseModel):
    workspace_id: str
    plan: str
    billing_cycle: str = "monthly"
    provider: str = "razorpay"
    payment_id: Optional[str] = None
    subscription_id: Optional[str] = None
    signature: Optional[str] = None


class ReportPaymentFailureRequest(BaseModel):
    workspace_id: Optional[str] = None
    payment_id: Optional[str] = None
    order_id: Optional[str] = None
    subscription_id: Optional[str] = None
    plan: Optional[str] = None
    pack_id: Optional[str] = None
    amount: Optional[float | int] = None
    currency: Optional[str] = "INR"
    provider: str = "razorpay"
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    error_reason: Optional[str] = None
    error_source: Optional[str] = None
    error_step: Optional[str] = None


class LegacyCreateOrderRequest(BaseModel):
    workspace_id: str
    amount: int


class LegacyUpgradePlanRequest(BaseModel):
    workspace_id: str
    plan: str
