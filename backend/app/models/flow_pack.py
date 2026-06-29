import uuid
from enum import Enum
from sqlalchemy import Column, String, Numeric, Integer, DateTime, func, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base

class PurchaseStatus(str, Enum):
    INITIATED = "initiated"
    SUCCESS = "success"
    FAILED = "failed"

class FlowPack(Base):
    __tablename__ = "flow_packs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pack_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    flows_count = Column(Integer, nullable=False, default=0)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    provider = Column(String(50), nullable=False, default="razorpay")
    is_active = Column(Boolean, nullable=False, default=True)
    display_order = Column(Integer, nullable=False, default=0)
    badge = Column(String(50), nullable=True)
    extra_metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FlowPackPurchase(Base):
    __tablename__ = "flow_pack_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    flow_pack_id = Column(
        UUID(as_uuid=True),
        ForeignKey("flow_packs.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    flows_count = Column(Integer, nullable=False, default=0)
    amount_paid = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    provider = Column(String(50), nullable=False, default="razorpay")
    gateway_order_id = Column(String(100), nullable=False, unique=True, index=True)
    gateway_payment_id = Column(String(100), nullable=True, index=True)
    gateway_signature = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default=PurchaseStatus.INITIATED.value)
    failure_reason = Column(String(255), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
