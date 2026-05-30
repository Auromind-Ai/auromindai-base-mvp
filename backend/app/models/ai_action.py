from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid



# AI ACTIONS (MCP LOG)
class AIAction(Base):
    __tablename__ = "ai_actions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    action_type = Column(String(100), nullable=False)

    intent = Column(Text)
    intent_raw = Column(Text)

    confidence = Column(Float)

    mcp_decision = Column(String(50))
    mcp_reason = Column(Text)

    rule_results = Column(JSON)
    context_refs = Column(JSON)

    execution_status = Column(String(50), default="pending")

    human_override = Column(Boolean, default=False)

    action_metadata = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="ai_actions")



# CONVERSATION STATE
class ConversationState(Base):
    __tablename__ = "conversation_states"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    current_stage = Column(String(50))  
    # lead / sales / followup / support

    last_intent = Column(String(255))
    last_agent = Column(String(100))

    followup_count = Column(Integer, default=0)

    # Repeat detection
    repeat_count = Column(Integer, default=0)
    last_message_hash = Column(String(64))

    updated_at = Column(DateTime(timezone=True), server_default=func.now())


# LEADS
class Lead(Base):
    __tablename__ = "leads"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id")
    )

    # Dynamic Business Fields
    custom_fields = Column(JSON, default={})

    # Business
    business_type = Column(String(255))
    product_type = Column(String(255))

    # Goal
    goal = Column(Text)

    # Qualification
    qualification = Column(String(50))
    lead_score = Column(Float, default=0)

    # Demo Booking
    demo_requested = Column(Boolean, default=False)

    meeting_date = Column(DateTime(timezone=True))
    meeting_link = Column(Text)

    # Payment
    payment_status = Column(String(50))
    payment_link = Column(Text)

    # AI
    last_agent = Column(String(100))
    ai_summary = Column(Text)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# SALES PIPELINE
class SalesPipeline(Base):
    __tablename__ = "sales_pipeline"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    stage = Column(String(50))  
    # awareness / consideration / decision

    interest_level = Column(String(50))
    objections = Column(JSON)

    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    deal_value = Column(Float)

    expected_close_date = Column(
        DateTime(timezone=True)
    )

    payment_completed = Column(
        Boolean,
        default=False
    )


# SUPPORT TICKETS
class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    issue_type = Column(String(100))
    status = Column(String(50))  # open / resolved

    description = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# HUMAN ESCALATION
class HumanEscalation(Base):
    __tablename__ = "human_escalations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True))
    conversation_id = Column(UUID(as_uuid=True))

    reason = Column(Text)
    status = Column(String(50))  # pending / resolved

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    workspace_id = Column(UUID(as_uuid=True))

    channel = Column(String(50))

    message = Column(Text)

    assigned_to = Column(UUID(as_uuid=True))

    priority = Column(String(50), default="normal")

    resolved_at = Column(DateTime(timezone=True))

    resolution_notes = Column(Text)