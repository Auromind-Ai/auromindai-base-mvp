
import logging
import uuid
from typing import Optional
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)
REDIS_URL = settings.REDIS_URL

# Module-level singleton — thread-safe, reused across Celery workers.
_redis_client: Optional[redis.Redis] = None


def _get_redis() -> redis.Redis:
    """Lazy-init a shared Redis connection pool."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client


# Lua script: release ONLY if the caller owns the lock (compare-and-delete).
_RELEASE_SCRIPT = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
"""

def acquire_conversation_lock(
    conversation_id: str,
    ttl_seconds: int = 30,
) -> Optional[str]:
    
    r = _get_redis()
    token = str(uuid.uuid4())
    key = f"conversation_send_lock:{conversation_id}"

    acquired = r.set(key, token, nx=True, ex=ttl_seconds)
    if acquired:
        logger.debug(
            "[redis_lock] Acquired lock | conversation=%s token=%s ttl=%ds",
            conversation_id, token, ttl_seconds,
        )
        return token

    logger.debug(
        "[redis_lock] Lock unavailable | conversation=%s (held by another worker)",
        conversation_id,
    )
    return None

def release_conversation_lock(conversation_id: str, token: str) -> bool:
    
    r = _get_redis()
    key = f"conversation_send_lock:{conversation_id}"

    result = r.eval(_RELEASE_SCRIPT, 1, key, token)
    released = result == 1
    if released:
        logger.debug(
            "[redis_lock] Released lock | conversation=%s token=%s",
            conversation_id, token,
        )
    else:
        logger.debug(
            "[redis_lock] Lock already expired or stolen | conversation=%s token=%s",
            conversation_id, token,
        )
    return released
