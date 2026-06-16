from sqlalchemy import Boolean, Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)

    full_name = Column(String)

    password_hash = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # JSONB column for user preferences (timezone, timezone_auto, etc.)
    # DB column already exists from migration 5b3aa6f37310
    preferences = Column(JSONB, server_default='{}', nullable=True)

    conversations = relationship(
        "Conversation",
        back_populates="owner"
    )