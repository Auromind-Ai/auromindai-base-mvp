from sqlalchemy import Column, ForeignKey, Integer, Boolean, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class SenderType(str, enum.Enum):
    USER = "USER"
    AI = "AI"
    AGENT = "AGENT"
    SYSTEM = "SYSTEM"

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    content = Column(Text)
    sender_type = Column(Enum(SenderType), default=SenderType.USER)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    is_read = Column(Boolean, default=False)
    
    # Metadata for rich messages (images, buttons)
    metadata_json = Column(Text, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
