from sqlalchemy import Boolean, Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    # workspace_members = relationship("WorkspaceMember", back_populates="user")
    # learning_events = relationship("LearningEvent", back_populates="user")
    # followups = relationship("Followup", back_populates="user")
    conversations = relationship("Conversation", back_populates="owner")
    # promises = relationship("Promise", back_populates="user")
