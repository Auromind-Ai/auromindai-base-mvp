from sqlalchemy import Column, ForeignKey, Boolean, DateTime, Enum, Text, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base
from sqlalchemy.dialects.postgresql import UUID


class SenderType(str, enum.Enum):
    USER = "USER"
    AI = "AI"
    AGENT = "AGENT"
    SYSTEM = "SYSTEM"


class MessageStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    SUGGESTED = "SUGGESTED"
    SENT = "SENT"


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, index=True)

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)

    content = Column(Text)

    sender_type = Column(
        Enum(SenderType),
        default=SenderType.USER
    )

    status = Column(
        Enum(MessageStatus),
        default=MessageStatus.RECEIVED
    )

    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    is_read = Column(Boolean, default=False)

    source = Column(String(50), nullable=True)  # whatsapp / webchat / instagram

    external_id = Column(String(100), nullable=True)  # Twilio message SID

    metadata_json = Column(Text, nullable=True)

    conversation = relationship(
        "Conversation",
        back_populates="messages"
    )
