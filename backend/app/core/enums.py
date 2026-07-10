import enum

class SubscriptionStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    cancelled = "cancelled"
    expired = "expired"
    past_due = "past_due"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"

class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    open = "open"
    paid = "paid"
    void = "void"

class PlatformRole(str, enum.Enum):
    USER = "user"
    PLATFORM_ADMIN = "platform_admin"
