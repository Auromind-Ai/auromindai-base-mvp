from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID


class AIAction(Base):
    __tablename__ = "ai_actions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    action_type = Column(String(100), nullable=False)  
    # followup, marketing_suggestion, promise_detection

    intent = Column(Text)
    intent_raw = Column(Text)

    confidence = Column(Float)

    mcp_decision = Column(String(50))  
    # allow / escalate / block

    mcp_reason = Column(Text)

    rule_results = Column(JSON)  
    # rule evaluation results

    context_refs = Column(JSON)  
    # brain references used

    execution_status = Column(
        String(50),
        default="pending"
    )
    # pending / executed / failed / blocked

    human_override = Column(Boolean, default=False)

    action_metadata = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="ai_actions")