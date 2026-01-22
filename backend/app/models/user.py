from sqlalchemy import Boolean, Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    # workspace_members = relationship("WorkspaceMember", back_populates="user")
    # learning_events = relationship("LearningEvent", back_populates="user")
    # followups = relationship("Followup", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")
    # promises = relationship("Promise", back_populates="user")
