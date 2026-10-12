import uuid
from unittest.mock import MagicMock, patch
import pytest
from app.services.inbox.channel_connection_service import ChannelConnectionService
from app.models.workspace import Workspace


def test_whatsapp_connect_uses_meta_app_id_not_ig_app_id():
    db = MagicMock()
    ws_id = uuid.uuid4()
    workspace = MagicMock(spec=Workspace)
    workspace.id = ws_id
    workspace.meta_access_token = None
    workspace.meta_phone_number_id = None

    query_mock = db.query.return_value
    filter_mock = query_mock.filter.return_value
    filter_mock.first.side_effect = [None, workspace]

    with patch("app.services.config_service.config_service.get") as mock_cfg, \
         patch("requests.get") as mock_get, \
         patch("requests.post") as mock_post:

        # Simulate scenario where ig_app_id is set to Instagram App ID,
        # and meta_app_id is set to Facebook/Meta App ID
        mock_cfg.side_effect = lambda k: {
            "meta_app_id": "990851527207522",
            "meta_app_secret": "meta_secret_123",
            "ig_app_id": "971055732363849",
            "ig_app_secret": "ig_secret_456",
        }.get(k)

        # Token exchange response
        mock_token_res = MagicMock()
        mock_token_res.json.return_value = {"access_token": "mock_whatsapp_token"}

        # debug_token response
        mock_debug_res = MagicMock()
        mock_debug_res.json.return_value = {
            "data": {
                "granular_scopes": [
                    {
                        "scope": "whatsapp_business_management",
                        "target_ids": ["waba_12345"]
                    }
                ]
            }
        }

        # Assigned WABAs response
        mock_assigned_res = MagicMock()
        mock_assigned_res.json.return_value = {"data": []}

        # Businesses response
        mock_biz_res = MagicMock()
        mock_biz_res.json.return_value = {"data": []}

        # Phone numbers response
        mock_phone_res = MagicMock()
        mock_phone_res.json.return_value = {
            "data": [
                {
                    "id": "phone_id_999",
                    "display_phone_number": "+919876543210",
                    "platform_type": "CLOUD_API",
                    "quality_rating": "GREEN",
                    "code_verification_status": "VERIFIED",
                }
            ]
        }

        # WABA details response
        mock_waba_res = MagicMock()
        mock_waba_res.json.return_value = {"owner_business_info": {"id": "biz_777"}}

        mock_get.side_effect = [
            mock_token_res,
            mock_debug_res,
            mock_assigned_res,
            mock_biz_res,
            mock_phone_res,
            mock_waba_res,
        ]

        # Webhook subscribed_apps response & register response
        mock_sub_res = MagicMock()
        mock_sub_res.status_code = 200
        mock_sub_res.json.return_value = {"success": True}
        mock_post.return_value = mock_sub_res

        data = {
            "code": "test_oauth_code",
            "workspace_id": str(ws_id),
        }

        result = ChannelConnectionService.connect_meta_whatsapp(db, data)

        assert result["status"] == "connected"
        assert result["waba_id"] == "waba_12345"
        assert result["phone_number_id"] == "phone_id_999"
        assert result["display_number"] == "+919876543210"

        # Crucial check: verify that client_id used for token exchange was META_APP_ID (990851527207522)
        # and NOT IG_APP_ID (971055732363849)!
        token_exchange_call = mock_get.call_args_list[0]
        params_used = token_exchange_call[1]["params"]
        assert params_used["client_id"] == "990851527207522"
        assert params_used["client_secret"] == "meta_secret_123"
        assert params_used["client_id"] != "971055732363849"
