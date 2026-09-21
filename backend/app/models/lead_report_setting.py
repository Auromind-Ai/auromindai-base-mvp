import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, JSON, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class LeadReportSetting(Base):
    __tablename__ = "lead_report_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    is_active = Column(Boolean, default=False, nullable=False)
    min_score = Column(Integer, default=50, nullable=False)
    frequency = Column(String(50), default="daily", nullable=False)  # daily | weekly | monthly
    send_time = Column(String(10), default="09:00", nullable=False)  # 24hr format HH:MM
    recipient_emails = Column(JSON, default=list, nullable=False)
    attach_csv = Column(Boolean, default=True, nullable=False)

    report_filters = Column(JSON, default=dict, nullable=True)
    csv_columns = Column(JSON, nullable=True)

    # Custom message format templates
    subject_template = Column(String(255), nullable=True)
    body_template = Column(Text, nullable=True)

    last_sent_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
