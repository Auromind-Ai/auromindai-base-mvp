import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.ai_action import Lead
from app.models.conversation import Conversation, ChannelType
from app.models.notification_template import NotificationTemplate
from app.models.notification_rule import NotificationRule
from app.models.email_delivery_log import EmailDeliveryLog
from app.core.event_bus import EventBus, emit_event
from app.services.notifications.recipient_resolver import RecipientResolver
from app.services.notifications.notification_rule_engine import NotificationRuleEngine
from app.services.notification_template_service import NotificationTemplateService
from app.workers.notification_scheduler_worker import (
    process_scheduled_email_outbox,
    check_lead_sla_breaches,
    check_inactive_leads,
    generate_daily_dashboard_summary
)


from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def mock_external_services():
    with patch("app.workers.email_retry_worker.send_email_with_retry", return_value=True), \
         patch("app.services.notifications.notification_rule_engine.send_email_with_retry", return_value=True), \
         patch("redis.from_url") as mock_redis:
        mock_redis.return_value.get.return_value = None
        yield


from app.models.notification_schedule import NotificationSchedule
from app.services.notifications.schedule_service import NotificationScheduleService
from app.workers.notification_scheduler_worker import (
    evaluate_dynamic_notification_schedules,
    process_scheduled_email_outbox,
    check_lead_sla_breaches,
    check_inactive_leads,
    generate_daily_dashboard_summary
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed templates, rules & dynamic schedules into in-memory SQLite DB
    NotificationTemplateService.seed_default_templates(session)
    NotificationTemplateService.seed_default_rules(session)
    NotificationScheduleService.seed_default_schedules(session)

    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_recipient_resolver_roles(db_session):
    # Setup test workspace and users
    owner = User(
        id=uuid.uuid4(),
        email="owner@auromind.ai",
        full_name="Workspace Founder",
        is_active=True,
        preferences={"leadsAlerts": True, "billingAlerts": True}
    )
    agent = User(
        id=uuid.uuid4(),
        email="agent@auromind.ai",
        full_name="Sales Agent 1",
        is_active=True,
        preferences={"leadsAlerts": True}
    )
    db_session.add_all([owner, agent])
    db_session.commit()

    workspace = Workspace(
        id=uuid.uuid4(),
        name="Test Corp",
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

    # Create lead assigned to agent
    conv = Conversation(id=uuid.uuid4(), workspace_id=workspace.id, phone="+919876543210")
    db_session.add(conv)
    db_session.commit()

    lead = Lead(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        conversation_id=conv.id,
        name="Customer Lead",
        phone="+919876543210",
        assigned_to=agent.id,
        score=85
    )
    db_session.add(lead)
    db_session.commit()

    # 1. Test resolving assigned_agent
    recipients_agent = RecipientResolver.resolve_recipients(
        db=db_session,
        recipient_roles=["assigned_agent"],
        workspace_id=workspace.id,
        event_data={"lead_id": str(lead.id), "assigned_to": str(agent.id)},
        event_name="lead.created"
    )
    assert len(recipients_agent) == 1
    assert recipients_agent[0].email == "agent@auromind.ai"
    assert recipients_agent[0].role == "assigned_agent"

    # 2. Test resolving workspace_owner
    recipients_owner = RecipientResolver.resolve_recipients(
        db=db_session,
        recipient_roles=["workspace_owner"],
        workspace_id=workspace.id,
        event_name="plan.free_activated"
    )
    assert len(recipients_owner) == 1
    assert recipients_owner[0].email == "owner@auromind.ai"

    # 3. Test resolving billing_contact
    recipients_billing = RecipientResolver.resolve_recipients(
        db=db_session,
        recipient_roles=["billing_contact"],
        workspace_id=workspace.id,
        event_name="payment.succeeded"
    )
    assert len(recipients_billing) == 1
    assert recipients_billing[0].email == "billing@testcorp.com"


def test_user_preferences_opt_out(db_session):
    # User who opted out of lead alerts
    agent_optout = User(
        id=uuid.uuid4(),
        email="optout_agent@auromind.ai",
        full_name="Opted Out Agent",
        is_active=True,
        preferences={"leadsAlerts": False}
    )
    workspace = Workspace(id=uuid.uuid4(), name="Test Space")
    db_session.add_all([agent_optout, workspace])
    db_session.commit()

    member = WorkspaceMember(workspace_id=workspace.id, user_id=agent_optout.id, role="team_member")
    db_session.add(member)
    db_session.commit()

    # Resolve for non-critical lead event
    recipients = RecipientResolver.resolve_recipients(
        db=db_session,
        recipient_roles=["assigned_agent"],
        workspace_id=workspace.id,
        event_data={"assigned_to": str(agent_optout.id)},
        event_name="lead.message_received",
        is_critical=False
    )
    # Should be filtered out due to preferences
    assert len(recipients) == 0


def test_event_bus_outbox_staging_and_idempotency(db_session):
    owner = User(
        id=uuid.uuid4(),
        email="founder@startup.com",
        full_name="Startup Founder",
        is_active=True
    )
    ws = Workspace(id=uuid.uuid4(), name="Startup Inc", created_by=owner.id, billing_email="founder@startup.com")
    db_session.add_all([owner, ws])
    db_session.commit()

    member = WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role="founder")
    db_session.add(member)
    db_session.commit()

    # Emit event with deterministic idempotency key
    logs1 = EventBus.emit(
        event_name="payment.succeeded",
        payload={
            "amount": "$49.00",
            "plan_name": "Pro Growth Plan",
            "invoice_id": "INV-1001",
            "renewal_date": "September 18, 2026",
            "workspace_name": "Startup Inc",
            "workspace_id": str(ws.id)
        },
        workspace_id=ws.id,
        idempotency_key="pay_evt:INV-1001",
        db=db_session,
        dispatch_immediately=False
    )

    assert len(logs1) >= 1
    log = logs1[0]
    assert log.status == "PENDING"
    assert log.event_name == "payment.succeeded"
    assert "Startup Inc" in log.subject
    assert "INV-1001" in log.subject or "INV-1001" in log.body_html
    assert "Pro Growth Plan" in log.body_html

    # Re-emit with the EXACT same idempotency key (simulate retry)
    logs2 = EventBus.emit(
        event_name="payment.succeeded",
        payload={
            "amount": "$49.00",
            "plan_name": "Pro Growth Plan",
            "invoice_id": "INV-1001",
            "workspace_id": str(ws.id)
        },
        workspace_id=ws.id,
        idempotency_key="pay_evt:INV-1001",
        db=db_session,
        dispatch_immediately=False
    )

    # Idempotency must prevent duplicate delivery log
    assert len(logs2) == 0

    total_logs = db_session.query(EmailDeliveryLog).count()
    assert total_logs == len(logs1)


def test_html_email_layout_rendering():
    html = NotificationTemplateService.render_html_email(
        title="Payment Succeeded",
        message="Thank you for your payment of $99.\n\nYour invoice is ready.",
        context={"app_name": "Auromind AI", "workspace_name": "Alpha Corp", "action_url": "https://auromind.ai/billing"},
        action_url="https://auromind.ai/billing",
        action_label="Download Invoice"
    )

    assert "<!DOCTYPE html>" in html
    assert "Auromind AI" in html
    assert "Alpha Corp" in html
    assert "Payment Succeeded" in html
    assert "Download Invoice" in html
    assert "https://auromind.ai/billing" in html


def test_rule_conditions_evaluation(db_session):
    # Rule with condition: lead_score_gte >= 80
    condition_rule = NotificationRule(
        id=uuid.uuid4(),
        event_name="lead.qualified_test",
        template_key="lead_high_intent",
        recipient_roles=["workspace_owner"],
        conditions={"lead_score_gte": 80},
        is_active=True
    )
    db_session.add(condition_rule)
    db_session.commit()

    owner = User(id=uuid.uuid4(), email="boss@corp.com", full_name="Boss", is_active=True)
    ws = Workspace(id=uuid.uuid4(), name="Corp", created_by=owner.id)
    db_session.add_all([owner, ws])
    db_session.commit()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role="founder"))
    db_session.commit()

    # 1. Emit with score 50 (should NOT match)
    logs_fail = NotificationRuleEngine.process_event(
        db=db_session,
        event_name="lead.qualified_test",
        payload={"lead_name": "Low Score Lead", "lead_score": 50, "workspace_id": str(ws.id)},
        workspace_id=ws.id,
        dispatch_immediately=False
    )
    assert len(logs_fail) == 0

    # 2. Emit with score 90 (SHOULD match)
    logs_pass = NotificationRuleEngine.process_event(
        db=db_session,
        event_name="lead.qualified_test",
        payload={"lead_name": "High Score Lead", "lead_score": 90, "workspace_id": str(ws.id)},
        workspace_id=ws.id,
        dispatch_immediately=False
    )
    assert len(logs_pass) == 1
    assert logs_pass[0].event_name == "lead.qualified_test"


def test_all_eighteen_events_seeded(db_session):
    """Verify that all business event templates are properly seeded and supported."""
    required_events = [
        # User & Onboarding
        "welcome_signup", "email_verification_pending", "email_verification_reminder_24h",
        "free_plan_activated", "onboarding_inactivity",
        # Payments & Credits
        "payment_success", "credit_purchase_success", "credits_low_20", "credits_low_10",
        "credits_exhausted", "payment_failed", "payment_failed_reminder_24h", "payment_failed_reminder_72h",
        # Lead Management
        "lead_created", "lead_assigned", "lead_sla_breached", "lead_message_received",
        "lead_high_intent", "lead_converted", "lead_inactive_reminder",
        # Broadcast & Workflow
        "broadcast_completed", "workflow_failed",
        # Reports
        "daily_dashboard_summary", "weekly_performance_report"
    ]

    for template_key in required_events:
        tpl = NotificationTemplateService.get_template(db_session, template_key)
        assert tpl is not None, f"Template '{template_key}' was not found in DB or default registry!"
        assert tpl.get("subject") is not None, f"Template '{template_key}' missing subject!"
        assert tpl.get("message") is not None, f"Template '{template_key}' missing message body!"


def test_admin_email_logs_query_and_retry(db_session):
    # Create test logs
    log1 = EmailDeliveryLog(
        id=uuid.uuid4(),
        idempotency_key="test_log_1",
        recipient_email="customer@gmail.com",
        recipient_name="Customer",
        event_name="lead.created",
        template_key="lead_created",
        subject="New Lead Captured",
        body_html="<p>Lead captured</p>",
        status="SENT",
        attempts=1
    )
    log2 = EmailDeliveryLog(
        id=uuid.uuid4(),
        idempotency_key="test_log_2",
        recipient_email="finance@corp.com",
        recipient_name="Finance",
        event_name="payment.failed",
        template_key="payment_failed",
        subject="Payment Failed Warning",
        body_html="<p>Payment failed</p>",
        status="FAILED",
        attempts=3,
        error_message="SMTP connection timed out"
    )
    db_session.add_all([log1, log2])
    db_session.commit()

    # Query statistics
    total = db_session.query(EmailDeliveryLog).count()
    assert total == 2

    # Retry failed log with configured SMTP
    with patch("app.services.email_service.EmailService.is_smtp_configured", return_value=True), \
         patch("app.workers.email_retry_worker.EmailService.send_email", return_value={"status": "success"}):
        success = NotificationRuleEngine.dispatch_single_log(db_session, log2.id)
        refreshed_log2 = db_session.query(EmailDeliveryLog).filter(EmailDeliveryLog.id == log2.id).first()
        assert refreshed_log2.status == "SENT"


def test_scheduler_lead_sla_breach_detection(db_session):
    owner = User(id=uuid.uuid4(), email="owner@sla.com", full_name="Owner", is_active=True)
    ws = Workspace(id=uuid.uuid4(), name="SLA Space", created_by=owner.id)
    db_session.add_all([owner, ws])
    db_session.commit()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role="founder"))
    db_session.commit()

    from app.models.conversation import ConversationStatus
    conv = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        phone="+919999988888",
        status=ConversationStatus.OPEN
    )
    db_session.add(conv)
    db_session.commit()

    # Create lead created 20 minutes ago (breaching 15m SLA)
    twenty_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=20)
    old_lead = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        conversation_id=conv.id,
        name="Urgent Lead",
        phone="+919999988888",
        status="new",
        created_at=twenty_mins_ago
    )
    db_session.add(old_lead)
    db_session.commit()

    with patch("app.workers.notification_scheduler_worker.SessionLocal", return_value=db_session):
        check_lead_sla_breaches()

    # Check if SLA breach delivery log was staged
    sla_logs = db_session.query(EmailDeliveryLog).filter(
        EmailDeliveryLog.event_name == "lead.sla_breached"
    ).all()
    assert len(sla_logs) >= 1
    assert "SLA" in sla_logs[0].subject or "URGENT" in sla_logs[0].subject


def test_scheduler_inactive_leads_scan(db_session):
    owner = User(id=uuid.uuid4(), email="owner@inactive.com", full_name="Owner", is_active=True)
    ws = Workspace(id=uuid.uuid4(), name="Inactive Space", created_by=owner.id)
    db_session.add_all([owner, ws])
    db_session.commit()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role="founder"))
    db_session.commit()

    conv = Conversation(id=uuid.uuid4(), workspace_id=ws.id, phone="+919777766666")
    db_session.add(conv)
    db_session.commit()

    # Lead inactive for exactly 3 days
    three_days_ago = datetime.now(timezone.utc) - timedelta(days=3)
    dormant_lead = Lead(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        conversation_id=conv.id,
        name="Dormant Lead",
        phone="+919777766666",
        status="active",
        is_converted=False,
        last_activity_at=three_days_ago
    )
    db_session.add(dormant_lead)
    db_session.commit()

    with patch("app.workers.notification_scheduler_worker.SessionLocal", return_value=db_session):
        check_inactive_leads()

    inactive_logs = db_session.query(EmailDeliveryLog).filter(
        EmailDeliveryLog.event_name == "lead.inactive_reminder"
    ).all()
    assert len(inactive_logs) >= 1
    assert "Follow-up" in inactive_logs[0].subject or "Dormant" in inactive_logs[0].body_html or "Lead" in inactive_logs[0].subject


def test_scheduler_daily_summary_report(db_session):
    owner = User(id=uuid.uuid4(), email="owner@daily.com", full_name="Owner", is_active=True)
    ws = Workspace(id=uuid.uuid4(), name="Daily Metrics Space", created_by=owner.id)
    db_session.add_all([owner, ws])
    db_session.commit()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role="founder"))
    db_session.commit()

    with patch("app.workers.notification_scheduler_worker.SessionLocal", return_value=db_session):
        generate_daily_dashboard_summary()

    summary_logs = db_session.query(EmailDeliveryLog).filter(
        EmailDeliveryLog.event_name == "report.daily_summary"
    ).all()
    assert len(summary_logs) >= 1
    assert "Daily" in summary_logs[0].subject
    assert "Briefing" in summary_logs[0].subject or "Summary" in summary_logs[0].subject


def test_user_verification_pending_emission(db_session):
    logs = EventBus.emit(
        event_name="user.verification_pending",
        payload={
            "email": "newuser@gmail.com",
            "user_name": "New User",
            "verification_url": "/verify-otp?email=newuser@gmail.com",
            "expires_in": "5 minutes",
            "otp": "456789"
        },
        idempotency_key="verify_otp_test:newuser@gmail.com",
        db=db_session,
        dispatch_immediately=False
    )
    assert len(logs) == 1
    assert logs[0].recipient_email == "newuser@gmail.com"
    assert logs[0].event_name == "user.verification_pending"
    assert "Verify" in logs[0].subject


def test_broadcast_completed_emission(db_session):
    owner = User(id=uuid.uuid4(), email="campaigner@corp.com", full_name="Marketing Lead", is_active=True)
    ws = Workspace(id=uuid.uuid4(), name="Marketing Hub", created_by=owner.id)
    db_session.add_all([owner, ws])
    db_session.commit()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role="founder"))
    db_session.commit()

    logs = EventBus.emit(
        event_name="broadcast.completed",
        payload={
            "broadcast_name": "Diwali Offer 2026",
            "total_sent": 5000,
            "delivered": 4850,
            "read": 3900,
            "failed": 150,
            "report_url": "/broadcasts/report/123",
            "workspace_name": "Marketing Hub",
            "workspace_id": str(ws.id)
        },
        workspace_id=ws.id,
        actor_id=owner.id,
        idempotency_key="broadcast_done:123",
        db=db_session,
        dispatch_immediately=False
    )
    assert len(logs) >= 1
    assert logs[0].recipient_email == "campaigner@corp.com"
    assert "Diwali Offer 2026" in logs[0].subject
    assert "4850" in logs[0].subject or "4850" in logs[0].body_html


def test_notification_schedules_seeding(db_session):
    schedules = db_session.query(NotificationSchedule).all()
    assert len(schedules) >= 5

    event_names = [s.event_name for s in schedules]
    assert "report.daily_summary" in event_names
    assert "report.weekly_performance" in event_names
    assert "onboarding.milestones" in event_names or "trial.milestones" in event_names
    assert "lead.inactive_scan" in event_names
    assert "lead.sla_scan" in event_names


def test_notification_schedule_calculate_next_run():
    # 1. Daily Schedule (08:00 AM Asia/Kolkata)
    daily_sched = NotificationSchedule(
        event_name="test.daily",
        display_name="Daily Test",
        schedule_type="daily",
        time_of_day="08:00",
        default_timezone="Asia/Kolkata"
    )
    fixed_time = datetime(2026, 8, 18, 2, 0, 0, tzinfo=timezone.utc)  # 07:30 AM IST
    next_run = NotificationScheduleService.calculate_next_run(daily_sched, from_time=fixed_time)
    assert next_run is not None
    # Target 08:00 AM IST on the same day = 02:30 UTC
    assert next_run.hour == 2 and next_run.minute == 30

    # 2. Weekly Schedule (Monday 08:30 AM Asia/Kolkata)
    weekly_sched = NotificationSchedule(
        event_name="test.weekly",
        display_name="Weekly Test",
        schedule_type="weekly",
        time_of_day="08:30",
        day_of_week="monday",
        default_timezone="Asia/Kolkata"
    )
    next_weekly = NotificationScheduleService.calculate_next_run(weekly_sched, from_time=fixed_time)
    assert next_weekly is not None
    # Next Monday at 08:30 IST = 03:00 UTC
    assert next_weekly.hour == 3 and next_weekly.minute == 0


def test_dynamic_scheduler_heartbeat_execution(db_session):
    owner = User(id=uuid.uuid4(), email="owner@dynamic.com", full_name="Dynamic Owner", is_active=True)
    ws = Workspace(id=uuid.uuid4(), name="Dynamic WS", created_by=owner.id)
    db_session.add_all([owner, ws])
    db_session.commit()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role="founder"))
    db_session.commit()

    # Set daily summary next_run_at to past so heartbeat picks it up
    daily_sched = db_session.query(NotificationSchedule).filter(
        NotificationSchedule.event_name == "report.daily_summary"
    ).first()
    assert daily_sched is not None
    daily_sched.next_run_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    db_session.commit()

    with patch("app.workers.notification_scheduler_worker.SessionLocal", return_value=db_session):
        evaluate_dynamic_notification_schedules()

    # Check that daily report was emitted
    summary_logs = db_session.query(EmailDeliveryLog).filter(
        EmailDeliveryLog.event_name == "report.daily_summary"
    ).all()
    assert len(summary_logs) >= 1

    # Check that schedule's next_run_at was advanced to future
    refreshed_sched = db_session.query(NotificationSchedule).filter(
        NotificationSchedule.event_name == "report.daily_summary"
    ).first()
    next_run = refreshed_sched.next_run_at
    if next_run.tzinfo is None:
        next_run = next_run.replace(tzinfo=timezone.utc)
    assert next_run > datetime.now(timezone.utc)


def test_dynamic_schedule_admin_update_and_dry_run(db_session):
    sched = db_session.query(NotificationSchedule).filter(
        NotificationSchedule.event_name == "report.daily_summary"
    ).first()
    assert sched is not None

    # Simulate Admin changing timing from 08:00 to 09:30 AM
    sched.time_of_day = "09:30"
    sched.next_run_at = NotificationScheduleService.calculate_next_run(sched)
    db_session.commit()

    reloaded = db_session.query(NotificationSchedule).filter(
        NotificationSchedule.id == sched.id
    ).first()
    assert reloaded.time_of_day == "09:30"
    assert reloaded.next_run_at is not None


def test_dynamic_free_plan_credits_and_signup_emission(db_session):
    from app.models.plan import Plan
    from app.models.plan_entitlement import PlanEntitlement
    from app.services.billing.entitlement_service import EntitlementService

    # 1. Create a Free Plan with custom 850 credits in database
    free_plan = db_session.query(Plan).filter(Plan.name == "free").first()
    if not free_plan:
        free_plan = Plan(id=uuid.uuid4(), name="free", display_name="Free Plan", price=0, is_active=True)
        db_session.add(free_plan)
        db_session.commit()

    entitlement = db_session.query(PlanEntitlement).filter(PlanEntitlement.plan_id == free_plan.id).first()
    if not entitlement:
        entitlement = PlanEntitlement(
            id=uuid.uuid4(),
            plan_id=free_plan.id,
            included_ai_credits=850,
            included_wcc_wallet=0.0
        )
        db_session.add(entitlement)
    else:
        entitlement.included_ai_credits = 850
    db_session.commit()

    # Verify EntitlementService resolves the dynamic 850 credits
    owner = User(id=uuid.uuid4(), email="dynamic_free@company.com", full_name="Free Plan Owner", is_active=True)
    ws = Workspace(id=uuid.uuid4(), name="Dynamic Free Workspace", created_by=owner.id, plan_type="free")
    db_session.add_all([owner, ws])
    db_session.commit()

    resolved_entitlement = EntitlementService.get_workspace_entitlement(db_session, ws.id)
    dynamic_credits = int(resolved_entitlement.included_ai_credits)
    assert dynamic_credits == 850  # Must match DB configuration dynamically

    # Emit plan.free_activated with dynamic credits
    logs = EventBus.emit(
        event_name="plan.free_activated",
        payload={
            "user_name": owner.full_name,
            "workspace_name": ws.name,
            "plan_name": "Free Plan",
            "credits": dynamic_credits,
            "checklist_url": "/settings/channels",
            "workspace_id": str(ws.id)
        },
        workspace_id=ws.id,
        actor_id=owner.id,
        idempotency_key=f"free_act:{ws.id}",
        db=db_session,
        dispatch_immediately=False
    )
    assert len(logs) == 1
    assert logs[0].recipient_email == "dynamic_free@company.com"
    assert "850" in logs[0].subject or "850" in logs[0].body_html
    assert "trial" not in logs[0].subject.lower()


def test_template_test_render_api():
    from app.routers.admin.notification_templates import test_render_notification_template
    from app.schemas.notification_template import TemplateTestRenderRequest

    req = TemplateTestRenderRequest(
        template_key="free_plan_activated",
        subject="Welcome {{user_name}} to {{workspace_name}}",
        message="Hi {{user_name}},\n\nYour {{plan_name}} is ready with {{credits}} credits!",
        variables={"user_name": "Santhosh", "workspace_name": "AuroMind", "plan_name": "Free Plan", "credits": "500"}
    )
    res = test_render_notification_template(req)
    assert res.rendered_subject == "Welcome Santhosh to AuroMind"
    assert "Hi Santhosh" in res.rendered_message
    assert "500 credits" in res.rendered_message
    assert res.rendered_html is not None
    assert "Santhosh" in res.rendered_html


def test_admin_notification_rules_and_schedules_endpoints(db_session):
    from app.routers.admin.notification_templates import (
        get_notification_rules,
        get_notification_schedules,
        seed_default_notification_templates
    )
    from app.routers.auth import CurrentUser
    from app.core.enums import PlatformRole

    admin_user = User(id=uuid.uuid4(), email="admin@platform.com", full_name="Admin", is_active=True, platform_role=PlatformRole.PLATFORM_ADMIN)
    db_session.add(admin_user)
    db_session.commit()
    curr_user = CurrentUser(user=admin_user, workspace_id=uuid.uuid4())

    # Seed all defaults
    seed_res = seed_default_notification_templates(db=db_session, current_user=curr_user)
    assert seed_res["status"] == "success"
    assert "templates" in seed_res["message"]
    assert "rules" in seed_res["message"]

    # Retrieve rules
    rules = get_notification_rules(event_name=None, is_active=None, db=db_session)
    assert len(rules) >= 22
    rule_events = [r.event_name for r in rules]
    assert "user.signup" in rule_events
    assert "plan.free_activated" in rule_events
    assert "payment.succeeded" in rule_events
    assert "lead.created" in rule_events

    # Retrieve schedules
    schedules = get_notification_schedules(is_active=None, db=db_session)
    assert len(schedules) >= 5
    schedule_events = [s.event_name for s in schedules]
    assert "report.daily_summary" in schedule_events
    assert "report.weekly_performance" in schedule_events


