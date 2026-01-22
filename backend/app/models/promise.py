from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Promise(Base):
    __tablename__ = "promises"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"))
    user_id = Column(String(36), ForeignKey("users.id"))
    description = Column(Text, nullable=False)
    due_date = Column(Date)
    status = Column(String(50), default="pending")  # pending, resolved
    source = Column(String(50), default="manual")  # manual, ai_detected
    ai_action_id = Column(String(36), ForeignKey("ai_actions.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
