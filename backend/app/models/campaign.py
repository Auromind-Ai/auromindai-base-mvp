import uuid
from sqlalchemy import (Column,String,Text,DateTime,Integer,Numeric,Float,Boolean,ForeignKey,Index,UniqueConstraint,text)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    name = Column(String(255), nullable=False)
    campaign_type = Column(String(50), nullable=False, default="promotional")  # promotional | transactional | customer_support
    campaign_goal = Column(String(255), nullable=True)

    portfolio_id = Column(String(255), nullable=True, index=True)  # Meta Business Portfolio / WABA ID
    phone_number_id = Column(String(255), nullable=False, index=True)  # Specific Meta phone number ID

    status = Column(
        String(50),
        nullable=False,
        default="draft",
        index=True,
    )  # draft | scheduled | in_progress | paused | completed | failed | cancelled

    audience_source = Column(
        String(50),
        nullable=False,
        default="existing_contacts",
    )  # existing_contacts | upload_csv | smart_segment | manual_entry

    total_recipients = Column(Integer, default=0, nullable=False)
    valid_recipients = Column(Integer, default=0, nullable=False)
    invalid_recipients = Column(Integer, default=0, nullable=False)

    message_type = Column(String(50), nullable=False, default="template")  # custom | template | ai_generated
    template_id = Column(
        UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    message_content = Column(Text, nullable=True)
    media_url = Column(String(1024), nullable=True)
    media_type = Column(String(50), nullable=True)  # image | video | document

    schedule_type = Column(String(50), nullable=False, default="now")  # now | later
    scheduled_at = Column(DateTime(timezone=True), nullable=True, index=True)
    timezone = Column(String(100), default="Asia/Kolkata", nullable=False)

    send_gradually = Column(Boolean, default=True, nullable=False)
    messages_per_minute = Column(Integer, default=100, nullable=False)  # 100/min default or custom
    skip_invalid_numbers = Column(Boolean, default=True, nullable=False)
    stop_on_high_failure_rate = Column(Boolean, default=False, nullable=False)
    failure_rate_threshold = Column(Float, default=10.0, nullable=False)  # e.g. 10%

    quiet_hours_enabled = Column(Boolean, default=False, nullable=False)
    quiet_hours_start = Column(String(10), default="22:00", nullable=False)
    quiet_hours_end = Column(String(10), default="08:00", nullable=False)

    estimated_cost = Column(Numeric(12, 2), default=0.0, nullable=False)
    held_cost = Column(Numeric(12, 2), default=0.0, nullable=False)
    actual_cost = Column(Numeric(12, 2), default=0.0, nullable=False)

    accepted_count = Column(Integer, default=0, nullable=False)
    sent_count = Column(Integer, default=0, nullable=False)
    delivered_count = Column(Integer, default=0, nullable=False)
    read_count = Column(Integer, default=0, nullable=False)
    failed_count = Column(Integer, default=0, nullable=False)
    skipped_marketing_cap_count = Column(Integer, default=0, nullable=False)

    paused_reason = Column(String(255), nullable=True)
    next_available_capacity_at = Column(DateTime(timezone=True), nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    workspace = relationship("Workspace", backref="campaigns")
    template = relationship("Template", backref="campaigns")
    recipients = relationship("CampaignRecipient", back_populates="campaign", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_campaigns_ws_status", "workspace_id", "status"),
        Index("ix_campaigns_sched_status", "status", "scheduled_at"),
    )


class CampaignRecipient(Base):
    __tablename__ = "campaign_recipients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lead_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    phone_number = Column(String(50), nullable=False)
    normalized_phone = Column(String(50), nullable=False, index=True)
    recipient_name = Column(String(255), nullable=True)
    variables = Column(JSONB, default=dict, nullable=False)

    # Lifecycle: pending | queued | accepted | sent | delivered | read | failed | skipped_invalid | skipped_marketing_frequency_limit | held_portfolio_limit
    status = Column(String(50), default="pending", nullable=False, index=True)

    wamid = Column(String(255), nullable=True)
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    cost = Column(Numeric(10, 4), default=0.0, nullable=False)

    accepted_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    campaign = relationship("Campaign", back_populates="recipients")

    __table_args__ = (
        Index("idx_campaign_recipients_wamid", "wamid", postgresql_where=text("wamid IS NOT NULL")),
        Index("idx_campaign_recipients_camp_status", "campaign_id", "status"),
        Index("idx_campaign_recipients_ws_created", "workspace_id", "created_at"),
    )


class ContactList(Base):
    __tablename__ = "contact_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    total_contacts = Column(Integer, default=0, nullable=False)
    filter_query = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    members = relationship("ContactListMember", back_populates="contact_list", cascade="all, delete-orphan")


class ContactListMember(Base):
    __tablename__ = "contact_list_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_list_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contact_lists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lead_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    contact_list = relationship("ContactList", back_populates="members")
    lead = relationship("Lead")

    __table_args__ = (
        UniqueConstraint("contact_list_id", "lead_id", name="uq_contact_list_member"),
    )
