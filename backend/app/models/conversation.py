from sqlalchemy import Column, ForeignKey, String, DateTime, Enum, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid
from app.database import Base
from sqlalchemy.dialects.postgresql import UUID


class ChannelType(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    TWILIO = "TWILIO"
    INSTAGRAM = "INSTAGRAM"
    EMAIL = "EMAIL"
    WEB = "WEB"


class ConversationStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    SNOOZED = "SNOOZED"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=True
    )

    phone = Column(String(20), index=True)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True
    )
    metadata_json = Column(Text, nullable=True)
    channel = Column(Enum(ChannelType), default=ChannelType.WEB)
    external_id = Column(String, index=True)
    contact_name = Column(String)
    profile_pic = Column(Text)

    status = Column(Enum(ConversationStatus), default=ConversationStatus.OPEN)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("workspace_id", "phone", "channel", 
                        name="uq_workspace_phone_channel"),
    )

    owner = relationship("User", back_populates="conversations")

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )
    execution_state = relationship(
        "FlowExecutionState",
        back_populates="conversation",
        cascade="all, delete-orphan",
        uselist=False,
    )
    execution_traces = relationship(
        "FlowExecutionTrace",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )

    workspace = relationship("Workspace", back_populates="conversations")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"))
    user_id = Column(
    UUID(as_uuid=True),
    ForeignKey("users.id")
)
    title = Column(String, default="New Chat")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
    UUID(as_uuid=True),
    ForeignKey("chat_sessions.id"),
    nullable=False
    )
    role = Column(String) 
    content = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    metadata_json = Column(Text)

    session = relationship("ChatSession", back_populates="messages")

