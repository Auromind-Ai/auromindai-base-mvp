import uuid
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
from app.database import Base


class OutboundMessage(Base):

    __tablename__ = "outbound_messages"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

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

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    flow_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )

    to_number = Column(
        String,
        nullable=False
    )

    body = Column(
        String,
        nullable=False
    )

    metadata_json = Column(
        JSONB,
        nullable=False,
        default=dict
    )

    # automation | ai | followup
    message_type = Column(
        String(50),
        nullable=False,
        default="automation",
        index=True
    )

    # delivered | failed | cancelled
    status = Column(
        String(32),
        nullable=False,
        default="pending",
        index=True
    )

    # Monotonic sequence per conversation
    sequence = Column(
        Integer,
        nullable=False
    )

    twilio_sid = Column(
        String,
        nullable=True,
        index=True
    )

    __table_args__ = (

        # Prevent duplicate sequence
        Index(
            "ix_outbound_messages_conv_seq",
            "conversation_id",
            "sequence",
            unique=True,
        ),

        # Only ONE active outbound per conversation
        Index(
            "ix_outbound_messages_one_active",
            "conversation_id",
            unique=True,
            postgresql_where=text(
                "status IN ('in_progress', 'dispatched')"
            ),
        ),
    )