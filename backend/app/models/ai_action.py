from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Boolean, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid

class AIAction(Base):
    __tablename__ = "ai_actions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"))
    action_type = Column(String(100), nullable=False)  # followup, marketing_suggestion, promise_detection
    intent = Column(Text)
    intent_raw = Column(Text) # The raw input or prompt that triggered the action
    confidence = Column(Float)
    mcp_decision = Column(String(50))  # allow, escalate, block
    mcp_reason = Column(Text)
    rule_results = Column(JSON) # Detailed breakdown of which rules were evaluated and their results
    context_refs = Column(JSON) # References to Brain entries or other context used
    execution_status = Column(String(50), default="pending") # pending, executed, failed, blocked
    human_override = Column(Boolean, default=False)
    action_metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
