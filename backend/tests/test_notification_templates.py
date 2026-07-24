import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.user import User
from app.models.workspace import Workspace
from app.models.notification_template import NotificationTemplate
from app.services.notification_template_service import NotificationTemplateService
from app.services.notification_service import NotificationService
from app.core.enums import PlatformRole


# Test DB Setup (SQLite in memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)
    NotificationTemplateService.clear_cache()


def test_placeholder_render_text():
    template = "Hi {{user_name}}, welcome to {{workspace_name}}! IP: {{ip_address}}."
    context = {
        "user_name": "santhosh",
        "workspace_name": "AuroMind AI",
        "ip_address": "127.0.0.1"
    }
    rendered = NotificationTemplateService.render_text(template, context)
    assert rendered == "Hi santhosh, welcome to AuroMind AI! IP: 127.0.0.1."


def test_placeholder_render_missing_keys():
    template = "Hello {{user_name}}, your code is {{otp_code}}."
    context = {"user_name": "santhosh"}
    rendered = NotificationTemplateService.render_text(template, context)
    assert rendered == "Hello santhosh, your code is ."


def test_template_service_fallback(db):
    tpl = NotificationTemplateService.get_template(db, "welcome_signup")
    assert tpl is not None
    assert tpl["category"] == "Security"
    assert "{{workspace_name}}" in tpl["message"] or "{{user_name}}" in tpl["message"]


def test_template_crud_and_cache(db):
    new_tpl = NotificationTemplate(
        id=uuid.uuid4(),
        category="Security",
        template_key="custom_security_alert",
        name="Custom Security Alert",
        title="Alert for {{user_name}}",
        subject="Security Notice",
        message="Suspicious activity on {{workspace_name}}.",
        channel="in_app",
        is_active=True
    )
    db.add(new_tpl)
    db.commit()

    fetched = NotificationTemplateService.get_template(db, "custom_security_alert")
    assert fetched is not None
    assert fetched["name"] == "Custom Security Alert"

    # Update template
    new_tpl.message = "Updated security text for {{workspace_name}}."
    db.commit()
    NotificationTemplateService.clear_cache("custom_security_alert")

    fetched_updated = NotificationTemplateService.get_template(db, "custom_security_alert")
    assert fetched_updated["message"] == "Updated security text for {{workspace_name}}."


def test_channel_validation_rules():
    from fastapi import HTTPException
    from app.routers.admin.notification_templates import validate_channel_selection

    # 1. payment_success, usage_80, workflow_completed support email + in_app -> "both", "email", "in_app" are all valid
    for key in ["payment_success", "usage_80", "usage_90", "usage_100", "workflow_completed", "workflow_failed", "lead_alert", "human_escalation", "welcome_signup"]:
        validate_channel_selection(key, "both")
        validate_channel_selection(key, "email")
        validate_channel_selection(key, "in_app")

    # 2. otp_code supports email only -> "both" and "in_app" fail with 400 Bad Request
    validate_channel_selection("otp_code", "email")
    with pytest.raises(HTTPException) as exc_info:
        validate_channel_selection("otp_code", "both")
    assert exc_info.value.status_code == 400
    assert "otp_code" in exc_info.value.detail

    with pytest.raises(HTTPException) as exc_info2:
        validate_channel_selection("otp_code", "in_app")
    assert exc_info2.value.status_code == 400


def test_all_12_notification_events_e2e(db):
    """
    E2E Smoke Test verifying template event categories:
    1. welcome_signup
    2. new_device_login
    3. known_device_login
    4. payment_success
    5. payment_failed
    6. usage_80 / usage_90 / usage_100
    7. workflow_completed / workflow_failed
    8. lead_alert
    9. human_escalation
    10. otp_code
    11. account_deletion_requested / account_deletion_cancelled
    12. Admin template modification & hot reload cache reflection
    """
    # 1. Seed defaults into DB
    count = NotificationTemplateService.seed_default_templates(db)
    assert count > 0

    user = User(
        id=uuid.uuid4(),
        email="smoke_test@example.com",
        full_name="Smoke Test User",
        platform_role=PlatformRole.PLATFORM_ADMIN.value
    )
    ws = Workspace(
        id=uuid.uuid4(),
        name="Smoke Test Workspace",
        created_by=user.id
    )
    db.add(user)
    db.add(ws)
    db.commit()

    # Event 1: welcome_signup
    n1 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="workspace_alert",
        template_key="welcome_signup",
        variables={"user_name": "Smoke Test User", "workspace_name": "Smoke Test Workspace"}
    )
    assert n1 is not None
    assert "Smoke Test User" in n1.message or "Smoke Test Workspace" in n1.message or "welcome" in n1.message.lower()

    # Event 2: new_device_login
    n2 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="security_alert",
        template_key="new_device_login",
        variables={"user_name": "Smoke Test User", "device": "Chrome / Windows", "ip_address": "192.168.1.1", "location": "Chennai", "login_time": "2026-07-24 UTC"}
    )
    assert n2 is not None
    assert "192.168.1.1" in n2.message or "Chrome" in n2.message

    # Event 3: known_device_login
    n3 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="security_alert",
        template_key="known_device_login",
        variables={"user_name": "Smoke Test User", "ip_address": "192.168.1.1", "login_time": "2026-07-24 UTC"}
    )
    assert n3 is not None
    assert "192.168.1.1" in n3.message

    # Event 4: payment_success
    n4 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="billing_alert",
        template_key="payment_success",
        variables={"user_name": "Smoke Test User", "amount": "$49.00 USD", "invoice_id": "INV-1001", "payment_date": "July 24, 2026", "workspace_name": "Smoke Test Workspace"}
    )
    assert n4 is not None

    # Event 5: payment_failed
    n5 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="billing_alert",
        template_key="payment_failed",
        variables={"user_name": "Smoke Test User", "amount": "$49.00", "error_message": "Card Expired", "action_url": "https://app.auromind.ai/billing", "workspace_name": "Smoke Test Workspace"}
    )
    assert n5 is not None

    # Event 6: usage_80, usage_90, usage_100
    for key in ["usage_80", "usage_90", "usage_100"]:
        n_usage = NotificationService.notify(
            db=db, user_id=user.id, workspace_id=ws.id, type="usage_warning",
            template_key=key,
            variables={"user_name": "Smoke Test User", "workspace_name": "Smoke Test Workspace", "resource_name": "AI Tokens", "used_amount": "80,000", "total_limit": "100,000", "action_url": "https://app.auromind.ai/billing"}
        )
        assert n_usage is not None

    # Event 7: workflow_completed, workflow_failed
    n_wf1 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="workflow_completed",
        template_key="workflow_completed",
        variables={"workflow_name": "Lead Sync Flow", "duration": "1.2s", "workspace_name": "Smoke Test Workspace"}
    )
    assert n_wf1 is not None

    n_wf2 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="workflow_failed",
        template_key="workflow_failed",
        variables={"user_name": "Smoke Test User", "workflow_name": "Lead Sync Flow", "node_name": "Webhook Node", "error_message": "Connection Timeout", "timestamp": "2026-07-24 UTC", "workspace_name": "Smoke Test Workspace"}
    )
    assert n_wf2 is not None

    # Event 8: lead_alert
    n_lead = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="lead_alert",
        template_key="lead_alert",
        variables={"lead_name": "John Doe", "lead_email": "john@example.com", "lead_score": "95", "workspace_name": "Smoke Test Workspace"}
    )
    assert n_lead is not None

    # Event 9: human_escalation
    n_esc = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="ai_agent_event",
        template_key="human_escalation",
        variables={"customer_name": "Alice Smith", "escalation_reason": "Requested Live Supervisor", "workspace_name": "Smoke Test Workspace"}
    )
    assert n_esc is not None

    # Event 10: otp_code
    otp_tpl = NotificationTemplateService.get_template(db, "otp_code")
    assert otp_tpl is not None
    rendered_otp = NotificationTemplateService.render_text(otp_tpl["message"], {"user_name": "Smoke Test User", "otp": "987654", "auth_type": "Login"})
    assert "987654" in rendered_otp

    # Event 11: account_deletion_requested / account_deletion_cancelled
    n_del1 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="security_alert",
        template_key="account_deletion_requested",
        variables={"user_name": "Smoke Test User", "deletion_date": "August 24, 2026"}
    )
    assert n_del1 is not None

    n_del2 = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="security_alert",
        template_key="account_deletion_cancelled",
        variables={"user_name": "Smoke Test User"}
    )
    assert n_del2 is not None

    # Event 12: Admin Live Edit & Cache Invalidation Reflection Test
    db_tpl = db.query(NotificationTemplate).filter(
        NotificationTemplate.template_key == "known_device_login"
    ).first()
    assert db_tpl is not None

    # Modify template in DB as Admin
    db_tpl.message = "ADMIN MODIFIED: Welcome back {{user_name}} from {{ip_address}}!"
    db.commit()
    NotificationTemplateService.clear_cache("known_device_login")

    # Next notification trigger MUST reflect admin update immediately
    n_updated = NotificationService.notify(
        db=db, user_id=user.id, workspace_id=ws.id, type="security_alert",
        template_key="known_device_login",
        variables={"user_name": "Smoke Test User", "ip_address": "10.0.0.1"}
    )
    assert n_updated is not None
    assert "ADMIN MODIFIED: Welcome back Smoke Test User from 10.0.0.1!" in n_updated.message


def test_test_render_notification_template():
    from app.schemas.notification_template import TemplateTestRenderRequest
    from app.routers.admin.notification_templates import test_render_notification_template

    req = TemplateTestRenderRequest(
        template_key="welcome_signup",
        subject="Welcome {{user_name}}",
        message="Hello {{user_name}}, welcome to {{workspace_name}}!",
        title="Welcome Title"
    )
    res = test_render_notification_template(req)
    assert res.rendered_subject == "Welcome santhosh"
    assert "Hello santhosh, welcome to AuroMind AI!" in res.rendered_message

    # Test without template_key
    req_no_key = TemplateTestRenderRequest(
        message="Test message for {{user_name}}"
    )
    res_no_key = test_render_notification_template(req_no_key)
    assert "Test message for santhosh" in res_no_key.rendered_message


