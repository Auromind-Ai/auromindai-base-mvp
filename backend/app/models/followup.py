from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class Followup(Base):
    __tablename__ = "followups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True
    )

    scheduled_at = Column(DateTime(timezone=True), nullable=False)

    status = Column(
        String(50),
        default="pending"
    )
    
    message_content = Column(Text)

    followup_count = Column(Integer, default=0)

    mcp_decision = Column(String(50))  
   
    mcp_reason = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    executed_at = Column(DateTime(timezone=True))
