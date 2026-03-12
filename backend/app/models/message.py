from sqlalchemy import Column, ForeignKey, Boolean, DateTime, Enum, Text
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


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True
    )

    content = Column(Text)

    sender_type = Column(Enum(SenderType), default=SenderType.USER)

    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    is_read = Column(Boolean, default=False)

    metadata_json = Column(Text)

    conversation = relationship("Conversation", back_populates="messages")