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

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    flow_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    to_number = Column(String, nullable=False)
    body = Column(String, nullable=False)
    metadata_json = Column(JSONB, nullable=False, default=dict)
    # pending | in_progress | dispatched | sent | delivered | failed | cancelled
    status = Column(String(32), nullable=False, default="pending", index=True)
    # Monotonically increasing per conversation — enforces send order
    sequence = Column(Integer, nullable=False)
    twilio_sid = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        # Unique (conversation, sequence) — prevents duplicate sequence assignment
        Index(
            "ix_outbound_messages_conv_seq",
            "conversation_id",
            "sequence",
            unique=True,
        ),
        # Partial unique index: at most ONE active message per conversation.
        # "active" = in_progress OR dispatched.
        # This is a DATABASE-LEVEL guard against race conditions.
        Index(
            "ix_outbound_messages_one_active",
            "conversation_id",
            unique=True,
            postgresql_where=(
                "status IN ('in_progress', 'dispatched')"
            ),
        ),
    )
