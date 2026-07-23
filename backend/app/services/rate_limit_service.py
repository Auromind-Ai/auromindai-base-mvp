import logging
import time
from typing import Dict
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)

# Simple in-memory fallback rate limiter storage.
# Format: {key: [timestamp1, timestamp2, ...]}
# WARNING: In a horizontally scaled multi-instance production environment,
# this fallback results in local per-instance throttling.
# The effective rate limit across all instances becomes N * (number of instances).
# This is a known limitation when Redis is unavailable or unconfigured.
_in_memory_limits: Dict[str, list] = {}


def _check_in_memory_limit(key: str, limit: int, window: int) -> bool:
    """
    Checks the rate limit in-memory as a fallback.
    Returns True if the request is allowed (within limits), False otherwise.
    """
    now = time.time()
    if key not in _in_memory_limits:
        _in_memory_limits[key] = []

    # Filter out timestamps older than the sliding window
    _in_memory_limits[key] = [t for t in _in_memory_limits[key] if now - t < window]

    if len(_in_memory_limits[key]) >= limit:
        return False

    _in_memory_limits[key].append(now)
    return True


def _check_redis_limit(key: str, limit: int, window: int) -> bool:
    """
    Checks the rate limit using Redis.
    Returns True if the request is allowed (within limits), False otherwise.
    """
    from app.core.redis_lock import _get_redis
    try:
        r = _get_redis()
        # Using a simple fixed window block for performance
        current_bucket = int(time.time() / window)
        redis_key = f"rate_limit:{key}:{current_bucket}"

        # Increment counter
        count = r.incr(redis_key)
        if count == 1:
            # Set TTL on first request in the window bucket
            r.expire(redis_key, window)

        if count > limit:
            return False
        return True
    except Exception as e:
        logger.warning(
            f"[RateLimit] Redis check failed for key '{key}', falling back to in-memory: {e}"
        )
        return _check_in_memory_limit(key, limit, window)


def is_rate_limited(key: str, limit: int, window: int = 60) -> bool:
    """
    Checks if a key has exceeded the rate limit.
    Returns True if rate limited, False if allowed.
    """
    if settings.REDIS_URL:
        allowed = _check_redis_limit(key, limit, window)
    else:
        allowed = _check_in_memory_limit(key, limit, window)
    return not allowed


def check_login_rate_limits(ip_address: str, email: str = None) -> None:
    """
    Applies per-IP and per-email rate limiting independently.
    Raises HTTPException(429) if any limit is exceeded.
    """
    # IP limit: max 10 attempts per minute
    # Email limit: max 5 attempts per minute
    ip_limit = 10
    email_limit = 5
    window = 60

    # Clean and normalize keys
    ip_key = f"ip:{ip_address}"
    email_key = f"email:{email.strip().lower()}" if email else None

    # Check IP limits
    if is_rate_limited(ip_key, ip_limit, window):
        logger.warning(f"[RateLimit] Per-IP limit exceeded: {ip_address}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later."
        )

    # Check Email limits (if email is provided)
    if email_key and is_rate_limited(email_key, email_limit, window):
        logger.warning(f"[RateLimit] Per-Email limit exceeded: {email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later."
        )
