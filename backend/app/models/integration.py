from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid
from sqlalchemy.sql import func

class Integration(Base):
    __tablename__ = "integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Integration type: 'google_calendar', 'gmail', 'zoho_crm'
    integration_type = Column(String(50), nullable=False)
    
    # OAuth tokens
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime, nullable=True)
    
    # Connected account info
    connected_email = Column(String(255), nullable=True)
    connected_account_id = Column(String(255), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    event_date = Column(DateTime(timezone=True), nullable=False)
    event_time = Column(String, nullable=False)

    timezone = Column(String, nullable=True)
    location = Column(String, nullable=True)

    google_event_id = Column(String, nullable=True)
    sync_status = Column(String, default="pending")

    status = Column(String, default="scheduled")

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class EmailReplyLog(Base):

    __tablename__ = "email_reply_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), nullable=False)

    thread_id = Column(String)

    message_id = Column(String)

    reply_text = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
