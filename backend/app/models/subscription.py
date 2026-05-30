import uuid
from sqlalchemy import UUID, Boolean, Column, ForeignKey, String, DateTime, func
from app.database import Base
from app.core.enums import SubscriptionStatus
from sqlalchemy import Enum, Index

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), index=True)

    status = Column(Enum(SubscriptionStatus), nullable=False)

    billing_cycle = Column(Enum('monthly', 'yearly', name='billing_cycle_enum'),nullable=False)
    is_admin_override = Column(Boolean, default=False)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))

    trial_start = Column(DateTime(timezone=True))
    trial_end = Column(DateTime(timezone=True))

    canceled_at = Column(DateTime(timezone=True))
    cancel_at_period_end = Column(Boolean, default=False)

    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))

    provider = Column(String(50), default="razorpay")
    provider_subscription_id = Column(String, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# only ONE ACTIVE subscription per workspace
Index(
    "uq_active_subscription",
    Subscription.workspace_id,
    unique=True,
    postgresql_where=(Subscription.status == SubscriptionStatus.active)
)

Index(
    "uq_provider_subscription",
    Subscription.provider,
    Subscription.provider_subscription_id,
    unique=True,
    postgresql_where=(Subscription.provider_subscription_id.isnot(None))
)
