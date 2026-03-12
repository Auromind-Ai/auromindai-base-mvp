from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid


# ==============================
# OAuth Integrations
# ==============================

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    integration_type = Column(String(50), nullable=False)
    # gmail / google_calendar / zoho_crm

    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expiry = Column(DateTime)

    connected_email = Column(String(255))
    connected_account_id = Column(String(255))

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ==============================
# Calendar Events
# ==============================

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    title = Column(String)
    description = Column(Text)

    event_date = Column(DateTime(timezone=True), nullable=False)
    event_time = Column(String, nullable=False)

    timezone = Column(String)
    location = Column(String)

    google_event_id = Column(String, index=True)

    sync_status = Column(String, default="pending")
    # pending / synced / failed

    status = Column(String, default="scheduled")
    # scheduled / completed / cancelled

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==============================
# Email Reply Logs
# ==============================

class EmailReplyLog(Base):
    __tablename__ = "email_reply_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    thread_id = Column(String, index=True)

    message_id = Column(String, index=True)

    reply_text = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())