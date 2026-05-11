import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.services.channel_service import ChannelService

logger = logging.getLogger(__name__)


def deliver_outbound_message(
    *,
    db: Session,
    conversation_id: str,
    to_number: str,
    body: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """Dispatch a single outbound inbox message via the unified channel sender."""
    metadata = metadata or {}
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise RuntimeError(f"Conversation {conversation_id} not found for outbound delivery")

    logger.info(
        "[deliver_outbound_message] Sending channel=%s to=%s",
        conversation.channel,
        to_number,
    )
    return ChannelService.send_message(conversation, body, metadata)
