import uuid
from sqlalchemy import UUID, Column, ForeignKey, String, DateTime, func, Text, Integer, UniqueConstraint
from app.database import Base
from app.core.enums import PaymentStatus

from sqlalchemy import Enum

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL"))

    billing_start = Column(DateTime(timezone=True))
    billing_end = Column(DateTime(timezone=True))

    amount = Column(Integer, nullable=False)  



    currency = Column(String(3), default="INR")

    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.pending)

    provider = Column(String(50), default="razorpay")

    provider_payment_id = Column(String, index=True)
    provider_order_id = Column(String, index=True)

    failure_reason = Column(Text)

    refund_amount = Column(Integer)
    refunded_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    idempotency_key = Column(String, unique=True, index=True)

    __table_args__ = (
        UniqueConstraint("provider", "provider_payment_id", name="uq_payment_provider_payment_id"),
    )
