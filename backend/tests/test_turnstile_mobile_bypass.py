import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.services.turnstile_service import verify_turnstile_token, is_mobile_client_request, CLOUDFLARE_TEST_RESPONSE_TOKEN
from app.core.config import settings


def create_mock_request(headers=None):
    req = MagicMock()
    req.headers = headers or {}
    return req


@pytest.mark.asyncio
async def test_mobile_header_bypass_ios():
    req = create_mock_request({"x-client-platform": "ios"})
    result = await verify_turnstile_token("1x00000000000000000000AA", remote_ip="127.0.0.1", request=req)
    assert result is True


@pytest.mark.asyncio
async def test_mobile_header_bypass_android():
    req = create_mock_request({"x-client-platform": "android"})
    result = await verify_turnstile_token("1x00000000000000000000AA", remote_ip="127.0.0.1", request=req)
    assert result is True


@pytest.mark.asyncio
async def test_mobile_user_agent_bypass():
    req = create_mock_request({"user-agent": "okhttp/4.9.2 (Linux; Android 14)"})
    result = await verify_turnstile_token(CLOUDFLARE_TEST_RESPONSE_TOKEN, remote_ip="127.0.0.1", request=req)
    assert result is True


@pytest.mark.asyncio
async def test_mobile_secret_key_validation(monkeypatch):
    monkeypatch.setattr(settings, "MOBILE_API_SECRET", "super-secret-mobile-key-123")

    # 1. Missing secret key -> raises 401
    req_invalid = create_mock_request({"x-client-platform": "android", "x-mobile-api-key": "wrong-key"})
    with pytest.raises(HTTPException) as exc_info:
        await verify_turnstile_token("dummy", remote_ip="127.0.0.1", request=req_invalid)
    assert exc_info.value.status_code == 401

    # 2. Matching secret key -> succeeds
    req_valid = create_mock_request({"x-client-platform": "android", "x-mobile-api-key": "super-secret-mobile-key-123"})
    result = await verify_turnstile_token("dummy", remote_ip="127.0.0.1", request=req_valid)
    assert result is True


@pytest.mark.asyncio
async def test_web_client_without_token_raises_400():
    req = create_mock_request({"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with pytest.raises(HTTPException) as exc_info:
        await verify_turnstile_token("", remote_ip="127.0.0.1", request=req)
    assert exc_info.value.status_code == 400
