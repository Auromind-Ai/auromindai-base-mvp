import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.database import Base


class OutboundMessage(Base):
   

    __tablename__ = "outbound_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_number = Column(String, nullable=False)
    body = Column(String, nullable=False)
    metadata_json = Column(JSONB, nullable=False, default=dict)
    # pending | in_progress | sent | delivered | failed
    status = Column(String(32), nullable=False, default="pending", index=True)
    # Monotonically increasing per conversation — enforces send order
    sequence = Column(Integer, nullable=False)
    twilio_sid = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        # One in-progress message per conversation at most (enforced in code + this partial index)
        Index(
            "ix_outbound_messages_conv_seq",
            "conversation_id",
            "sequence",
            unique=True,
        ),
    )






