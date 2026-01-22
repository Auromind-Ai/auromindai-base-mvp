from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class ChannelType(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    INSTAGRAM = "INSTAGRAM"
    WEB = "WEB"

class ConversationStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    SNOOZED = "SNOOZED"

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    channel = Column(Enum(ChannelType), default=ChannelType.WEB)
    external_id = Column(String, index=True) # WhatsApp number or IG handle
    contact_name = Column(String)
    status = Column(Enum(ConversationStatus), default=ConversationStatus.OPEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")
