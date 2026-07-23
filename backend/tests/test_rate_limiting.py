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
