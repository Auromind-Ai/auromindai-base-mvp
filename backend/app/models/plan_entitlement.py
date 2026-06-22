import uuid
from sqlalchemy import Column, ForeignKey, Integer, Numeric, DateTime, JSON, Boolean, String, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class PlanEntitlement(Base):
    __tablename__ = "plan_entitlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("plans.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    included_ai_credits = Column(Integer, nullable=False, default=0)
    included_wcc_wallet = Column(Numeric(12, 2), nullable=False, default=0.00)
    storage_limit_mb = Column(Integer, nullable=False, default=500)
    team_limit = Column(Integer, nullable=False, default=2)
    knowledge_base_limit = Column(Integer, nullable=False, default=5)
    gmail_limit = Column(Integer, nullable=False, default=1)
    lead_limit = Column(Integer, nullable=False, default=100)
    meeting_limit = Column(Integer, nullable=False, default=10)
    automation_limit = Column(Integer, nullable=False, default=2)

    # Business lifecycle fields
    allow_ai_topup = Column(Boolean, nullable=False, default=True)
    allow_wcc_recharge = Column(Boolean, nullable=False, default=True)

    # Reset policy fields
    included_credit_reset_policy = Column(String(50), nullable=False, default="EXPIRE")  # EXPIRE | ROLLOVER
    included_wallet_reset_policy = Column(String(50), nullable=False, default="EXPIRE")  # EXPIRE | ROLLOVER

    feature_flags = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
