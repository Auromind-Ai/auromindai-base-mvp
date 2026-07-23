import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    category = Column(String(50), nullable=False, index=True)  # Security, Billing, Usage, Workflow, CRM, AI
    template_key = Column(String(100), nullable=False, index=True)  # e.g., welcome_signup, payment_success
    name = Column(String(255), nullable=False)  # Display name e.g. "Welcome Signup Email"
    title = Column(String(255), nullable=True)  # In-app title template / header
    subject = Column(String(255), nullable=True)  # Email subject line template
    message = Column(Text, nullable=False)  # Body text template with {{placeholders}}
    channel = Column(String(50), nullable=False, index=True, default="in_app")  # email, in_app, sms
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("template_key", "channel", name="uix_notif_template_key_channel"),
    )
