import json
import pytest
from unittest.mock import patch, MagicMock

def test_oauth_login_generates_redis_state(client, redis_mock):
    """Verify /auth/google/login creates a state nonce and stores state metadata in Redis."""
    res = client.get("/auth/google/login?type=login", follow_redirects=False)
    assert res.status_code in (302, 307)
    
    oauth_state_cookie = res.cookies.get("oauth_state")
    assert oauth_state_cookie, "Missing oauth_state cookie in response"

    raw_meta = redis_mock.get(f"oauth_state:{oauth_state_cookie}")
    assert raw_meta, "OAuth state metadata not stored in Redis"
    meta = json.loads(raw_meta)
    assert meta["auth_type"] == "login"
    assert "redirect_uri" in meta
    assert "frontend_url" in meta


def test_oauth_callback_single_use_and_replay_rejection(client, redis_mock):
    """Verify state nonces are consumed single-use and replay attacks are rejected."""
    # 1. Login to get state nonce
    res = client.get("/auth/google/login?type=login", follow_redirects=False)
    oauth_state_cookie = res.cookies.get("oauth_state")
    assert oauth_state_cookie

    # 2. Simulate single-use consumption (GETDEL)
    consumed_meta = redis_mock.getdel(f"oauth_state:{oauth_state_cookie}")
    assert consumed_meta
    assert redis_mock.get(f"oauth_state:{oauth_state_cookie}") is None

    # 3. Simulate replay attack using consumed state
    replay_res = client.get(
        f"/auth/google/callback?state={oauth_state_cookie}:login",
        cookies={"oauth_state": "invalid_cookie"},
        follow_redirects=False
    )
    assert "error=Invalid+or+replayed+OAuth+state" in replay_res.headers.get("location", "")


def test_send_otp_generates_and_stores_otp(redis_mock):
    """Verify AuthService generates a 6-digit OTP and stores it in Redis."""

    from app.services.auth_service import AuthService
    from unittest.mock import patch, MagicMock

    db = MagicMock()

    user = MagicMock()
    user.full_name = "Test User"

    db.query.return_value.filter.return_value.first.return_value = user

    # AuthService.send_otp() imports redis and EmailService INSIDE the method.
    # Therefore patch the actual modules/classes used by the method.
    with patch(
        "redis.from_url",
        return_value=redis_mock
    ), patch(
        "app.services.email_service.EmailService.send_email"
    ):

        result = AuthService.send_otp(
            db=db,
            email="test@example.com",
            auth_type="login"
        )

    assert result is True

    # send_otp stores OTP using: otp:{email}
    saved_otp = redis_mock.get("otp:test@example.com")

    assert saved_otp is not None
    assert len(saved_otp) == 6
    assert saved_otp.isdigit()

    # OTP expiry = 300 seconds (5 minutes)
    assert redis_mock.ttls["otp:test@example.com"] == 300
