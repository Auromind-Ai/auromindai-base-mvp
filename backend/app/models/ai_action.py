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

    followup_count = Column(Integer, default=0)

    # Repeat detection
    repeat_count = Column(Integer, default=0)
    last_message_hash = Column(String(64))

    updated_at = Column(DateTime(timezone=True), server_default=func.now())



# LEADS
class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint("workspace_id", "conversation_id", name="uq_leads_scope"),
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

    name = Column(String(255))
    phone = Column(String(50), index=True, nullable=True)
    source = Column(String(100), nullable=True)  # whatsapp / instagram / sms / web
    requirement = Column(Text)
    budget = Column(String(100))
    timeline = Column(String(100))
    # Advanced CRM properties
    business_type = Column(String(255))
    product_type = Column(String(255))
    goal = Column(Text)

    qualification = Column(String(50))  # hot / warm / cold

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

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LeadEvent(Base):
    __tablename__ = "lead_events"

    id = Column(UUID(as_uuid=True), primary_key=True)

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
