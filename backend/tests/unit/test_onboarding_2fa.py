import uuid
from unittest.mock import MagicMock, patch
import pytest
from app.services.onboarding_service import OnboardingService
from app.models.workspace import Workspace


def test_check_2fa_already_enabled_preserves_status():
    """If workspace already has 2FA enabled, Meta permission errors should never downgrade or show error."""
    db = MagicMock()
    ws_id = uuid.uuid4()
    workspace = MagicMock(spec=Workspace)
    workspace.id = ws_id
    workspace.meta_2fa_enabled = True
    workspace.meta_business_id = "biz_123"
    workspace.meta_access_token = "user_token_123"
    workspace.meta_waba_id = "waba_123"
    workspace.meta_phone_number_id = "phone_123"
    workspace.meta_display_phone = "+1234567890"
    workspace.meta_business_verification_status = "verified"
    workspace.meta_onboarding_completed_at = None
    workspace.meta_onboarding_dismissed = False

    db.query.return_value.filter.return_value.first.return_value = workspace

    with patch("requests.get") as mock_get, \
         patch("app.services.config_service.config_service.get", return_value=None):
        # Simulate Meta returning (#200) Requires business_management permission
        mock_res = MagicMock()
        mock_res.json.return_value = {
            "error": {
                "message": "(#200) Requires business_management permission to manage the object",
                "type": "OAuthException",
                "code": 200,
                "error_subcode": 2018001
            }
        }
        mock_get.return_value = mock_res

        res = OnboardingService.check_2fa_status(db, str(ws_id), manual_confirm=False)

        assert res["two_factor_enabled"] is True
        assert res["meta_verified"] is True
        assert "(#200)" not in (res.get("meta_message") or "")
        assert "business_management" not in (res.get("meta_message") or "")


def test_check_2fa_handles_business_management_permission_gracefully():
    """When user enabled 2FA in Meta Business Suite, Meta's scope limitation on Embedded Signup tokens should verify 2FA."""
    db = MagicMock()
    ws_id = uuid.uuid4()
    workspace = MagicMock(spec=Workspace)
    workspace.id = ws_id
    workspace.meta_2fa_enabled = False
    workspace.meta_business_id = "biz_123"
    workspace.meta_access_token = "user_token_123"
    workspace.meta_waba_id = "waba_123"
    workspace.meta_phone_number_id = "phone_123"
    workspace.meta_display_phone = "+1234567890"
    workspace.meta_business_verification_status = "not_verified"
    workspace.meta_onboarding_completed_at = None
    workspace.meta_onboarding_dismissed = False

    db.query.return_value.filter.return_value.first.return_value = workspace

    with patch("requests.get") as mock_get, \
         patch("app.services.config_service.config_service.get", return_value=None):
        mock_res = MagicMock()
        mock_res.json.return_value = {
            "error": {
                "message": "(#200) Requires business_management permission to manage the object",
                "type": "OAuthException",
                "code": 200,
            }
        }
        mock_get.return_value = mock_res

        res = OnboardingService.check_2fa_status(db, str(ws_id), manual_confirm=False)

        assert workspace.meta_2fa_enabled is True
        assert res["two_factor_enabled"] is True
        assert res["meta_verified"] is True
        assert "verified" in res["meta_message"].lower()


def test_check_2fa_manual_confirm():
    """Manual confirm explicitly activates 2FA for the workspace."""
    db = MagicMock()
    ws_id = uuid.uuid4()
    workspace = MagicMock(spec=Workspace)
    workspace.id = ws_id
    workspace.meta_2fa_enabled = False
    workspace.meta_business_id = "biz_123"
    workspace.meta_access_token = "user_token_123"
    workspace.meta_waba_id = "waba_123"
    workspace.meta_phone_number_id = "phone_123"
    workspace.meta_display_phone = "+1234567890"
    workspace.meta_business_verification_status = "not_verified"
    workspace.meta_onboarding_completed_at = None
    workspace.meta_onboarding_dismissed = False

    db.query.return_value.filter.return_value.first.return_value = workspace

    with patch("requests.get") as mock_get, \
         patch("app.services.config_service.config_service.get", return_value=None):
        mock_res = MagicMock()
        mock_res.json.return_value = {
            "error": {"message": "Requires business_management permission", "code": 200}
        }
        mock_get.return_value = mock_res

        res = OnboardingService.check_2fa_status(db, str(ws_id), manual_confirm=True)

        assert workspace.meta_2fa_enabled is True
        assert res["two_factor_enabled"] is True
        assert res["meta_verified"] is True


def test_check_2fa_meta_live_type_success():
    """When Meta returns two_factor_type active, it reflects the live Meta label."""
    db = MagicMock()
    ws_id = uuid.uuid4()
    workspace = MagicMock(spec=Workspace)
    workspace.id = ws_id
    workspace.meta_2fa_enabled = False
    workspace.meta_business_id = "biz_123"
    workspace.meta_access_token = "user_token_123"
    workspace.meta_waba_id = "waba_123"
    workspace.meta_phone_number_id = "phone_123"
    workspace.meta_display_phone = "+1234567890"
    workspace.meta_business_verification_status = "not_verified"
    workspace.meta_onboarding_completed_at = None
    workspace.meta_onboarding_dismissed = False

    db.query.return_value.filter.return_value.first.return_value = workspace

    with patch("requests.get") as mock_get, \
         patch("app.services.config_service.config_service.get", return_value="sys_token_abc"):
        mock_res = MagicMock()
        mock_res.json.return_value = {
            "two_factor_type": "admin_only"
        }
        mock_get.return_value = mock_res

        res = OnboardingService.check_2fa_status(db, str(ws_id), manual_confirm=False)

        assert workspace.meta_2fa_enabled is True
        assert res["two_factor_enabled"] is True
        assert res["meta_verified"] is True
        assert "Admins only" in res["meta_message"]
