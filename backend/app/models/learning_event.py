from sqlalchemy import Column, DateTime, ForeignKey, Text, Float, Boolean, JSON, Enum, String
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
import enum
from sqlalchemy.dialects.postgresql import UUID


class FeedbackType(enum.Enum):
    THUMBS_UP = "thumbs_up"
    THUMBS_DOWN = "thumbs_down"
    SAVE_TO_BRAIN = "save_to_brain"
    NO_FEEDBACK = "no_feedback"


class LearningEvent(Base):
    __tablename__ = "ai_learning_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"))
    
    # Conversation Context
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    conversation_id = Column(
    UUID(as_uuid=True),
    ForeignKey("conversations.id", ondelete="SET NULL"),
    nullable=True
)
    
    # MCP Decision
    ai_action_id = Column(
    UUID(as_uuid=True),
    ForeignKey("ai_actions.id", ondelete="SET NULL"),
    nullable=True
)
    mcp_verdict = Column(String(50))  # ALLOW, ESCALATE, BLOCK
    mcp_confidence = Column(Float)

    # Human Feedback
    feedback_type = Column(Enum(FeedbackType), default=FeedbackType.NO_FEEDBACK)

    feedback_comment = Column(Text)

    feedback_timestamp = Column(DateTime(timezone=True))

    # Outcome Tracking
    execution_success = Column(Boolean)

    user_satisfaction_score = Column(Float)

    # Learning Metadata
    pattern_tags = Column(JSON)

    used_in_training = Column(Boolean, default=False)

    promoted_to_rule = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())