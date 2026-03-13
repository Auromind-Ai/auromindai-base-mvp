from sqlalchemy import Column, ForeignKey, String, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
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
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )

    title = Column(String, default="New Chat")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan"
    )


# ===============================
# Chat Messages
# ===============================

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        index=True
    )

    role = Column(String)  # user / assistant / system

    content = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    metadata_json = Column(Text)

    session = relationship("ChatSession", back_populates="messages")