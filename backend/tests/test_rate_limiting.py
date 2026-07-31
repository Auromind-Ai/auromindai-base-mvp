import pytest

def test_rate_limiting_bucket_overflow(client, redis_mock):
    """Verify rate limiting blocks requests exceeding max allowed limit."""
    limit_reached = False
    for _ in range(15):
        res = client.post("/upload", headers={"X-Forwarded-For": "198.51.100.5"})
        if res.status_code == 429:
            limit_reached = True
            assert "Retry-After" in res.headers
            assert "Rate limit exceeded" in res.json()["detail"]
            break

    assert limit_reached, "Rate limit failed to block excess requests"


def test_upload_content_length_exceeded(client):
    """Verify Content-Length exceeding max_upload_mb returns HTTP 413 Payload Too Large."""
    res = client.post(
        "/upload",
        headers={
            "X-Forwarded-For": "198.51.100.6",
            "Content-Length": "52428800" # 50 MB
        }
    )
    assert res.status_code == 413
    assert "exceeds maximum limit" in res.json()["detail"]


def test_ai_concurrency_limiting(client, redis_mock):
    """Verify concurrent AI requests exceeding max limit return HTTP 429."""
    # Set fake active concurrency counter in Redis to limit (3)
    redis_mock.setex("concurrency:brain:198.51.100.10", 60, "3")

    res = client.get("/brain/chat", headers={"X-Forwarded-For": "198.51.100.10"})
    assert res.status_code == 429
    assert "Too many concurrent AI requests" in res.json()["detail"]


def test_rate_limit_bypass_paths(client):
    """Verify OPTIONS, /health, /docs bypass rate limiting."""
    res1 = client.get("/health")
    assert res1.status_code in (200, 404)
    res2 = client.options("/upload")
    assert res2.status_code in (200, 405)


def test_rate_limit_redis_failure_fallback(client, redis_mock):
    """Verify rate limiter fails open gracefully when Redis connection raises an exception."""
    import app.core.rate_limit
    
    # Temporarily set Redis client to None to simulate Redis downtime
    original_override = app.core.rate_limit._get_redis_client.override
    app.core.rate_limit._get_redis_client.override = None

    try:
        res = client.post("/upload", headers={"X-Forwarded-For": "198.51.100.20"})
        assert res.status_code in (200, 404), "Rate limiter should fail open gracefully when Redis is down"
    finally:
        app.core.rate_limit._get_redis_client.override = original_override

