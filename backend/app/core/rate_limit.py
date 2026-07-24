import time
import json
import logging
from typing import Optional
from collections import defaultdict, deque
from threading import Lock
from datetime import datetime, timezone
from fastapi import Request, HTTPException, status
from starlette.responses import JSONResponse
from app.core.config import settings

logger = logging.getLogger("security_audit")

# Fallback default limits
DEFAULT_LIMITS = {
    "/upload": 10,
    "/brain": 30,
    "/billing": 60,
    "/auth/send-otp": 5,
    "global": 120,
}

DEFAULT_MAX_UPLOAD_MB = 25
DEFAULT_MAX_CONCURRENT_AI = 3

_in_memory_store = defaultdict(deque)
_store_lock = Lock()


def log_security_event(
    event_name: str,
    request: Request,
    details: dict | None = None,
    user_id: str | None = None,
):
    """Structured security event logger for SIEM, incident response, and monitoring."""
    ip = _get_client_ip(request)
    ua = request.headers.get("user-agent", "unknown")
    event_payload = {
        "event": event_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "ip": ip,
        "method": request.method,
        "path": request.url.path,
        "user_agent": ua,
        "details": details or {},
    }
    logger.warning(f"🔒 [SECURITY_EVENT] {json.dumps(event_payload)}")


def _get_redis_client():
    if getattr(_get_redis_client, "override", None) is not None:
        return _get_redis_client.override
    try:
        import redis
        client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
        client.ping()
        return client
    except Exception as e:
        logger.warning(f"RateLimiter Redis connection error: {e}")
        return None


def _get_client_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.headers.get("x-real-ip", request.client.host if request.client else "unknown").strip()


def _get_dynamic_setting(key: str, default: int) -> int:
    try:
        from app.services.config_service import config_service
        val = config_service.get(key)
        if val is not None:
            return int(val)
    except Exception:
        pass
    return default


class RateLimiter:
    """Sliding-window rate limiter with Redis backend and in-memory fallback."""

    def __init__(self, requests_limit: int = 30, window_seconds: int = 60, prefix: str = "rate_limit:chat"):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.prefix = prefix

    def check_rate_limit(self, identifier: str) -> None:
        now = time.time()
        key = f"{self.prefix}:{identifier}"
        r = _get_redis_client()

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
    client_ip = _get_client_ip(request)
    identifier = user_id if user_id else f"ip_{client_ip}"
    chat_rate_limiter.check_rate_limit(identifier)


class RateLimitMiddleware:
    """FastAPI ASGI middleware for dynamic route rate limiting & payload size enforcement."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        path = request.url.path

        # Bypass OPTIONS requests, health check, docs, and static assets
        if (
            request.method == "OPTIONS"
            or path == "/health"
            or path == "/"
            or path.startswith("/docs")
            or path.startswith("/redoc")
            or path.startswith("/openapi.json")
        ):
            await self.app(scope, receive, send)
            return

        ip = _get_client_ip(request)
        current_minute = int(time.time() // 60)

        # 1. Max upload payload size check for /upload
        if path.startswith("/upload") and request.method in ("POST", "PUT"):
            max_upload_mb = _get_dynamic_setting("max_upload_mb", DEFAULT_MAX_UPLOAD_MB)
            content_length = request.headers.get("content-length")
            if content_length and content_length.isdigit():
                size_mb = int(content_length) / (1024 * 1024)
                if size_mb > max_upload_mb:
                    log_security_event(
                        "upload_size_exceeded",
                        request,
                        {"size_mb": round(size_mb, 2), "max_allowed_mb": max_upload_mb},
                    )
                    response = JSONResponse(
                        status_code=413,
                        content={"detail": f"File payload exceeds maximum limit of {max_upload_mb} MB."},
                    )
                    await response(scope, receive, send)
                    return

        # 2. Determine rate limit dynamically for prefix
        limit = _get_dynamic_setting("rate_limit_global", DEFAULT_LIMITS["global"])
        bucket = "global"

        for prefix, default_limit in DEFAULT_LIMITS.items():
            if prefix != "global" and path.startswith(prefix):
                config_key = f"rate_limit_{prefix.replace('/', '_').strip('_')}"
                limit = _get_dynamic_setting(config_key, default_limit)
                bucket = prefix.replace("/", "_")
                break

        r_client = _get_redis_client()
        concurrency_key = None

        if r_client:
            try:
                # 3. Concurrent Request Limiter for /brain AI endpoints
                if path.startswith("/brain"):
                    max_concurrent = _get_dynamic_setting("max_concurrent_ai_requests", DEFAULT_MAX_CONCURRENT_AI)
                    concurrency_key = f"concurrency:brain:{ip}"
                    active_concurrent = r_client.incr(concurrency_key)
                    if active_concurrent == 1:
                        r_client.expire(concurrency_key, 120)

                    if active_concurrent > max_concurrent:
                        r_client.decr(concurrency_key)
                        log_security_event(
                            "ai_concurrency_limit_exceeded",
                            request,
                            {"active_concurrent": active_concurrent, "max_allowed": max_concurrent},
                        )
                        response = JSONResponse(
                            status_code=429,
                            content={
                                "detail": f"Too many concurrent AI requests. Maximum {max_concurrent} active requests allowed simultaneously."
                            },
                            headers={"Retry-After": "10"},
                        )
                        await response(scope, receive, send)
                        return

                # 4. Standard Sliding-Window Rate Limiter
                rate_key = f"rate_limit:{bucket}:{ip}:{current_minute}"
                count = r_client.incr(rate_key)
                if count == 1:
                    r_client.expire(rate_key, 60)

                if count > limit:
                    log_security_event(
                        "rate_limit_exceeded",
                        request,
                        {"bucket": bucket, "count": count, "limit": limit},
                    )
                    response = JSONResponse(
                        status_code=429,
                        content={
                            "detail": f"Rate limit exceeded. Maximum {limit} requests per minute allowed."
                        },
                        headers={"Retry-After": "60"},
                    )
                    if concurrency_key:
                        r_client.decr(concurrency_key)
                    await response(scope, receive, send)
                    return
            except Exception as e:
                logger.warning(f"Rate limiting check failed: {e}")

        # Execute application logic with concurrency cleanup wrapper
        try:
            await self.app(scope, receive, send)
        finally:
            if concurrency_key and r_client:
                try:
                    r_client.decr(concurrency_key)
                except Exception:
                    pass
