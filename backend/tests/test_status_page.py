import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.status_page import (
    ServiceHealthCheck,
    ServiceDailyUptime,
    Incident,
    IncidentUpdate,
    StatusSubscriber,
    StatusPageConfig,
)
from app.services.status_page_service import (
    StatusPageService,
    MONITORED_SERVICES,
    SERVICE_KEY_MAP,
)


@pytest.fixture(scope="module")
def test_db():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        StatusPageService.ensure_baseline_data_seeded(db)
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


# ============================================================================
# 1. Monitored Services Specification
# ============================================================================
def test_strictly_four_monitored_services():
    """Verify only and exactly the 4 required services are defined."""
    assert len(MONITORED_SERVICES) == 4
    keys = [s["key"] for s in MONITORED_SERVICES]
    assert keys == ["dashboard", "meta_api", "backend", "ai_services"]
    assert "whatsapp" not in keys
    assert "instagram" not in keys
    assert "database" not in keys


# ============================================================================
# 2. Individual Probes Testing
# ============================================================================
@pytest.mark.asyncio
async def test_probe_dashboard_success():
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_get.return_value = mock_resp

        result = await StatusPageService.probe_dashboard()
        assert result["is_healthy"] is True
        assert result["status_code"] == 200
        assert "response_time_ms" in result
        assert result["response_time_ms"] >= 0


@pytest.mark.asyncio
async def test_probe_dashboard_failure():
    with patch("httpx.AsyncClient.get", side_effect=Exception("Connection refused")):
        result = await StatusPageService.probe_dashboard()
        assert result["is_healthy"] is False
        assert result["status_code"] == 503
        assert result["error_message"] is not None


@pytest.mark.asyncio
async def test_probe_meta_api_token_isolation():
    """
    Requirement 8: Meta API failures caused by individual customer access tokens
    should NOT automatically be classified as a global Meta outage.
    HTTP 200, 400, 401, 403 must be treated as healthy Meta connectivity.
    """
    for code in (200, 400, 401, 403):
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = code
            mock_get.return_value = mock_resp

            result = await StatusPageService.probe_meta_api()
            assert result["is_healthy"] is True, f"HTTP {code} should be healthy for Meta Graph API"


@pytest.mark.asyncio
async def test_probe_meta_api_5xx_outage():
    """5xx codes from Meta Graph API must be classified as outage."""
    for code in (500, 502, 503):
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = code
            mock_get.return_value = mock_resp

            result = await StatusPageService.probe_meta_api()
            assert result["is_healthy"] is False, f"HTTP {code} should be outage for Meta Graph API"


@pytest.mark.asyncio
async def test_probe_backend_services():
    result = await StatusPageService.probe_backend_services()
    assert "is_healthy" in result
    assert "response_time_ms" in result
    assert isinstance(result["response_time_ms"], float)


@pytest.mark.asyncio
async def test_probe_ai_services_gateway():
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_get.return_value = mock_resp

        result = await StatusPageService.probe_ai_services()
        assert result["is_healthy"] is True
        assert result["status_code"] == 200
        assert "response_time_ms" in result


# ============================================================================
# 3. Incident Lifecycle: Auto-Detect, Duplicate Prevention, and Auto-Recovery
# ============================================================================
def test_incident_lifecycle_auto_detect_and_duplicate_prevention(test_db):
    """
    Simulates consecutive failures:
    - 1st & 2nd fail -> No incident.
    - 3rd fail (threshold met) -> Incident auto-created.
    - 4th fail -> Duplicate prevention: no extra incident created!
    """
    config = StatusPageService.get_or_create_config(test_db)
    config.failure_threshold = 3
    config.recovery_threshold = 2
    test_db.commit()

    service_key = "dashboard"
    service_name = SERVICE_KEY_MAP[service_key]["name"]
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    daily = ServiceDailyUptime(service_key=service_key, date=today_str, total_checks=0, successful_checks=0)
    test_db.add(daily)
    test_db.commit()

    # Clean prior incidents
    test_db.query(Incident).filter(Incident.service_key == service_key).delete()
    test_db.query(ServiceHealthCheck).filter(ServiceHealthCheck.service_key == service_key).delete()
    test_db.commit()

    t0 = datetime.now(timezone.utc) - timedelta(minutes=5)

    # Check 1: Fail
    c1 = ServiceHealthCheck(service_key=service_key, service_name=service_name, is_healthy=False, checked_at=t0 + timedelta(seconds=10))
    test_db.add(c1)
    test_db.commit()
    StatusPageService._evaluate_incident_lifecycle(test_db, service_key, service_name, config, False, "Fail 1", daily)
    active_inc = test_db.query(Incident).filter(Incident.service_key == service_key, Incident.status != "resolved").first()
    assert active_inc is None, "Should not create incident after 1 failure"

    # Check 2: Fail
    c2 = ServiceHealthCheck(service_key=service_key, service_name=service_name, is_healthy=False, checked_at=t0 + timedelta(seconds=20))
    test_db.add(c2)
    test_db.commit()
    StatusPageService._evaluate_incident_lifecycle(test_db, service_key, service_name, config, False, "Fail 2", daily)
    active_inc = test_db.query(Incident).filter(Incident.service_key == service_key, Incident.status != "resolved").first()
    assert active_inc is None, "Should not create incident after 2 failures"

    # Check 3: Fail (Threshold = 3 met)
    c3 = ServiceHealthCheck(service_key=service_key, service_name=service_name, is_healthy=False, checked_at=t0 + timedelta(seconds=30))
    test_db.add(c3)
    test_db.commit()
    StatusPageService._evaluate_incident_lifecycle(test_db, service_key, service_name, config, False, "Fail 3", daily)
    active_inc = test_db.query(Incident).filter(Incident.service_key == service_key, Incident.status != "resolved").first()
    assert active_inc is not None, "Incident must be auto-created after 3 failures"
    assert active_inc.status == "investigating"
    assert active_inc.is_auto_detected is True
    inc_id = active_inc.id

    # Check 4: Fail (Duplicate Outage Check)
    c4 = ServiceHealthCheck(service_key=service_key, service_name=service_name, is_healthy=False, checked_at=t0 + timedelta(seconds=40))
    test_db.add(c4)
    test_db.commit()
    StatusPageService._evaluate_incident_lifecycle(test_db, service_key, service_name, config, False, "Fail 4", daily)
    total_incs = test_db.query(Incident).filter(Incident.service_key == service_key, Incident.status != "resolved").all()
    assert len(total_incs) == 1, "Must prevent duplicate incidents for ongoing outage"
    assert total_incs[0].id == inc_id


def test_incident_lifecycle_auto_recovery(test_db):
    """
    Simulates consecutive passes on an active auto-detected incident:
    - 1st pass -> Incident remains open.
    - 2nd pass (recovery threshold met) -> Incident auto-resolved, duration computed.
    """
    config = StatusPageService.get_or_create_config(test_db)
    config.recovery_threshold = 2
    service_key = "dashboard"
    service_name = SERVICE_KEY_MAP[service_key]["name"]
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    daily = test_db.query(ServiceDailyUptime).filter(ServiceDailyUptime.service_key == service_key, ServiceDailyUptime.date == today_str).first()
    active_inc = test_db.query(Incident).filter(Incident.service_key == service_key, Incident.status != "resolved").first()
    assert active_inc is not None

    t_rec = datetime.now(timezone.utc)

    # Pass 1
    p1 = ServiceHealthCheck(service_key=service_key, service_name=service_name, is_healthy=True, checked_at=t_rec + timedelta(seconds=10))
    test_db.add(p1)
    test_db.commit()
    StatusPageService._evaluate_incident_lifecycle(test_db, service_key, service_name, config, True, None, daily)
    test_db.refresh(active_inc)
    assert active_inc.status != "resolved", "Should remain open after only 1 pass"

    # Pass 2 (Recovery threshold = 2 met)
    p2 = ServiceHealthCheck(service_key=service_key, service_name=service_name, is_healthy=True, checked_at=t_rec + timedelta(seconds=20))
    test_db.add(p2)
    test_db.commit()
    StatusPageService._evaluate_incident_lifecycle(test_db, service_key, service_name, config, True, None, daily)
    test_db.commit()
    test_db.refresh(active_inc)
    assert active_inc.status == "resolved", "Incident must be auto-resolved after 2 consecutive passes"
    assert active_inc.resolved_time is not None
    assert active_inc.duration_minutes is not None
    assert active_inc.duration_minutes >= 1


# ============================================================================
# 4. Subscriber Registration & Idempotency
# ============================================================================
def test_subscriber_registration(test_db):
    email = "subscriber_unit_test@example.com"
    test_db.query(StatusSubscriber).filter(StatusSubscriber.email == email).delete()
    test_db.commit()

    # First subscribe
    res1 = StatusPageService.subscribe_email(test_db, email)
    assert res1["status"] == "success"

    # Second subscribe (idempotent)
    res2 = StatusPageService.subscribe_email(test_db, email)
    assert res2["status"] == "success"
    assert "already subscribed" in res2["message"]

    # Invalid email rejection
    with pytest.raises(ValueError):
        StatusPageService.subscribe_email(test_db, "invalid_email_string")

    # Cleanup
    test_db.query(StatusSubscriber).filter(StatusSubscriber.email == email).delete()
    test_db.commit()


# ============================================================================
# 5. Summary, History & Notices Serialization
# ============================================================================
def test_status_summary_payload(test_db):
    summary = StatusPageService.get_status_summary(test_db)
    assert "overall_status" in summary
    assert "overall_title" in summary
    assert "overall_description" in summary
    assert "services" in summary
    assert len(summary["services"]) == 4

    for s in summary["services"]:
        assert s["key"] in SERVICE_KEY_MAP
        assert "uptime_percentage" in s
        assert "response_time_ms" in s
        assert "status" in s


def test_90_day_history_payload(test_db):
    history = StatusPageService.get_90_day_history(test_db)
    assert history["period"] == "90_days"
    assert len(history["services"]) == 4

    for key, data in history["services"].items():
        assert len(data["days"]) == 90
        assert "uptime_percentage_90d" in data
        first_day = data["days"][0]
        assert "date" in first_day
        assert "status" in first_day
        assert "uptime_percentage" in first_day


def test_recent_notices_payload(test_db):
    notices = StatusPageService.get_recent_notices(test_db, days=7)
    assert isinstance(notices, list)


# ============================================================================
# 6. HTML Status Email Generation
# ============================================================================
def test_build_status_email_html():
    now = datetime.now(timezone.utc)
    inc = Incident(
        service_key="meta_api",
        service_name="Meta API",
        title="Test Meta Disruption",
        severity="major",
        status="investigating",
        description="Test incident description.",
        start_time=now,
    )
    html = StatusPageService._build_status_email_html(inc, "opened", "Engineers are looking into it.")
    assert "ORBION" in html
    assert "AGENTS" in html
    assert "Meta API" in html
    assert "Test Meta Disruption" in html
    assert "Engineers are looking into it." in html
    assert "orbionagents.com/status" in html
