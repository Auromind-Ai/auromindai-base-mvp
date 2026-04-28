import uuid

from sqlalchemy import UUID, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func

from app.database import Base


class TokenLedger(Base):
    __tablename__ = "token_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), index=True)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), index=True)

    entry_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="posted")
    tokens_delta = Column(Integer, nullable=False)
    reference_key = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    metadata_json = Column(Text)
    expires_at = Column(DateTime(timezone=True), index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("reference_key", name="uq_token_ledger_reference_key"),
    )
