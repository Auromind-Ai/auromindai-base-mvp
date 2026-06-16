from sqlalchemy import Boolean, Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)

    full_name = Column(String)

    password_hash = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    two_factor_enabled = Column(Boolean, default=False, nullable=False, server_default='false')
    two_factor_secret = Column(String, nullable=True)

    deletion_scheduled_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None
    )

    conversations = relationship(
        "Conversation",
        back_populates="owner"
    )