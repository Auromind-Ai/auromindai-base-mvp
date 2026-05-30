import uuid
from sqlalchemy import JSON, UUID, Boolean, Column, String, DateTime, UniqueConstraint, func
from app.database import Base

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String(50))
    event_type = Column(String(100))
    payload = Column(JSON)
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    provider_event_id = Column(String, index=True)

    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id", name="uq_provider_event_id"),
    )
