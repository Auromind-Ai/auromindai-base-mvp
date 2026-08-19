import uuid
from sqlalchemy import Column, String, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class EventPayloadSchema(Base):
    __tablename__ = "event_payload_schemas"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    event_name = Column(String(100), nullable=False, unique=True, index=True)
    template_key = Column(String(100), nullable=True, index=True)
    category = Column(String(50), nullable=True)
    discovered_keys = Column(JSON, default=list, nullable=False)
    sample_payload = Column(JSON, default=dict, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
