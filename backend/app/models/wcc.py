import uuid
from sqlalchemy import Column, String, DateTime, func, Integer, Numeric, Boolean, ForeignKey, UniqueConstraint, Index
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
    rate_per_message = Column(Numeric(8, 4), nullable=False)
    effective_from = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_wcc_rate_cards_lookup", "category", "region", "is_active"),
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
    status = Column(String(50), nullable=False)  # success, free_session, failed, pending
    message_count = Column(Integer, default=1, nullable=False)
    debit_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    rate_applied = Column(Numeric(8, 4), nullable=False)
    raw_payload = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("workspace_id", "meta_session_id", name="uq_wcc_transaction_workspace_session"),
        Index("ix_wcc_transactions_workspace_created", "workspace_id", "created_at"),
        Index("ix_wcc_transactions_meta_session", "meta_session_id"),
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
