import uuid
from sqlalchemy import (Column,ForeignKey,String,DateTime,func,Text,Integer,Enum,Index)
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.core.enums import PaymentStatus


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    subscription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        index=True,
    )

    invoice_id = Column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
    )

    billing_start = Column(DateTime(timezone=True))
    billing_end = Column(DateTime(timezone=True))

    amount = Column(Integer, nullable=False)

    currency = Column(String(3), default="INR", nullable=False)

    status = Column(
        Enum(PaymentStatus),
        nullable=False,
        default=PaymentStatus.pending,
        index=True,
    )

    provider = Column(String(50), default="razorpay", nullable=False)

    provider_payment_id = Column(String, index=True)
    provider_order_id = Column(String, index=True)

    failure_reason = Column(Text)

    refund_amount = Column(Integer)
    refunded_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    #  idempotency (VERY IMPORTANT)
    idempotency_key = Column(String, unique=True, index=True)

    # partial unique index (fix for NULL issue)
    __table_args__ = (
        Index(
            "uq_payment_provider_payment_id",
            "provider",
            "provider_payment_id",
            unique=True,
            postgresql_where=(provider_payment_id.isnot(None)),
        ),
    )