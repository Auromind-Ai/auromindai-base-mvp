import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.notification import Notification
from app.models.push_device import PushDeviceToken
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.services.notifications.expo_push_service import (
    ExpoPushService,
    build_push_data,
    is_valid_expo_push_token,
    resolve_android_channel_id,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db_session):
    user = User(
        id=uuid.uuid4(),
        email="push_user@auromind.ai",
        full_name="Push User",
        is_active=True,
        preferences={},
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_token_validation_and_helpers():
    assert is_valid_expo_push_token("ExponentPushToken[abc123XYZ_-]")
    assert is_valid_expo_push_token("ExpoPushToken[abc123XYZ]")
    assert not is_valid_expo_push_token("fcm-raw-token")
    assert not is_valid_expo_push_token("")
    assert not is_valid_expo_push_token(None)

    assert resolve_android_channel_id("new_message") == "messages"
    assert resolve_android_channel_id("ai_agent_human_escalation") == "messages"
    assert resolve_android_channel_id("security_alert") == "default"

    data = build_push_data(
        notif_type="new_message",
        notification_id="notif-1",
        payload={"conversation_id": "conv-99", "channel": "WhatsApp"},
    )
    assert data == {
        "type": "new_message",
        "notification_id": "notif-1",
        "conversation_id": "conv-99",
        "channel": "whatsapp",
        "route": "/chat/conv-99",
    }


def test_multi_device_register_and_per_device_unregister(db_session, test_user):
    android_tok = "ExponentPushToken[android-device-1]"
    ios_tok = "ExponentPushToken[ios-device-2]"

    ExpoPushService.register_device_token(
        db_session,
        user_id=test_user.id,
        push_token=android_tok,
        platform="android",
        device_name="Pixel 8",
    )
    ExpoPushService.register_device_token(
        db_session,
        user_id=test_user.id,
        push_token=ios_tok,
        platform="ios",
        device_name="iPhone 15",
    )

    tokens = ExpoPushService.get_active_tokens_for_user(db_session, test_user)
    assert set(tokens) == {android_tok, ios_tok}

    # Signing out on Android must keep iOS active
    ExpoPushService.unregister_device_token(
        db_session,
        user_id=test_user.id,
        push_token=android_tok,
    )
    db_session.refresh(test_user)
    remaining = ExpoPushService.get_active_tokens_for_user(db_session, test_user)
    assert remaining == [ios_tok]


def test_send_push_respects_preferences_and_cleans_dead_tokens(db_session, test_user):
    tok1 = "ExponentPushToken[active-device-1]"
    tok2 = "ExponentPushToken[dead-device-2]"
    ExpoPushService.register_device_token(db_session, user_id=test_user.id, push_token=tok1, platform="ios")
    ExpoPushService.register_device_token(db_session, user_id=test_user.id, push_token=tok2, platform="android")

    # Add an unread notification to verify iOS badge count
    db_session.add(
        Notification(
            id=uuid.uuid4(),
            user_id=test_user.id,
            type="new_message",
            category="mentions",
            title="New message",
            message="Hello",
            is_read=False,
        )
    )
    db_session.commit()

    # Muted user -> skipped
    test_user.preferences = {
        **(test_user.preferences or {}),
        "mute_pushes_until": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
    }
    db_session.commit()
    res_muted = ExpoPushService.send_push_to_user(
        db_session,
        user_id=test_user.id,
        title="John · WhatsApp",
        message="Secret body",
        notif_type="new_message",
    )
    assert res_muted["skipped"] == "muted"

    # Unmute & disable message preview -> body masked, dead token deactivated
    test_user.preferences = {
        **(test_user.preferences or {}),
        "mute_pushes_until": None,
        "show_message_preview": False,
    }
    db_session.commit()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b"{}"
    mock_resp.json.return_value = {
        "data": [
            {"status": "ok", "id": "ticket-1"},
            {"status": "error", "details": {"error": "DeviceNotRegistered"}},
        ]
    }

    with patch("app.services.notifications.expo_push_service.httpx.post", return_value=mock_resp) as mock_post:
        res = ExpoPushService.send_push_to_user(
            db_session,
            user_id=test_user.id,
            title="John · WhatsApp",
            message="Confidential order #42",
            notif_type="new_message",
            data={"conversation_id": "conv-123", "channel": "whatsapp"},
        )

    assert res["sent"] == 1
    assert res["errors"] == 1
    sent_payload = mock_post.call_args.kwargs["json"]
    assert len(sent_payload) == 2
    assert sent_payload[0]["body"] == "You have a new message."
    assert sent_payload[0]["channelId"] == "messages"
    assert sent_payload[0]["mutableContent"] is True
    assert sent_payload[0]["badge"] >= 1
    assert sent_payload[0]["data"]["conversation_id"] == "conv-123"
    assert sent_payload[0]["data"]["route"] == "/chat/conv-123"

    # tok2 must now be deactivated
    active_after = ExpoPushService.get_active_tokens_for_user(db_session, test_user)
    assert active_after == [tok1]


def test_workspace_push_filters_by_permission(db_session, test_user):
    ws = Workspace(id=uuid.uuid4(), name="Acme", created_by=test_user.id)
    db_session.add(ws)
    db_session.add(
        WorkspaceMember(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            user_id=test_user.id,
            role="owner",
            is_active=True,
        )
    )
    ExpoPushService.register_device_token(
        db_session,
        user_id=test_user.id,
        push_token="ExponentPushToken[owner-phone]",
        platform="android",
    )
    db_session.commit()

    with patch.object(ExpoPushService, "enqueue_user_push") as mock_enq:
        count = ExpoPushService.enqueue_workspace_push(
            db_session,
            workspace_id=ws.id,
            title="Customer · WhatsApp",
            message="Hi!",
            notif_type="new_message",
            data={"conversation_id": "conv-abc"},
            required_permission="inbox.conversations",
        )

    assert count == 1
    mock_enq.assert_called_once()
