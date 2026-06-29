import uuid
from sqlalchemy import Column, String, DateTime, func, Integer, Numeric, Boolean, ForeignKey, UniqueConstraint, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class WCCWallet(Base):
    __tablename__ = "wcc_wallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    balance = Column(Numeric(12, 2), nullable=False, default=0.0)
    currency = Column(String(3), default="INR", nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WCCRateCard(Base):
    __tablename__ = "wcc_rate_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(50), nullable=False)  # marketing, utility, authentication, service
    region = Column(String(10), default="IN", nullable=False)
    rate_per_message = Column(Numeric(8, 4), nullable=True)  # Deprecated
    meta_cost = Column(Numeric(8, 4), nullable=True)  # Nullable initially for Phase 1 migration
    customer_price = Column(Numeric(8, 4), nullable=True)  # Nullable initially for Phase 1 migration
    effective_from = Column(DateTime(timezone=True), server_default=func.now())
    effective_to = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_wcc_rate_cards_lookup", "category", "region", "is_active"),
        Index("ix_wcc_rate_cards_effective_range", "category", "region", "is_active", "effective_from", "effective_to"),
        CheckConstraint("customer_price >= meta_cost AND meta_cost >= 0 AND customer_price > 0", name="chk_wcc_rate_card_values"),
    )


class WCCTransaction(Base):
    __tablename__ = "wcc_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    meta_session_id = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)   
    message_count = Column(Integer, default=1, nullable=False)
    debit_amount = Column(Numeric(12, 2), nullable=False, default=0.0)  
    rate_applied = Column(Numeric(8, 4), nullable=False)  
    meta_cost_applied = Column(Numeric(8, 4), nullable=True) 
    customer_price_applied = Column(Numeric(8, 4), nullable=True) 
    pricing_version = Column(Integer, default=1, nullable=False)
    raw_payload = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("workspace_id", "meta_session_id", name="uq_wcc_transaction_workspace_session"),
        Index("ix_wcc_transactions_workspace_created", "workspace_id", "created_at"),
        Index("ix_wcc_transactions_meta_session", "meta_session_id"),
        Index("ix_wcc_transactions_category", "category"),
        CheckConstraint("customer_price_applied >= meta_cost_applied AND meta_cost_applied >= 0 AND customer_price_applied >= 0", name="chk_wcc_transaction_values"),
    )


class WCCRechargeLog(Base):
    __tablename__ = "wcc_recharge_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    gateway_order_id = Column(String(255), index=True, nullable=True)
    gateway_payment_id = Column(String(255), index=True, unique=True, nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, success, failed

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
