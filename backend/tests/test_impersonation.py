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


def test_impersonation_db_fallback_validation(client, redis_mock, mock_db_session):
    """Verify DB fallback validation accepts valid used sessions if not expired."""
    from unittest.mock import MagicMock
    from datetime import datetime, timezone, timedelta
    from app.models.impersonation import ImpersonationSession
    from app.models.user import User

    imp_id = secrets.token_hex(16)
    user_id = "00000000-0000-0000-0000-000000000000"

    mock_session = MagicMock(spec=ImpersonationSession)
    mock_session.session_id = imp_id
    mock_session.used = True
    mock_session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    mock_user = MagicMock(spec=User)
    mock_user.id = user_id
    mock_user.email = "impersonated@example.com"
    mock_user.full_name = "Impersonated User"
    mock_user.is_active = True
    mock_user.platform_role = None
    mock_user.role = "user"

    def query_side_effect(model):
        q = MagicMock()
        if model == ImpersonationSession:
            q.filter.return_value.first.return_value = mock_session
        elif model == User:
            q.filter.return_value.first.return_value = mock_user
        else:
            q.filter.return_value.first.return_value = None
            q.filter.return_value.all.return_value = []
        return q

    mock_db_session.query.side_effect = query_side_effect

    token = create_access_token({
        "sub": user_id,
        "impersonated": True,
        "impersonation_id": imp_id
    })

    # Ensure Redis key is empty so it forces DB fallback
    redis_mock.delete(f"impersonation:{imp_id}")

    # Should fall back to DB, see used=True and non-expired expires_at
    res = client.get("/auth/me", cookies={"auth_token": token})
    print("STATUS:", res.status_code, "BODY:", res.text)
    assert res.status_code == 200
    assert res.json()["email"] == "impersonated@example.com"
    assert res.json()["impersonated"] is True

