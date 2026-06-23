
import json
import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import redis

from app.core.config import settings
from app.core.redis_pubsub import (
    conversation_channel,
    user_channel,
    workspace_channel,
)

logger = logging.getLogger(__name__)



_sync_redis: Optional[redis.Redis] = None


def _get_sync_redis() -> redis.Redis:
    global _sync_redis
    if _sync_redis is None:
        _sync_redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
    return _sync_redis


#  Event schema 

@dataclass
class RealtimeEvent:

    event_type: str
    payload: dict[str, Any]
    user_id: Optional[str] = None
    workspace_id: Optional[str] = None
    conversation_id: Optional[str] = None
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_json(self) -> str:
        return json.dumps(asdict(self))


#  Event type constants

class EventType:
    NEW_MESSAGE             = "new_message"
    MESSAGE_STATUS_UPDATED  = "message_status_updated"
    CONVERSATION_UPDATED    = "conversation_updated"

    # Flow execution
    FLOW_STARTED            = "flow_started"
    FLOW_COMPLETED          = "flow_completed"
    FLOW_ERROR              = "flow_error"

    # AI
    AI_RESPONSE_READY       = "ai_response_ready"
    AI_THINKING             = "ai_thinking"

    # System
    PING                    = "ping"
    SYSTEM_ALERT            = "system_alert"


#  Public API 

def publish_to_user(
    user_id: str,
    event_type: str,
    payload: dict,
    conversation_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    *,
    max_retries: int = 2,
) -> bool:
  
    event = RealtimeEvent(
        event_type=event_type,
        payload=payload,
        user_id=user_id,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    return _safe_publish(user_channel(user_id), event, max_retries=max_retries)


def publish_to_workspace(
    workspace_id: str,
    event_type: str,
    payload: dict,
    conversation_id: Optional[str] = None,
    *,
    max_retries: int = 2,
) -> bool:
    event = RealtimeEvent(
        event_type=event_type,
        payload=payload,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    return _safe_publish(
        workspace_channel(workspace_id), event, max_retries=max_retries
    )


def publish_to_conversation(
    conversation_id: str,
    user_id: str,
    event_type: str,
    payload: dict,
    workspace_id: Optional[str] = None,
    *,
    max_retries: int = 2,
) -> bool:
   
    event = RealtimeEvent(
        event_type=event_type,
        payload=payload,
        user_id=user_id,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    return _safe_publish(
        conversation_channel(conversation_id), event, max_retries=max_retries
    )


def publish_to_workspace_conversation(
    conversation_id: str,
    workspace_id: str,
    event_type: str,
    payload: dict,
    *,
    max_retries: int = 2,
) -> bool:
    event = RealtimeEvent(
        event_type=event_type,
        payload=payload,
        workspace_id=workspace_id,
        conversation_id=conversation_id,
    )
    return _safe_publish(
        conversation_channel(conversation_id), event, max_retries=max_retries
    )


#  Internal

def _safe_publish(
    channel: str, event: RealtimeEvent, *, max_retries: int
) -> bool:
    """Execute PUBLISH with retries. Logs failures, never raises."""
    last_exc: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            r = _get_sync_redis()
            subscribers = r.publish(channel, event.to_json())
            logger.info(
                "Realtime published | channel=%s type=%s subscribers=%d id=%s",
                channel,
                event.event_type,
                subscribers,
                event.event_id,
            )
            return True
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "Realtime publish failed (attempt %d/%d) | channel=%s | %s",
                attempt + 1,
                max_retries + 1,
                channel,
                exc,
            )

    logger.error(
        "Realtime publish permanently failed | channel=%s | %s",
        channel,
        last_exc,
    )
    return False
