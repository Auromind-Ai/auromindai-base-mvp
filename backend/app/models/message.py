from sqlalchemy import Column, ForeignKey, Boolean, DateTime, Enum, Text, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import enum
import uuid
from app.database import Base



class SenderType(str, enum.Enum):
    USER = "USER"
    AI = "AI"
    AGENT = "AGENT"
    SYSTEM = "SYSTEM"


class MessageStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    SUGGESTED = "SUGGESTED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"


class Message(Base):
    __tablename__ = "messages"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    content = Column(Text)

    sender_type = Column(Enum(SenderType), default=SenderType.USER)

    status = Column(Enum(MessageStatus), default=MessageStatus.RECEIVED)

    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    is_read = Column(Boolean, default=False)

    source = Column(String(50), nullable=True)

    
    external_id = Column(Text, index=True, nullable=True)

    metadata_json = Column(Text)


    conversation = relationship(
        "Conversation",
        back_populates="messages"
    )

    __table_args__ = (
        UniqueConstraint("external_id", name="uq_message_external_id"),
    )
