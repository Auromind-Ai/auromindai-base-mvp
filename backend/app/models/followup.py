from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Followup(Base):
    __tablename__ = "followups"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"))
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="pending")  # pending, sent, stopped, failed
    message_content = Column(Text)
    followup_count = Column(Integer, default=0)
    mcp_decision = Column(String(50))  # allow, escalate, block
    mcp_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    executed_at = Column(DateTime(timezone=True))
