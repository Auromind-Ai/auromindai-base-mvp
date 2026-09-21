import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi import Response
from app.schemas.lead_report import LeadReportSettingsUpdate
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.workspace import Workspace
from app.models.ai_action import Lead
from app.models.lead_report_setting import LeadReportSetting
from app.services.crm.lead_email_report_service import LeadEmailReportService, parse_time_str


@pytest.fixture(autouse=True)
def mock_email_delivery(monkeypatch):
    monkeypatch.setattr("app.services.email_service.EmailService.send_email_for_workspace",
                        lambda **kwargs: {"status": "simulated", "simulated": True})


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Create test workspace
    ws = Workspace(
        id=uuid.uuid4(),
        name="Test Workspace",
    )
    session.add(ws)
    session.commit()

    yield session, ws

    session.close()


def test_parse_time_str():
    assert parse_time_str("09:00") == (9, 0)
    assert parse_time_str("09:00 AM") == (9, 0)
    assert parse_time_str("09:30 PM") == (21, 30)
    assert parse_time_str("12:00 AM") == (0, 0)
    assert parse_time_str("12:00 PM") == (12, 0)
    assert parse_time_str("invalid") == (9, 0)


@pytest.mark.parametrize("values", [
    {"min_score": 101}, {"min_score": -1}, {"frequency": "hourly"},
    {"send_time": "25:99"}, {"recipient_emails": ["not-an-email"]},
    {"unknown_setting": True},
])
def test_report_schema_rejects_invalid_settings(values):
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        LeadReportSettingsUpdate(**values)


def test_partial_update_preserves_report_configuration(db_session):
    session, ws = db_session
    LeadEmailReportService.update_settings(session, ws.id, {
        "min_score": 75, "frequency": "weekly", "send_time": "11:30",
        "recipient_emails": ["owner@example.com"], "csv_columns": ["name", "phone"],
    })
    setting = LeadEmailReportService.update_settings(session, ws.id, {"is_active": True})
    assert setting.min_score == 75
    assert setting.frequency == "weekly"
    assert setting.send_time == "11:30"
    assert setting.csv_columns == ["name", "phone"]


def test_get_or_create_settings(db_session):
    session, ws = db_session
    setting = LeadEmailReportService.get_or_create_settings(session, ws.id)
    assert setting is not None
    assert setting.workspace_id == ws.id
    assert setting.is_active is False
    assert setting.min_score == 50
    assert setting.frequency == "daily"
    assert setting.attach_csv is True


@pytest.mark.parametrize("frequency,now,expected", [
    ("daily", "2026-09-21T08:00:00", "2026-09-21T09:00:00"),
    ("daily", "2026-09-21T09:00:00", "2026-09-21T13:00:00"),
    ("daily", "2026-09-21T18:00:00", "2026-09-22T09:00:00"),
    ("weekly", "2026-09-21T10:00:00", "2026-09-21T13:00:00"),
    ("weekly", "2026-09-21T18:00:00", "2026-09-28T09:00:00"),
    ("monthly", "2026-10-01T10:00:00", "2026-10-01T13:00:00"),
    ("monthly", "2026-12-01T18:00:00", "2027-01-01T09:00:00"),
])
def test_multiple_time_slots(frequency, now, expected):
    from zoneinfo import ZoneInfo
    tz = ZoneInfo("Asia/Kolkata")
    result = LeadEmailReportService.calculate_next_run(
        frequency, ["18:00", "09:00", "13:00"], "Asia/Kolkata",
        datetime.fromisoformat(now).replace(tzinfo=tz),
    )
    assert result == datetime.fromisoformat(expected).replace(tzinfo=tz).astimezone(timezone.utc)


@pytest.mark.parametrize("times", [[], ["25:00"], ["09:00", "09:00 AM"], [""], ["09:00"] * 25])
def test_invalid_time_slots(times):
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        LeadReportSettingsUpdate(send_times=times)


def test_multiple_times_persist_and_legacy_fallback(db_session):
    session, ws = db_session
    setting = LeadEmailReportService.get_or_create_settings(session, ws.id)
    assert LeadEmailReportService.settings_payload(session, ws.id, setting)["settings"]["send_times"] == ["09:00"]
    LeadEmailReportService.update_settings(session, ws.id, {"send_times": ["06:00 PM", "09:00"]})
    session.expire_all()
    setting = LeadEmailReportService.update_settings(session, ws.id, {"is_active": True})
    assert setting.send_times == ["09:00", "18:00"]
    assert setting.send_time == "09:00"
    assert LeadEmailReportService.settings_payload(session, ws.id, setting)["settings"]["send_times"] == ["09:00", "18:00"]


def to_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def test_update_settings_and_next_run(db_session):
    session, ws = db_session
    updated = LeadEmailReportService.update_settings(session, ws.id, {
        "is_active": True,
        "min_score": 70,
        "frequency": "weekly",
        "send_time": "10:30 AM",
        "recipient_emails": ["sales@example.com", "manager@example.com"],
        "attach_csv": True,
    })

    assert updated.is_active is True
    assert updated.min_score == 70
    assert updated.frequency == "weekly"
    assert updated.send_time == "10:30"
    assert updated.recipient_emails == ["sales@example.com", "manager@example.com"]
    assert updated.next_run_at is not None
    assert to_utc(updated.next_run_at) > datetime.now(timezone.utc)


def test_generate_csv_and_email_content(db_session):
    session, ws = db_session

    # Add sample leads
    lead1 = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        name="Alice Johnson",
        email="alice@example.com",
        phone="+1234567890",
        score=85,
        lead_tier="hot",
        status="active"
    )
    lead2 = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        name="Bob Smith",
        email="bob@example.com",
        phone="+0987654321",
        score=40,
        lead_tier="warm",
        status="new"
    )
    session.add_all([lead1, lead2])
    session.commit()

    setting = LeadEmailReportService.get_or_create_settings(session, ws.id)
    setting.min_score = 50

    leads = LeadEmailReportService.get_qualified_leads_query(session, ws.id, min_score=50).all()
    assert len(leads) == 1
    assert leads[0].name == "Alice Johnson"

    csv_bytes = LeadEmailReportService.generate_csv_bytes(leads)
    csv_str = csv_bytes.decode("utf-8-sig")
    assert "Alice Johnson" in csv_str
    assert "Bob Smith" not in csv_str
    assert "Lead Score" in csv_str

    content = LeadEmailReportService.build_email_content(
        setting=setting,
        lead_count=len(leads),
        filename="test.csv",
        workspace_name="Test Workspace"
    )
    assert "Alice Johnson" not in content["plain_text"] # Lead details are in the CSV
    assert "Total Qualified Leads: 1" in content["plain_text"]
    assert "50%" in content["plain_text"]


def test_send_report_simulated(db_session):
    session, ws = db_session
    setting = LeadEmailReportService.update_settings(session, ws.id, {
        "is_active": True,
        "min_score": 50,
        "recipient_emails": ["test@example.com"],
        "attach_csv": True
    })

    result = LeadEmailReportService.send_report(session, ws.id, is_test=True)
    assert result["status"] == "success"
    assert result["is_test"] is True
    assert result["recipients"] == ["test@example.com"]
    assert "qualified_leads_" in result["filename"]


def test_process_due_reports(db_session):
    session, ws = db_session
    now_utc = datetime.now(timezone.utc)

    # Set up setting with next_run_at in the past
    setting = LeadEmailReportService.update_settings(session, ws.id, {
        "is_active": True,
        "recipient_emails": ["cron@example.com"],
        "attach_csv": True
    })
    setting.next_run_at = now_utc - timedelta(minutes=5)
    session.commit()

    processed = LeadEmailReportService.process_due_reports(session)
    assert processed == 1

    session.refresh(setting)
    assert setting.last_sent_at is not None
    assert to_utc(setting.next_run_at) > now_utc


def test_router_endpoints_directly(db_session):
    from app.routers.lead_scoring import get_email_report_settings, get_sample_preview, save_email_report_settings
    from app.models.user import User
    from app.models.workspace import WorkspaceMember
    from app.core.enums import PlatformRole

    session, ws = db_session

    # Create dummy user and membership
    dummy_user = User(
        id=uuid.uuid4(),
        email="testowner@example.com",
        platform_role=PlatformRole.USER
    )
    session.add(dummy_user)
    member = WorkspaceMember(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        user_id=dummy_user.id,
        role="founder"
    )
    session.add(member)
    session.commit()

    # Test get_email_report_settings
    res = get_email_report_settings(
        response=Response(),
        workspace_id=str(ws.id),
        db=session,
        current_user=dummy_user
    )
    assert "settings" in res
    assert "lead_count" in res

    # Test save_email_report_settings
    saved = save_email_report_settings(
        response=Response(),
        body=LeadReportSettingsUpdate(is_active=True, min_score=60, frequency="daily", send_time="09:00 AM", recipient_emails=["a@b.com"], attach_csv=True),
        workspace_id=str(ws.id),
        db=session,
        current_user=dummy_user
    )
    assert saved["status"] == "success"
    assert saved["settings"]["min_score"] == 60

    # Test get_sample_preview
    preview = get_sample_preview(
        min_score=60,
        frequency="daily",
        workspace_id=str(ws.id),
        db=session,
        current_user=dummy_user
    )
    assert "sample_leads" in preview
    assert "total_count" in preview
    assert "subject" in preview

    # Test custom subject and body templates via save
    custom_saved = save_email_report_settings(
        response=Response(),
        body=LeadReportSettingsUpdate(**{
            "is_active": True,
            "min_score": 70,
            "frequency": "weekly",
            "send_time": "10:30 AM",
            "recipient_emails": ["leads@example.com"],
            "attach_csv": True,
            "subject_template": "Weekly Leads: {total_leads} leads ({date})",
            "body_template": "Hello {workspace_name},\nFound {total_leads} leads above {min_score}."
        }),
        workspace_id=str(ws.id),
        db=session,
        current_user=dummy_user
    )
    assert custom_saved["status"] == "success"
    assert custom_saved["settings"]["subject_template"] == "Weekly Leads: {total_leads} leads ({date})"
    assert custom_saved["settings"]["body_template"] == "Hello {workspace_name},\nFound {total_leads} leads above {min_score}."

    # Test preview with custom templates passed explicitly
    preview_custom = get_sample_preview(
        min_score=70,
        frequency="weekly",
        subject_template="Custom: {total_leads} leads",
        body_template="Custom body with {total_leads} leads for {workspace_name}",
        workspace_id=str(ws.id),
        db=session,
        current_user=dummy_user
    )
    assert "Custom: " in preview_custom["subject"]
    assert "Custom body with " in preview_custom["body_text"]
