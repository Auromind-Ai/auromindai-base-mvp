from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "conversation_id",
            name="uq_conversation_states_workspace_conversation",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    current_stage = Column(String(50))  
    # lead / sales / followup / support

    last_intent = Column(String(255))
    last_agent = Column(String(100))

    human_takeover = Column(Boolean, default=False)
    ai_paused_at = Column(DateTime(timezone=True), nullable=True)

    followup_count = Column(Integer, default=0)

    # Repeat detection
    repeat_count = Column(Integer, default=0)
    last_message_hash = Column(String(64))

    updated_at = Column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now()
)



# LEADS
class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint("workspace_id", "conversation_id", name="uq_leads_scope"),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(255))
    phone = Column(String(50), index=True, nullable=True)
    source = Column(String(100), nullable=True)  # whatsapp / instagram / sms / web
    requirement = Column(Text)
    budget = Column(String(100))
    timeline = Column(String(100))
    # Advanced CRM properties
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id")
    )

    # Dynamic Business Fields
    custom_fields = Column(JSON, default=dict)

    # Archival
    archived_at = Column(DateTime(timezone=True), nullable=True)
    archive_location = Column(String, nullable=True)

    # Business
    business_type = Column(String(255))
    product_type = Column(String(255))

    # Goal
    goal = Column(Text)

    # Qualification
    qualification = Column(String(50))
    lead_score = Column(Float, default=0)
    is_favorite = Column(Boolean, default=False, nullable=False, server_default="false")


    # --- Lead Scoring fields (agnostic) ---
    status = Column(
        String(50), default="new", index=True
    )  # new | active | converted | lost

    current_node = Column(Integer, default=0)
    total_nodes = Column(Integer, default=0)
    score = Column(Integer, default=0, index=True)
    behavioral_score = Column(Integer, default=0)
    semantic_intent_score = Column(Integer, default=0)
    lead_tier = Column(String(50), default="cold")

    intent_signals = Column(
        JSON,
        nullable=True
)
    budget_min = Column(Numeric(12, 2), nullable=True)
    budget_max = Column(Numeric(12, 2), nullable=True)
    budget_raw = Column(String(255), nullable=True)

    template_attempts = Column(Integer, default=0)

    last_activity_at = Column(
        DateTime(timezone=True), nullable=True, index=True
    )
    assigned_to = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )  # null = AI, user_id = human

    conversion_amount = Column(Numeric(12, 2), nullable=True)
    converted_at = Column(DateTime(timezone=True), nullable=True)
    is_converted = Column(Boolean, default=False, nullable=False)
    converted_product = Column(String(255), nullable=True)
    conversion_notes = Column(Text, nullable=True)
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


class LeadEvent(Base):
    __tablename__ = "lead_events"

    id = Column(
    UUID(as_uuid=True),
    primary_key=True,
    default=uuid.uuid4
)

    workspace_id = Column(UUID(as_uuid=True), index=True)

    lead_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        index=True,
    )

    conversation_id = Column(UUID(as_uuid=True), index=True)

    event_type = Column(String(100), index=True)

    source = Column(String(50))

    event_metadata = Column(JSON)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

# SALES PIPELINE
class SalesPipeline(Base):
    __tablename__ = "sales_pipeline"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "conversation_id",
            name="uq_sales_pipeline_scope",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

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

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    issue_type = Column(String(100))
    status = Column(String(50))  # open / resolved

    description = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# FOLLOWUPS
class ChatFollowup(Base):
    __tablename__ = "followups_chat"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    followup_count = Column(Integer)
    last_followup_at = Column(DateTime(timezone=True))

    status = Column(String(50))  # active / stopped



# MCP RULES (DYNAMIC)
class MCPRule(Base):
    __tablename__ = "mcp_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), index=True)

    rules = Column(JSON)

    updated_at = Column(DateTime(timezone=True), server_default=func.now())


# HUMAN ESCALATION
class HumanEscalation(Base):
    __tablename__ = "human_escalations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    channel = Column(String(50))
    message = Column(Text)

    reason = Column(Text)
    status = Column(String(50))  # pending / resolved

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assigned_to = Column(UUID(as_uuid=True))

    priority = Column(String(50), default="normal")

    resolved_at = Column(DateTime(timezone=True))

    resolution_notes = Column(Text)

class WorkspaceAIConfig(Base):
    __tablename__ = "workspace_ai_configs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    workspace_id = Column(
        UUID(as_uuid=True),
        unique=True
    )

    last_agent = Column(String(50))
    custom_fields = Column(JSONB, default=dict)

    business_type = Column(String(100))

    lead_fields = Column(JSON, default=list)

    rag_enabled = Column(Boolean, default=True)

    calendar_enabled = Column(Boolean, default=False)

    payment_enabled = Column(Boolean, default=False)

    support_enabled = Column(Boolean, default=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
