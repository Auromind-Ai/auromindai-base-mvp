import uuid
from sqlalchemy import (Column,String,Boolean,DateTime,ForeignKey,UniqueConstraint)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base


class MCPRule(Base):
    __tablename__ = "mcp_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=False)

    rule_key = Column(String, nullable=False)
    rule_value = Column(JSONB, nullable=False)

    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "rule_key", name="uq_workspace_rule_key"),
    )