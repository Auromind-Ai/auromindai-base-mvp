import uuid
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException
from app.services.inbox.channel_connection_service import ChannelConnectionService
from app.routers.inbox_chennal.instagram import get_instagram_auth_url
from app.models.workspace import Workspace


def test_instagram_business_login_connect_success():
    db = MagicMock()
    ws_id = uuid.uuid4()
    workspace = MagicMock(spec=Workspace)
    workspace.id = ws_id
    workspace.meta_ig_id = None
    workspace.meta_business_id = None
    workspace.meta_access_token = None

    query_mock = db.query.return_value
    filter_mock = query_mock.filter.return_value
    filter_mock.first.side_effect = [None, workspace]

    with patch("app.services.config_service.config_service.get") as mock_cfg, \
         patch("requests.post") as mock_post, \
         patch("requests.get") as mock_get:

        mock_cfg.side_effect = lambda k: {
            "ig_app_id": "990851527207522",
            "ig_app_secret": "test_secret",
            "ig_redirect_uri": "https://example.com/instagram/callback",
        }.get(k)

        mock_post_token = MagicMock()
        mock_post_token.json.return_value = {
            "access_token": "short_lived_ig_token",
            "user_id": 178414001234567,
        }

        mock_post_sub = MagicMock()
        mock_post_sub.json.return_value = {"success": True}

        mock_post.side_effect = [mock_post_token, mock_post_sub]

        mock_get_long = MagicMock()
        mock_get_long.json.return_value = {
            "access_token": "long_lived_ig_token",
            "token_type": "bearer",
            "expires_in": 5184000,
        }

        mock_get_me = MagicMock()
        mock_get_me.json.return_value = {
            "id": "178414001234567",
            "username": "my_business_brand",
            "name": "My Business Brand",
            "account_type": "BUSINESS",
        }

        mock_get.side_effect = [mock_get_long, mock_get_me]

        data = {
            "code": "test_auth_code_from_ig#_",
            "workspace_id": str(ws_id),
            "redirect_uri": "https://example.com/instagram/callback",
        }

        res = ChannelConnectionService.connect_instagram(db, data)

        assert res["status"] == "connected"
        assert res["ig_id"] == "178414001234567"
        assert res["username"] == "my_business_brand"

        # Verify code had #_ stripped
        token_call_data = mock_post.call_args_list[0][1]["data"]
        assert token_call_data["code"] == "test_auth_code_from_ig"
        assert token_call_data["client_id"] == "990851527207522"

        # Verify workspace was updated
        assert workspace.meta_access_token == "long_lived_ig_token"
        assert workspace.meta_ig_id == "178414001234567"
        assert workspace.meta_business_id == "178414001234567"
        db.commit.assert_called_once()


def test_instagram_business_login_duplicate_check():
    db = MagicMock()
    ws_id = uuid.uuid4()
    other_ws = MagicMock(spec=Workspace)
    other_ws.id = uuid.uuid4()
    other_ws.meta_ig_id = "178414001234567"

    query_mock = db.query.return_value
    filter_mock = query_mock.filter.return_value
    filter_mock.first.return_value = other_ws

    with patch("app.services.config_service.config_service.get") as mock_cfg, \
         patch("requests.post") as mock_post, \
         patch("requests.get") as mock_get:

        mock_cfg.side_effect = lambda k: {
            "ig_app_id": "990851527207522",
            "ig_app_secret": "test_secret",
            "ig_redirect_uri": "https://example.com/instagram/callback",
        }.get(k)

        mock_post.return_value.json.return_value = {
            "access_token": "token",
            "user_id": 178414001234567,
        }

        mock_get_long = MagicMock()
        mock_get_long.json.return_value = {"access_token": "token"}
        mock_get_me = MagicMock()
        mock_get_me.json.return_value = {"id": "178414001234567", "username": "duplicate_brand"}
        mock_get.side_effect = [mock_get_long, mock_get_me]

        data = {
            "code": "test_code",
            "workspace_id": str(ws_id),
        }

        with pytest.raises(HTTPException) as exc_info:
            ChannelConnectionService.connect_instagram(db, data)

        assert exc_info.value.status_code == 400
        assert "already connected" in exc_info.value.detail


def test_get_instagram_auth_url():
    db = MagicMock()
    ws_id = str(uuid.uuid4())
    user = MagicMock()

    with patch("app.routers.inbox_chennal.instagram.verify_workspace_access", return_value=ws_id), \
         patch("app.routers.inbox_chennal.instagram.config_service.get") as mock_cfg:
        mock_cfg.side_effect = lambda k: {
            "ig_app_id": "990851527207522",
            "ig_redirect_uri": "https://myapp.com/instagram/callback",
        }.get(k)

        res = get_instagram_auth_url(
            workspace_id=ws_id,
            redirect_uri=None,
            db=db,
            current_user=user,
        )

        assert "url" in res
        url = res["url"]
        assert url.startswith("https://www.instagram.com/oauth/authorize?")
        assert "enable_fb_login=0" in url
        assert "force_authentication=1" in url
        assert "client_id=990851527207522" in url
        assert "instagram_business_basic" in url
        assert "instagram_business_manage_messages" in url
        assert "instagram_business_manage_comments" in url
