from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    channel = Column(Enum(ChannelType), default=ChannelType.WEB)
    external_id = Column(String, index=True) # WhatsApp number or IG handle
    contact_name = Column(String)
    status = Column(Enum(ConversationStatus), default=ConversationStatus.OPEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class ChatSession(Base):
    """
    Represents a persistent AI chat session (history).
    """
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    workspace_id = Column(String(36), index=True) # Linked to workspace
    user_id = Column(String(36), ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Store messages as JSON for simplicity in this MVP, or link to a new table
    # For now, we'll store a simple list of messages in a JSON column to avoid complexity with the existing Message table
    # OR we can create a relationship. Let's use a JSON column for the "chat history" context to keep it fast.
    # actually, RAG needs structured messages. Let's use a relationship but to a NEW table or reuse Message?
    # Reusing Message with a new foreign key is cleaner.
    
    # But wait, the existing Message table is for Inbox (WhatsApp/Instagram). 
    # Let's create `ChatMessage` to avoid polluting the Inbox.
    
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    """
    Individual message in an AI Chat Session.
    """
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    session_id = Column(String(36), ForeignKey("chat_sessions.id"))
    role = Column(String) # user, assistant, system
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Metadata for citations, sources, etc.
    metadata_json = Column(Text, nullable=True)

    session = relationship("ChatSession", back_populates="messages")

