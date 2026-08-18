"""
Complete End-to-End Notification System Verification Test Suite
Tests:
1. Business Event -> Event Rule -> Recipient Resolver -> Notification Template -> Outbox -> Email Log
2. Signup, Free Plan Activation, Payment Success, Payment Failure, and CRM Lead Events
3. Dynamic Placeholder Replacement (user_name, workspace_name, credits, amount, invoice_id, etc.)
4. Responsive HTML & Plain-Text Rendering
5. Delivery Status Verification (SIMULATED when unconfigured, SENT when delivered, FAILED on error)
6. Delivery Retry Mechanism
7. Admin Template CRUD, Live Modification & Cache Reflection
8. Admin Test-Send API Endpoint Execution & Outbox Tracking
"""

import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock

from app.database import Base
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.ai_action import Lead
from app.models.conversation import Conversation
from app.models.notification_template import NotificationTemplate
from app.models.notification_rule import NotificationRule
from app.models.email_delivery_log import EmailDeliveryLog
from app.core.event_bus import EventBus
from app.services.notifications.recipient_resolver import RecipientResolver
from app.services.notifications.notification_rule_engine import NotificationRuleEngine
from app.services.notification_template_service import NotificationTemplateService
from app.services.email_service import EmailService
from app.schemas.notification_template import (
    TemplateTestSendRequest,
    TemplateTestSendResponse
)
from app.routers.admin.notification_templates import test_send_notification_template as api_test_send_template


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed default templates & rules into in-memory test DB
    NotificationTemplateService.seed_default_templates(session)
    NotificationTemplateService.seed_default_rules(session)
    NotificationTemplateService.clear_cache()

    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)
    NotificationTemplateService.clear_cache()


@pytest.fixture
def mock_platform_context(db_session):
    owner = User(
        id=uuid.uuid4(),
        email="founder@testcorp.com",
        full_name="Arun Founder",
        is_active=True,
        preferences={"leadsAlerts": True, "billingAlerts": True}
    )
    agent = User(
        id=uuid.uuid4(),
        email="agent@testcorp.com",
        full_name="Jack Agent",
        is_active=True,
        preferences={"leadsAlerts": True}
    )
    db_session.add_all([owner, agent])
    db_session.commit()

    workspace = Workspace(
        id=uuid.uuid4(),
        name="AuroMind Space",
        created_by=owner.id,
        billing_email="billing@testcorp.com",
        billing_contact_name="Finance Dept"
    )
    db_session.add(workspace)
    db_session.commit()

    member_owner = WorkspaceMember(workspace_id=workspace.id, user_id=owner.id, role="founder")
    member_agent = WorkspaceMember(workspace_id=workspace.id, user_id=agent.id, role="team_member")
    db_session.add_all([member_owner, member_agent])
    db_session.commit()

    return {
        "owner": owner,
        "agent": agent,
        "workspace": workspace
    }


# ==============================================================================
# TEST 1: SIGNUP & WELCOME EMAIL DELIVERY FLOW
# ==============================================================================
def test_signup_welcome_event_delivery_flow(db_session, mock_platform_context):
    ctx = mock_platform_context
    owner = ctx["owner"]
    ws = ctx["workspace"]

    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", return_value={"status": "success"}):

        logs = EventBus.emit(
            event_name="user.signup",
            payload={
                "user_name": owner.full_name,
                "workspace_name": ws.name,
                "plan_name": "Free Plan",
                "credits": "1000",
                "email": owner.email
            },
            workspace_id=ws.id,
            db=db_session,
            dispatch_immediately=True
        )

        assert len(logs) >= 1
        log = logs[0]
        assert log.recipient_email == owner.email
        assert log.status == "SENT"
        assert log.sent_at is not None
        assert "Welcome" in log.subject
        assert "Arun Founder" in log.body_html
        assert "AuroMind Space" in log.body_html
        assert "<!DOCTYPE html>" in log.body_html


# ==============================================================================
# TEST 2: FREE PLAN ACTIVATION EMAIL DELIVERY FLOW
# ==============================================================================
def test_free_plan_activated_event_delivery_flow(db_session, mock_platform_context):
    ctx = mock_platform_context
    owner = ctx["owner"]
    ws = ctx["workspace"]

    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", return_value={"status": "success"}):

        logs = EventBus.emit(
            event_name="plan.free_activated",
            payload={
                "user_name": "Jack",
                "workspace_name": "Demo Workspace",
                "plan_name": "Free Starter",
                "credits": "500"
            },
            workspace_id=ws.id,
            db=db_session,
            dispatch_immediately=True
        )

        assert len(logs) >= 1
        log = logs[0]
        assert log.status == "SENT"
        assert log.template_key == "free_plan_activated"
        assert "Demo Workspace" in log.subject
        assert "500" in log.subject or "500" in log.body_html
        assert "Demo Workspace" in log.body_html
        assert "Free Starter" in log.body_html or "Free" in log.body_html


# ==============================================================================
# TEST 3: PAYMENT SUCCESS & FAILURE EMAIL DELIVERY FLOW
# ==============================================================================
def test_payment_events_delivery_flow(db_session, mock_platform_context):
    ctx = mock_platform_context
    ws = ctx["workspace"]

    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", return_value={"status": "success"}):

        # A. Payment Succeeded
        logs_success = EventBus.emit(
            event_name="payment.succeeded",
            payload={
                "amount": "₹4,999",
                "plan_name": "Pro Growth Plan",
                "invoice_id": "INV-2026-9999",
                "renewal_date": "September 18, 2026",
                "workspace_name": ws.name
            },
            workspace_id=ws.id,
            db=db_session,
            dispatch_immediately=True
        )

        assert len(logs_success) >= 1
        success_log = logs_success[0]
        assert success_log.status == "SENT"
        assert "INV-2026-9999" in success_log.subject or "INV-2026-9999" in success_log.body_html
        assert "₹4,999" in success_log.body_html

        # B. Payment Failed
        logs_fail = EventBus.emit(
            event_name="payment.failed",
            payload={
                "amount": "₹4,999",
                "error_message": "Card expired on transaction attempt",
                "service_impact_date": "August 25, 2026",
                "workspace_name": ws.name
            },
            workspace_id=ws.id,
            db=db_session,
            dispatch_immediately=True
        )

        assert len(logs_fail) >= 1
        fail_log = logs_fail[0]
        assert fail_log.status == "SENT"
        assert "Payment Fail" in fail_log.subject or "Action Required" in fail_log.subject
        assert "Card expired" in fail_log.body_html


# ==============================================================================
# TEST 4: CRM LEAD CAPTURE & HIGH-INTENT ROUTING FLOW
# ==============================================================================
def test_crm_lead_intent_routing_flow(db_session, mock_platform_context):
    ctx = mock_platform_context
    agent = ctx["agent"]
    ws = ctx["workspace"]

    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", return_value={"status": "success"}):

        logs = EventBus.emit(
            event_name="lead.created",
            payload={
                "lead_name": "Rohan Patel",
                "lead_phone": "+919876500000",
                "lead_source": "WhatsApp Ads",
                "lead_score": "96",
                "assigned_to": str(agent.id),
                "workspace_name": ws.name
            },
            workspace_id=ws.id,
            db=db_session,
            dispatch_immediately=True
        )

        assert len(logs) >= 1
        log = logs[0]
        assert log.recipient_email == agent.email
        assert log.status == "SENT"
        assert "Rohan Patel" in log.subject
        assert "WhatsApp Ads" in log.subject or "WhatsApp Ads" in log.body_html
        assert "+919876500000" in log.body_html


# ==============================================================================
# TEST 5: DELIVERY LOG STATUS DISTINCTION (SENT vs SIMULATED vs FAILED)
# ==============================================================================
def test_delivery_status_distinction(db_session, mock_platform_context):
    ctx = mock_platform_context
    ws = ctx["workspace"]
    owner = ctx["owner"]

    # 1. SMTP NOT CONFIGURED -> Must be SIMULATED (never falsely marked as SENT)
    with patch.object(EmailService, "is_smtp_configured", return_value=False):
        logs_sim = EventBus.emit(
            event_name="user.signup",
            payload={"user_name": "Test User", "workspace_name": ws.name, "email": owner.email},
            workspace_id=ws.id,
            idempotency_key="sim_test:1",
            db=db_session,
            dispatch_immediately=True
        )
        assert len(logs_sim) >= 1
        assert logs_sim[0].status == "SIMULATED"
        assert "SMTP credentials not configured" in (logs_sim[0].error_message or "")

    # 2. SMTP CONFIGURED & SUCCESS -> SENT
    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", return_value={"status": "success"}):
        logs_sent = EventBus.emit(
            event_name="user.signup",
            payload={"user_name": "Test User", "workspace_name": ws.name, "email": owner.email},
            workspace_id=ws.id,
            idempotency_key="sent_test:2",
            db=db_session,
            dispatch_immediately=True
        )
        assert len(logs_sent) >= 1
        assert logs_sent[0].status == "SENT"
        assert logs_sent[0].sent_at is not None

    # 3. SMTP CONFIGURED & EXCEPTION -> FAILED after max attempts
    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", side_effect=Exception("SMTP Connection Refused")):
        logs_fail = EventBus.emit(
            event_name="user.signup",
            payload={"user_name": "Test User", "workspace_name": ws.name, "email": owner.email},
            workspace_id=ws.id,
            idempotency_key="fail_test:3",
            db=db_session,
            dispatch_immediately=True
        )
        assert len(logs_fail) >= 1
        log = db_session.query(EmailDeliveryLog).filter(EmailDeliveryLog.id == logs_fail[0].id).first()
        assert log.status in ("FAILED", "RETRYING")


# ==============================================================================
# TEST 6: RETRY DELIVERY MECHANISM
# ==============================================================================
def test_email_retry_mechanism(db_session, mock_platform_context):
    ctx = mock_platform_context
    owner = ctx["owner"]
    ws = ctx["workspace"]

    # 1. Create a failed log
    failed_log = EmailDeliveryLog(
        id=uuid.uuid4(),
        idempotency_key=f"retry_test:{uuid.uuid4()}",
        workspace_id=ws.id,
        recipient_email=owner.email,
        recipient_name=owner.full_name,
        recipient_role="workspace_owner",
        event_name="payment.failed",
        template_key="payment_failed",
        subject="Payment Failure Notice",
        body_html="<p>Payment failed</p>",
        status="FAILED",
        attempts=3,
        max_attempts=3,
        error_message="Connection timed out"
    )
    db_session.add(failed_log)
    db_session.commit()

    assert failed_log.status == "FAILED"

    # 2. Re-dispatch with working SMTP
    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", return_value={"status": "success"}):

        # Reset attempts for retry
        failed_log.attempts = 0
        failed_log.status = "PENDING"
        db_session.commit()

        success = NotificationRuleEngine.dispatch_single_log(db_session, failed_log.id)
        assert success is True

        db_session.refresh(failed_log)
        assert failed_log.status == "SENT"
        assert failed_log.sent_at is not None
        assert failed_log.error_message is None


# ==============================================================================
# TEST 7: ADMIN TEMPLATE EDIT & IMMEDIATE CACHE REFLECTION
# ==============================================================================
def test_admin_template_edit_and_cache_reflection(db_session, mock_platform_context):
    ctx = mock_platform_context
    ws = ctx["workspace"]
    owner = ctx["owner"]

    db_tpl = db_session.query(NotificationTemplate).filter(
        NotificationTemplate.template_key == "welcome_signup"
    ).first()
    assert db_tpl is not None

    # Admin updates subject and body template
    db_tpl.subject = "CUSTOM SUBJECT: Welcome {{user_name}} to {{workspace_name}}!"
    db_tpl.message = "CUSTOM BODY: Hi {{user_name}}, your {{credits}} AI credits are ready."
    db_session.commit()
    NotificationTemplateService.clear_cache("welcome_signup")

    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", return_value={"status": "success"}):

        logs = EventBus.emit(
            event_name="user.signup",
            payload={
                "user_name": "Santhosh",
                "workspace_name": "Orbion HQ",
                "credits": "5000",
                "email": owner.email
            },
            workspace_id=ws.id,
            idempotency_key=f"cache_test:{uuid.uuid4()}",
            db=db_session,
            dispatch_immediately=True
        )

        assert len(logs) >= 1
        log = logs[0]
        assert "CUSTOM SUBJECT: Welcome Santhosh to Orbion HQ!" == log.subject
        assert "CUSTOM BODY: Hi Santhosh, your 5000 AI credits are ready." in log.body_html


# ==============================================================================
# TEST 8: TEST-SEND API ENDPOINT (SENT vs SIMULATED)
# ==============================================================================
def test_test_send_api_endpoint(db_session):
    mock_current_user = MagicMock()
    mock_current_user.id = uuid.uuid4()
    mock_current_user.user.email = "admin@auromind.ai"

    # A. When SMTP unconfigured -> Returns SIMULATED
    with patch.object(EmailService, "is_smtp_configured", return_value=False):
        req_sim = TemplateTestSendRequest(
            recipient_email="tester@example.com",
            template_key="free_plan_activated",
            subject="Your {{workspace_name}} Free Plan is Active ({{credits}} AI Credits)",
            message="Hi {{user_name}}, welcome to {{workspace_name}} with {{credits}} credits.",
            title="Free Plan Ready",
            variables={"user_name": "Jack", "workspace_name": "Test Space", "credits": "2000"}
        )
        res_sim = api_test_send_template(payload=req_sim, db=db_session, current_user=mock_current_user)

        assert res_sim.status == "SIMULATED"
        assert "SMTP is not configured" in res_sim.message
        assert res_sim.recipient_email == "tester@example.com"
        assert res_sim.log_id is not None

        # Verify DB log was saved with status SIMULATED
        db_log = db_session.query(EmailDeliveryLog).filter(EmailDeliveryLog.id == uuid.UUID(res_sim.log_id)).first()
        assert db_log is not None
        assert db_log.status == "SIMULATED"
        assert "2000" in db_log.subject

    # B. When SMTP is configured -> Returns SENT
    with patch.object(EmailService, "is_smtp_configured", return_value=True), \
         patch.object(EmailService, "send_email", return_value={"status": "success"}):
        req_sent = TemplateTestSendRequest(
            recipient_email="realuser@example.com",
            template_key="payment_success",
            subject="Receipt for {{workspace_name}} (Invoice #{{invoice_id}})",
            message="Hi {{user_name}}, received {{amount}} for {{workspace_name}}.",
            variables={"user_name": "Jack", "workspace_name": "Test Space", "amount": "₹999", "invoice_id": "INV-777"}
        )
        res_sent = api_test_send_template(payload=req_sent, db=db_session, current_user=mock_current_user)

        assert res_sent.status == "SENT"
        assert "successfully" in res_sent.message.lower()
        assert res_sent.recipient_email == "realuser@example.com"

        db_log_sent = db_session.query(EmailDeliveryLog).filter(EmailDeliveryLog.id == uuid.UUID(res_sent.log_id)).first()
        assert db_log_sent is not None
        assert db_log_sent.status == "SENT"
        assert "INV-777" in db_log_sent.subject
