import pytest
import time
from decimal import Decimal
from unittest.mock import MagicMock, patch
from app.services.marketing.audience_service import AudienceService
from app.services.marketing.whatsapp_tier_service import (
    WhatsAppTierService,
    PORTFOLIO_TIER_LIMITS
)
from app.services.marketing.outbound_gateway import (
    WhatsAppOutboundGateway,
    ORBION_SAFE_DISPATCH_MPS,
    META_THEORETICAL_MAX_MPS
)
from app.workers.campaign_worker import (
    is_inside_quiet_hours,
    evaluate_circuit_breaker
)
from app.models.campaign import Campaign


class TestAudienceService:
    def test_normalize_phone_valid(self):
        assert AudienceService.normalize_phone("9876543210", default_country_code="91") == "+919876543210"
        assert AudienceService.normalize_phone("+91 98765-43210") == "+919876543210"
        assert AudienceService.normalize_phone("09876543210", default_country_code="91") == "+919876543210"
        assert AudienceService.normalize_phone("+1 (555) 123-4567") == "+15551234567"

    def test_normalize_phone_invalid(self):
        assert AudienceService.normalize_phone("") is None
        assert AudienceService.normalize_phone("abc") is None
        assert AudienceService.normalize_phone("123") is None  # Too short

    def test_parse_csv_contacts(self):
        csv_data = b"""Name,Phone,Email,Coupon,City
Arjun,9876543210,arjun@example.com,DIWALI50,Chennai
Priya,9123456780,priya@example.com,DIWALI50,Madurai
Duplicate,9876543210,dup@example.com,DIWALI50,Chennai
Invalid,1234,bad@example.com,,Trichy
"""
        result = AudienceService.parse_csv_contacts(csv_data, default_country_code="91")
        assert result["valid_count"] == 2
        assert result["invalid_count"] == 2
        assert len(result["recipients"]) == 2

        first = result["recipients"][0]
        assert first["normalized_phone"] == "+919876543210"
        assert first["recipient_name"] == "Arjun"
        assert first["variables"]["coupon"] == "DIWALI50"
        assert first["variables"]["city"] == "Chennai"


class TestWhatsAppTierService:
    def test_modern_tier_mapping(self):
        assert PORTFOLIO_TIER_LIMITS["250"] == 250
        assert PORTFOLIO_TIER_LIMITS["2000"] == 2000
        assert PORTFOLIO_TIER_LIMITS["TIER_2K"] == 2000
        assert PORTFOLIO_TIER_LIMITS["TIER_1K"] == 2000  # Legacy mapped to modern 2K
        assert PORTFOLIO_TIER_LIMITS["10000"] == 10000
        assert PORTFOLIO_TIER_LIMITS["100000"] == 100000
        assert PORTFOLIO_TIER_LIMITS["UNLIMITED"] == float("inf")

    def test_check_and_register_recipient_allowed(self):
        mock_redis = MagicMock()
        mock_redis.eval.return_value = [1, 0]  # [allowed, wake_up_ts]

        allowed, wake_up = WhatsAppTierService.check_and_register_recipient(
            redis_client=mock_redis,
            portfolio_id="test_portfolio",
            recipient_normalized_phone="+919876543210",
            portfolio_tier_limit=2000
        )
        assert allowed is True
        assert wake_up == 0

    def test_check_and_register_recipient_quota_hit(self):
        mock_redis = MagicMock()
        mock_redis.eval.return_value = [0, 1726700000]  # [blocked, exact wake_up_ts]

        allowed, wake_up = WhatsAppTierService.check_and_register_recipient(
            redis_client=mock_redis,
            portfolio_id="test_portfolio",
            recipient_normalized_phone="+919876543210",
            portfolio_tier_limit=2000
        )
        assert allowed is False
        assert wake_up == 1726700000


class TestThroughputGateway:
    def test_throughput_constants(self):
        assert META_THEORETICAL_MAX_MPS == 80
        assert ORBION_SAFE_DISPATCH_MPS == 40  # 50% safety buffer

    @patch("requests.Session.post")
    def test_send_meta_message_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = b'{"messages": [{"id": "wamid.HBgTEST"}]}'
        mock_resp.json.return_value = {"messages": [{"id": "wamid.HBgTEST"}]}
        mock_post.return_value = mock_resp

        res = WhatsAppOutboundGateway.send_meta_message(
            access_token="fake_token",
            phone_number_id="12345",
            payload={"to": "919876543210"},
            redis_client=None,
            target_mps=40
        )
        assert res["success"] is True
        assert res["status"] == "accepted"
        assert res["wamid"] == "wamid.HBgTEST"

    @patch("requests.Session.post")
    def test_send_meta_message_error_131049_marketing_cap(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.content = b'{"error": {"code": 131049, "message": "Per-user marketing template limit hit"}}'
        mock_resp.json.return_value = {"error": {"code": 131049, "message": "Per-user marketing template limit hit"}}
        mock_post.return_value = mock_resp

        res = WhatsAppOutboundGateway.send_meta_message(
            access_token="fake_token",
            phone_number_id="12345",
            payload={"to": "919876543210"},
            redis_client=None,
            target_mps=40
        )
        assert res["success"] is False
        assert res["status"] == "skipped_marketing_frequency_limit"
        assert res.get("is_marketing_frequency_limit") is True


class TestCircuitBreakerAndQuietHours:
    def test_circuit_breaker_under_minimum_sample_size(self):
        campaign = Campaign(
            accepted_count=5,
            failed_count=2,  # 2 / 7 = 28.5% failure, but only 7 attempts!
            failure_rate_threshold=10.0
        )
        mock_db = MagicMock()
        # Should NOT trip because total < 50
        tripped = evaluate_circuit_breaker(campaign, mock_db)
        assert tripped is False

    def test_circuit_breaker_trips_above_threshold(self):
        campaign = Campaign(
            accepted_count=45,
            failed_count=15,  # 15 / 60 = 25% failure rate, over 50 attempts!
            failure_rate_threshold=10.0
        )
        mock_db = MagicMock()
        tripped = evaluate_circuit_breaker(campaign, mock_db)
        assert tripped is True
        assert campaign.status == "paused"
        assert "HIGH_FAILURE_RATE" in campaign.paused_reason

    def test_quiet_hours_evaluation(self):
        # 23:00 is inside 22:00-08:00
        with patch("app.workers.campaign_worker.datetime") as mock_dt:
            import pytz
            from datetime import time as dt_time, datetime as real_dt
            mock_now = MagicMock()
            mock_now.time.return_value = dt_time(23, 30)
            mock_dt.now.return_value = mock_now

            inside = is_inside_quiet_hours("Asia/Kolkata", start_str="22:00", end_str="08:00")
            assert inside is True


class TestCampaignEscrow:
    def test_reserve_escrow_success(self):
        from app.services.marketing.campaign_service import CampaignService
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.rowcount = 1  # 1 row updated -> atomic lock acquired
        mock_db.execute.return_value = mock_result

        import uuid
        ws_id = uuid.uuid4()
        success = CampaignService.reserve_campaign_escrow(
            db=mock_db,
            workspace_id=ws_id,
            estimated_cost=Decimal("800.00")
        )
        assert success is True
        mock_db.commit.assert_called_once()

    def test_reserve_escrow_insufficient_balance_raises_error(self):
        from app.services.marketing.campaign_service import CampaignService
        from app.services.wcc_service import InsufficientWCCBalanceError
        from app.models.wcc import WCCWallet

        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.rowcount = 0  # 0 rows updated -> insufficient available balance!
        mock_db.execute.return_value = mock_result

        mock_wallet = WCCWallet(balance=Decimal("500.00"), held_balance=Decimal("0.00"))
        mock_db.query.return_value.filter.return_value.first.return_value = mock_wallet

        import uuid
        ws_id = uuid.uuid4()
        with pytest.raises(InsufficientWCCBalanceError):
            CampaignService.reserve_campaign_escrow(
                db=mock_db,
                workspace_id=ws_id,
                estimated_cost=Decimal("800.00")
            )
