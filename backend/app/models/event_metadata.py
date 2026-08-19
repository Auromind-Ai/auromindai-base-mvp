import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class EventMetadata(Base):
    __tablename__ = "event_metadata"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    event_name = Column(String(100), nullable=False, unique=True, index=True)
    template_key = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    allowed_channels = Column(JSON, default=list, nullable=False)
    action_route = Column(String(255), nullable=True)
    action_label = Column(String(255), nullable=True)
    supports_subject = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)