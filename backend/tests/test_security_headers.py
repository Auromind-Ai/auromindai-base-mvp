import pytest

def test_structured_security_event_logger():
    """Verify log_security_event formats JSON payloads without exception."""
    from app.core.rate_limit import log_security_event
    from fastapi import Request

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/test/audit",
        "headers": [(b"user-agent", b"PytestSecurity/1.0")],
        "client": ("127.0.0.1", 54321),
        "query_string": b""
    }
    req = Request(scope)
    log_security_event("unit_test_security_event", req, {"result": "success"})
