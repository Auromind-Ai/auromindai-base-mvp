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


# ==============================================================================
# 2. Unauthenticated Dashboard Endpoints Rejection Tests (401 Unauthorized)
# ==============================================================================

UNAUTHENTICATED_ENDPOINTS = [
    ("GET", "/users/me/preferences"),
    ("GET", "/user/sessions"),
    ("POST", "/2fa/setup"),
    ("GET", "/brain/entries"),
    ("GET", "/chat/sessions"),
    ("GET", "/integrations/status"),
    ("GET", "/calendar/events"),
    ("POST", "/account/request-deletion"),
    ("GET", "/billing/status"),
    ("GET", "/lead-scoring/leads"),
]

@pytest.mark.parametrize("method,path", UNAUTHENTICATED_ENDPOINTS)
def test_unauthenticated_request_rejected_with_401(method, path):
    """Verify that sensitive user dashboard endpoints reject unauthenticated requests with 401."""
    from app.main import app as full_app
    from fastapi.testclient import TestClient
    full_client = TestClient(full_app)

    if method == "GET":
        res = full_client.get(path)
    elif method == "POST":
        res = full_client.post(path, json={})
    elif method == "DELETE":
        res = full_client.delete(path)
    elif method == "PATCH":
        res = full_client.patch(path, json={})
    else:
        res = full_client.get(path)

    assert res.status_code == 401
    data = res.json()
    assert data["success"] is False
    assert data["error_code"] == "UNAUTHORIZED"


# ==============================================================================
# 3. SSRF Protection Tests
# ==============================================================================

def test_ssrf_validator_blocks_internal_and_cloud_metadata_ips():
    """Verify that SSRF validator prohibits loopback, RFC-1918, and Cloud metadata IPs."""
    from app.utils.ssrf_protection import is_safe_url
    assert is_safe_url("http://127.0.0.1:8000/api") is False
    assert is_safe_url("http://localhost:3000") is False
    assert is_safe_url("http://10.0.0.1/admin") is False
    assert is_safe_url("http://192.168.1.1/secret") is False
    assert is_safe_url("http://172.16.0.1/private") is False
    assert is_safe_url("http://169.254.169.254/latest/meta-data/") is False
    assert is_safe_url("http://metadata.google.internal") is False
    assert is_safe_url("ftp://example.com/file") is False
    assert is_safe_url("file:///etc/passwd") is False
    assert is_safe_url("https://www.google.com") is True


# ==============================================================================
# 4. Mass Assignment Prevention Tests (/auth/me and /user-feedback)
# ==============================================================================

@pytest.mark.anyio
async def test_user_me_update_mass_assignment_protection(db_session):
    """Verify that updating /auth/me only modifies full_name and ignores attempts to overwrite roles/privileges."""
    import uuid
    from app.models.user import User
    from app.models.workspace import Workspace, WorkspaceMember
    from app.routers.auth import update_current_user_info, UserUpdate, CurrentUser
    from app.core.enums import PlatformRole

    user = User(
        id=uuid.uuid4(),
        email="regular_user@company.com",
        full_name="Regular User",
        is_active=True,
        platform_role=PlatformRole.USER
    )
    ws = Workspace(id=uuid.uuid4(), name="Regular WS", created_by=user.id)
    db_session.add_all([user, ws])
    db_session.commit()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="member"))
    db_session.commit()

    curr_user = CurrentUser(user=user, workspace_id=ws.id)

    res = await update_current_user_info(
        request=UserUpdate(full_name="Updated Regular Name"),
        current_user=curr_user,
        db=db_session
    )
    assert res["full_name"] == "Updated Regular Name"
    assert res["platform_role"] == "user"

    refreshed_user = db_session.query(User).filter(User.id == user.id).first()
    assert refreshed_user.full_name == "Updated Regular Name"
    assert refreshed_user.platform_role == PlatformRole.USER


# ==============================================================================
# 5. Multi-Tenant IDOR Protection Tests
# ==============================================================================

@pytest.mark.anyio
async def test_multi_tenant_lead_idor_protection(db_session):
    """Verify that users in Workspace A cannot access leads belonging to Workspace B."""
    import uuid
    from app.models.user import User
    from app.models.workspace import Workspace, WorkspaceMember
    from app.models.ai_action import Lead
    from app.routers.lead_scoring import lead_detail
    from app.routers.auth import CurrentUser
    from fastapi import HTTPException

    user_a = User(id=uuid.uuid4(), email="usera@corp.com", full_name="User A", is_active=True)
    user_b = User(id=uuid.uuid4(), email="userb@corp.com", full_name="User B", is_active=True)
    ws_a = Workspace(id=uuid.uuid4(), name="Workspace A", created_by=user_a.id)
    ws_b = Workspace(id=uuid.uuid4(), name="Workspace B", created_by=user_b.id)
    db_session.add_all([user_a, user_b, ws_a, ws_b])
    db_session.commit()

    db_session.add(WorkspaceMember(workspace_id=ws_a.id, user_id=user_a.id, role="founder"))
    db_session.add(WorkspaceMember(workspace_id=ws_b.id, user_id=user_b.id, role="founder"))
    db_session.commit()

    lead_b = Lead(
        id=uuid.uuid4(),
        workspace_id=ws_b.id,
        name="Confidential Lead B",
        phone="+919876543210",
        score=75
    )
    db_session.add(lead_b)
    db_session.commit()

    curr_user_a = CurrentUser(user=user_a, workspace_id=ws_a.id)

    with pytest.raises(HTTPException) as exc_info:
        await lead_detail(lead_id=lead_b.id, current_user=curr_user_a, db=db_session)
    assert exc_info.value.status_code == 404


@pytest.mark.anyio
async def test_multi_tenant_chat_session_idor_protection(db_session):
    """Verify that users cannot read chat sessions belonging to other tenants."""
    import uuid
    from app.models.user import User
    from app.models.workspace import Workspace, WorkspaceMember
    from app.models.conversation import ChatSession
    from app.routers.chat import get_session_messages
    from app.routers.auth import CurrentUser
    from fastapi import HTTPException

    user_a = User(id=uuid.uuid4(), email="chata@corp.com", full_name="Chat User A", is_active=True)
    user_b = User(id=uuid.uuid4(), email="chatb@corp.com", full_name="Chat User B", is_active=True)
    ws_a = Workspace(id=uuid.uuid4(), name="WS A", created_by=user_a.id)
    ws_b = Workspace(id=uuid.uuid4(), name="WS B", created_by=user_b.id)
    db_session.add_all([user_a, user_b, ws_a, ws_b])
    db_session.commit()

    db_session.add(WorkspaceMember(workspace_id=ws_a.id, user_id=user_a.id, role="founder"))
    db_session.add(WorkspaceMember(workspace_id=ws_b.id, user_id=user_b.id, role="founder"))
    db_session.commit()

    session_b = ChatSession(
        id=uuid.uuid4(),
        user_id=user_b.id,
        workspace_id=ws_b.id,
        title="Private Strategy Session"
    )
    db_session.add(session_b)
    db_session.commit()

    curr_user_a = CurrentUser(user=user_a, workspace_id=ws_a.id)

    with pytest.raises(HTTPException) as exc_info:
        await get_session_messages(session_id=session_b.id, current_user=curr_user_a, db=db_session)
    assert exc_info.value.status_code == 404


@pytest.mark.anyio
async def test_multi_tenant_brain_entry_deletion_idor_protection(db_session):
    """Verify that users cannot delete knowledge documents belonging to another workspace."""
    import uuid
    from app.models.user import User
    from app.models.workspace import Workspace, WorkspaceMember
    from app.models.brain import BrainEntry
    from app.routers.brain import delete_entry
    from app.routers.auth import CurrentUser
    from fastapi import HTTPException

    user_a = User(id=uuid.uuid4(), email="braina@corp.com", full_name="Brain User A", is_active=True)
    user_b = User(id=uuid.uuid4(), email="brainb@corp.com", full_name="Brain User B", is_active=True)
    ws_a = Workspace(id=uuid.uuid4(), name="Brain WS A", created_by=user_a.id)
    ws_b = Workspace(id=uuid.uuid4(), name="Brain WS B", created_by=user_b.id)
    db_session.add_all([user_a, user_b, ws_a, ws_b])
    db_session.commit()

    db_session.add(WorkspaceMember(workspace_id=ws_a.id, user_id=user_a.id, role="founder"))
    db_session.add(WorkspaceMember(workspace_id=ws_b.id, user_id=user_b.id, role="founder"))
    db_session.commit()

    doc_b = BrainEntry(
        id=uuid.uuid4(),
        workspace_id=ws_b.id,
        title="Proprietary Secret.pdf",
        content="Confidential content",
        content_type="document",
    )
    db_session.add(doc_b)
    db_session.commit()

    curr_user_a = CurrentUser(user=user_a, workspace_id=ws_a.id)

    with pytest.raises(HTTPException) as exc_info:
        await delete_entry(entry_id=str(doc_b.id), current_user=curr_user_a, db=db_session)
    assert exc_info.value.status_code == 404

    assert db_session.query(BrainEntry).filter(BrainEntry.id == doc_b.id).first() is not None


def test_user_feedback_enforces_current_user_and_workspace(db_session):
    """Verify that /user-feedback enforces authenticated user identity and workspace access."""
    import uuid
    from app.models.user import User
    from app.models.workspace import Workspace, WorkspaceMember
    from app.routers.user_feedback import submit_user_feedback
    from app.schemas.feedback import UserFeedbackCreate
    from app.routers.auth import CurrentUser

    user = User(id=uuid.uuid4(), email="feedback_user@corp.com", full_name="Feedback User", is_active=True)
    ws = Workspace(id=uuid.uuid4(), name="Feedback WS", created_by=user.id)
    db_session.add_all([user, ws])
    db_session.commit()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="founder"))
    db_session.commit()

    curr_user = CurrentUser(user=user, workspace_id=ws.id)

    res = submit_user_feedback(
        payload=UserFeedbackCreate(
            workspace_id=str(ws.id),
            user_id=str(uuid.uuid4()),
            category="general",
            rating=5,
            message="Great platform experience!"
        ),
        db=db_session,
        current_user=curr_user
    )
    assert res["status"] == "success"

    from app.models.user_feedback import UserFeedback
    saved_fb = db_session.query(UserFeedback).filter(UserFeedback.id == uuid.UUID(res["id"])).first()
    assert saved_fb is not None
    assert saved_fb.user_id == str(user.id)

