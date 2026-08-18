import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class EmailDeliveryLog(Base):
    __tablename__ = "email_delivery_logs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    idempotency_key = Column(String(255), unique=True, index=True, nullable=False)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255), nullable=True)
    recipient_role = Column(String(50), nullable=True)

    event_name = Column(String(100), nullable=False, index=True)
    template_key = Column(String(100), nullable=False, index=True)

    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)

    # Delivery lifecycle status: PENDING | SENT | FAILED | RETRYING | CANCELLED
    status = Column(String(50), nullable=False, default="PENDING", index=True)

    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    error_message = Column(Text, nullable=True)

    metadata_json = Column(JSONB, nullable=True, default=dict)

    # For delayed notifications (SLA reminders, 24h followups, scheduled digests)
    scheduled_for = Column(DateTime(timezone=True), nullable=True, index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
