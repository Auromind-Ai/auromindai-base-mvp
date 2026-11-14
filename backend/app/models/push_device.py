import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PushDeviceToken(Base):
    """Per-device Expo push token registration for Android and iOS devices."""

    __tablename__ = "push_device_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    push_token = Column(String, unique=True, nullable=False, index=True)
    platform = Column(String, nullable=False)  # 'android' | 'ios' | 'web'
    device_name = Column(String, nullable=True)
    device_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, server_default="true")
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="push_device_tokens")
