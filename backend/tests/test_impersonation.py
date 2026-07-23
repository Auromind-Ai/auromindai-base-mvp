import json
import secrets
import pytest
from app.utils.auth import create_access_token

def test_impersonation_session_active_and_revocation(client, redis_mock):
    """Verify impersonation tokens are tracked in Redis and revoked instantly."""
    imp_id = secrets.token_hex(16)

    # 1. Create active impersonation session in Redis
    redis_mock.setex(
        f"impersonation:{imp_id}",
        900,
        json.dumps({"status": "active", "admin_id": "test_admin", "target_user_id": "test_user"})
    )

    # Verify active session key
    assert redis_mock.get(f"impersonation:{imp_id}") is not None

    # 2. Simulate revocation (deleting key)
    redis_mock.delete(f"impersonation:{imp_id}")
    assert redis_mock.get(f"impersonation:{imp_id}") is None

    # 3. Request with revoked impersonation token should return 401
    token = create_access_token({
        "sub": "00000000-0000-0000-0000-000000000000",
        "impersonated": True,
        "impersonation_id": imp_id
    })

    res = client.get("/auth/me", cookies={"auth_token": token})
    assert res.status_code == 401
