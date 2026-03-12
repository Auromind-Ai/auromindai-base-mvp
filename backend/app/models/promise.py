from sqlalchemy import Column, DateTime, ForeignKey, Text, Date, String
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class Promise(Base):
    __tablename__ = "promises"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    description = Column(Text, nullable=False)

    due_date = Column(Date)

    status = Column(
        String(50),
        default="pending"
    )
    # pending / resolved

    source = Column(
        String(50),
        default="manual"
    )
    # manual / ai_detected

    ai_action_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ai_actions.id", ondelete="SET NULL"),
        nullable=True
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    resolved_at = Column(DateTime(timezone=True))