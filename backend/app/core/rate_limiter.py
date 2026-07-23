import time
import logging
from typing import Optional
from collections import defaultdict, deque
from threading import Lock
from fastapi import HTTPException, status, Request
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None
_in_memory_store = defaultdict(deque)
_store_lock = Lock()


def _get_redis() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=1.5,
            )
            _redis_client.ping()
        except Exception as e:
            logger.warning(f"[RateLimiter] Redis unavailable, using in-memory fallback: {e}")
            _redis_client = None
    return _redis_client


class RateLimiter:
    
    def __init__(self, requests_limit: int = 30, window_seconds: int = 60, prefix: str = "rate_limit:chat"):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.prefix = prefix

    def check_rate_limit(self, identifier: str) -> None:
        now = time.time()
        key = f"{self.prefix}:{identifier}"
        r = _get_redis()

        if r:
            try:
                pipe = r.pipeline()
                window_start = now - self.window_seconds
                # Remove timestamps older than window
                pipe.zremrangebyscore(key, 0, window_start)
                # Count current requests in window
                pipe.zcard(key)
                # Add current request timestamp
                pipe.zadd(key, {str(now): now})
                # Set TTL on key
                pipe.expire(key, self.window_seconds + 5)
                results = pipe.execute()

                current_count = results[1]
                if current_count >= self.requests_limit:
                    retry_after = int(self.window_seconds)
                    logger.warning(f"[RateLimiter] Rate limit exceeded for {identifier} ({current_count}/{self.requests_limit})")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Maximum {self.requests_limit} requests allowed per {self.window_seconds} seconds. Please wait before sending another message.",
                        headers={"Retry-After": str(max(1, retry_after))},
                    )
                return
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"[RateLimiter] Redis error during rate limit check: {e}. Falling back to in-memory store.")

        # In-memory fallback
        with _store_lock:
            timestamps = _in_memory_store[key]
            window_start = now - self.window_seconds
            while timestamps and timestamps[0] <= window_start:
                timestamps.popleft()

            if len(timestamps) >= self.requests_limit:
                retry_after = int(self.window_seconds - (now - timestamps[0]))
                logger.warning(f"[RateLimiter] In-Memory Rate limit exceeded for {identifier} ({len(timestamps)}/{self.requests_limit})")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {self.requests_limit} requests allowed per {self.window_seconds} seconds. Please wait before sending another message.",
                    headers={"Retry-After": str(max(1, retry_after))},
                )
            timestamps.append(now)


# Default Chat Rate Limiter instance (30 requests per 60 seconds)
chat_rate_limiter = RateLimiter(
    requests_limit=getattr(settings, "CHAT_RATE_LIMIT_REQUESTS", 30),
    window_seconds=getattr(settings, "CHAT_RATE_LIMIT_WINDOW_SECONDS", 60),
    prefix="rate_limit:chat"
)


def verify_chat_rate_limit(request: Request, current_user=None) -> None:
    user_id = str(getattr(current_user, "id", "")) if current_user else ""
    client_ip = request.client.host if request.client else "unknown"
    identifier = user_id if user_id else f"ip_{client_ip}"
    chat_rate_limiter.check_rate_limit(identifier)
