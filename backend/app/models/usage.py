import uuid

from sqlalchemy import UUID, Boolean, Column, ForeignKey, Integer, DateTime, UniqueConstraint, func
from datetime import datetime
from app.database import Base

class Usage(Base):
    __tablename__ = "usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), index=True)

    messages_used = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)

    overage_messages = Column(Integer, default=0)
    overage_tokens = Column(Integer, default=0)

    billed = Column(Boolean, default=False)  

    period_start = Column(DateTime(timezone=True), server_default=func.now())
    period_end = Column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("workspace_id", "subscription_id", "period_start", name="uq_usage_period"),
    )