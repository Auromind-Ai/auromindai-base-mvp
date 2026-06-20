import uuid
from sqlalchemy import Column, String, DateTime, func, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(String(100), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., PLAN_UPGRADE, CREDITS_GRANTED, WALLET_ADJUSTED
    workspace_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    reason = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
