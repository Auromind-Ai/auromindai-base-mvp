import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.notification_template import NotificationTemplate
from app.models.notification_rule import NotificationRule
from app.models.notification_schedule import NotificationSchedule
from app.models.email_delivery_log import EmailDeliveryLog
from app.models.admin_audit_log import AdminAuditLog
from app.schemas.notification_template import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
    NotificationTemplateResponse,
    TemplateTestRenderRequest,
    TemplateTestRenderResponse,
    TemplateTestSendRequest,
    TemplateTestSendResponse,
    NotificationRuleCreate,
    NotificationRuleUpdate,
    NotificationRuleResponse,
    NotificationScheduleResponse,
    NotificationScheduleUpdate,
    ScheduleRunNowRequest
)
from app.services.notification_template_service import NotificationTemplateService, NotificationRegistry
from app.services.notifications.schedule_service import NotificationScheduleService
from app.routers.auth import CurrentUser, get_current_user
from app.core.config import settings

logger = logging.getLogger("app")

router = APIRouter(prefix="/notification-templates", tags=["admin_notification_templates"])


@router.get("", response_model=List[NotificationTemplateResponse])
@router.get("/", response_model=List[NotificationTemplateResponse])
def get_notification_templates(
    category: Optional[str] = Query(None, description="Filter by category e.g. Security, Billing, Usage, Workflow, CRM, AI"),
    channel: Optional[str] = Query(None, description="Filter by channel e.g. email, in_app, sms"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search term for name, key, subject or message"),
    db: Session = Depends(get_db)
):
    query = db.query(NotificationTemplate)
    if category and category.lower() != "all":
        query = query.filter(NotificationTemplate.category.ilike(category))
    if channel and channel.lower() != "all":
        query = query.filter(NotificationTemplate.channel.ilike(channel))
    if is_active is not None:
        query = query.filter(NotificationTemplate.is_active == is_active)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                NotificationTemplate.name.ilike(search_term),
                NotificationTemplate.template_key.ilike(search_term),
                NotificationTemplate.subject.ilike(search_term),
                NotificationTemplate.title.ilike(search_term),
                NotificationTemplate.message.ilike(search_term)
            )
        )
    return query.order_by(NotificationTemplate.category, NotificationTemplate.name).all()


@router.get("/template-keys", response_model=dict)
def get_supported_template_keys(db: Session = Depends(get_db)):
    """Return all supported system template keys grouped by category."""
    return NotificationTemplateService.get_supported_template_keys(db)


def validate_channel_selection(template_key: str, channel: str):
    allowed = NotificationRegistry.get_allowed_channels(template_key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template key '{template_key}' is not registered."
        )
    if channel == "both":
        if "email" not in allowed or "in_app" not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template key '{template_key}' does not support 'Both' channel mode. Supported channel(s): {', '.join(allowed)}."
            )
    elif channel not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Channel '{channel}' is not allowed for '{template_key}'. Supported channel(s): {', '.join(allowed)}."
        )


@router.post("", response_model=NotificationTemplateResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=NotificationTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_notification_template(
    data: NotificationTemplateCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    
    if not NotificationRegistry.is_supported(data.template_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template key '{data.template_key}' is not a production-supported backend event."
        )

    validate_channel_selection(data.template_key, data.channel)

    # Check for existing template_key
    existing = db.query(NotificationTemplate).filter(
        NotificationTemplate.template_key == data.template_key
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template with key '{data.template_key}' already exists."
        )

    admin_email = current_user.user.email if hasattr(current_user, "user") and current_user.user else "Platform Admin"
    template = NotificationTemplate(
        id=uuid.uuid4(),
        category=data.category,
        template_key=data.template_key,
        name=data.name,
        title=data.title,
        subject=data.subject,
        message=data.message,
        channel=data.channel,
        is_active=data.is_active,
        updated_by=admin_email
    )
    db.add(template)

    # Record Admin Audit Log
    audit_entry = AdminAuditLog(
        id=uuid.uuid4(),
        admin_user_id=str(current_user.id),
        action="NOTIFICATION_TEMPLATE_CREATED",
        reason=f"Created notification template '{data.name}' ({data.template_key} - {data.channel})",
        new_value=data.model_dump()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(template)

    # Invalidate Cache
    NotificationTemplateService.clear_cache(data.template_key)
    return template


# ---------------------------------------------------------
# Utility & Defaults Endpoints
# ---------------------------------------------------------

@router.post("/test-render", response_model=TemplateTestRenderResponse)
def test_render_notification_template(payload: TemplateTestRenderRequest):
    """
    Renders test payload for real-time live preview in Admin UI.
    Default sample context values supplied if missing.
    """
    sample_context = {
        "user_name": "santhosh",
        "workspace_name": "AuroMind AI",
        "ip_address": "192.168.1.100",
        "login_time": "2026-07-23 18:45:00 UTC",
        "amount": "$49.00",
        "invoice_id": "INV-2026-001",
        "payment_date": "July 23, 2026",
        "expiry_date": "July 30, 2026",
        "reset_link": "https://app.auromind.ai/reset-password",
        "resource_name": "AI Tokens",
        "used_amount": "80,000",
        "total_limit": "100,000",
        "workflow_name": "Lead Enrichment Flow",
        "duration": "1.4s",
        "error_message": "Connection timeout on webhook endpoint",
        "lead_name": "John Doe",
        "lead_email": "john@example.com",
        "lead_score": "92",
        "customer_name": "Sarah Connor",
        "escalation_reason": "Requested live human supervisor",
        "timestamp": "2026-07-23 18:45:00 UTC",
        "location": "Chennai, India"
    }

    # Inject registry action metadata if template_key is provided
    if payload.template_key:
        from app.services.notification_template_service import NotificationRegistry
        from app.core.config import settings
        raw_url = getattr(settings, "FRONTEND_URL", None)
        base_app_url = (raw_url or "https://localhost:3000").rstrip("/")
        reg_meta = NotificationRegistry.get_metadata(payload.template_key)
        if reg_meta and "action_route" in reg_meta:
            sample_context["action_route"] = reg_meta["action_route"]
            sample_context["action_label"] = reg_meta.get("action_label", "")
            sample_context["action_url"] = f"{base_app_url}{reg_meta['action_route']}"

    # Override sample values with explicit user variables if passed
    if payload.variables:
        sample_context.update(payload.variables)

    rendered_title = NotificationTemplateService.render_text(payload.title, sample_context) if payload.title else None
    rendered_subject = NotificationTemplateService.render_text(payload.subject, sample_context) if payload.subject else None
    rendered_message = NotificationTemplateService.render_text(payload.message, sample_context)
    
    rendered_html = NotificationTemplateService.render_html_email(
        title=rendered_title or rendered_subject or "Preview Notification",
        message=rendered_message,
        context=sample_context,
        action_url=sample_context.get("action_url"),
        action_label=sample_context.get("action_label")
    )

    return TemplateTestRenderResponse(
        rendered_title=rendered_title,
        rendered_subject=rendered_subject,
        rendered_message=rendered_message,
        rendered_html=rendered_html
    )


@router.post("/test-send", response_model=TemplateTestSendResponse)
def test_send_notification_template(
    payload: TemplateTestSendRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Renders the email template with test variables and sends a real test email
    to the specified recipient using configured SMTP. If SMTP is unconfigured,
    records SIMULATED log status without falsely marking it as SENT.
    """
    recipient = payload.recipient_email.strip()
    if not recipient or "@" not in recipient or "." not in recipient.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid recipient email address is required (e.g., user@example.com)."
        )

    # 1. Prepare sample variables and merge with user-provided variables
    sample_context = {
        "user_name": "Admin Tester",
        "workspace_name": "AuroMind AI Space",
        "email": recipient,
        "plan_name": "Free Plan",
        "credits": "500",
        "amount": "₹4,999",
        "invoice_id": "INV-TEST-001",
        "renewal_date": "August 30, 2026",
        "lead_name": "Test Lead",
        "lead_phone": "+919876543210",
        "lead_score": "95",
        "customer_name": "Sample Customer",
        "total_sent": "1,000",
        "delivered": "980",
        "read": "750",
        "failed": "20",
        "date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
        "week_range": "Aug 10 - Aug 17, 2026",
        "conversions": "25",
        "new_leads": "120",
        "revenue": "₹95,000",
        "unanswered_messages": "2",
        "credit_balance": "2,450"
    }

    if payload.template_key:
        reg_meta = NotificationRegistry.get_metadata(payload.template_key)
        if reg_meta and "action_route" in reg_meta:
            raw_url = getattr(settings, "FRONTEND_URL", None)
            base_app_url = (raw_url or "https://localhost:3000").rstrip("/")
            sample_context["action_route"] = reg_meta["action_route"]
            sample_context["action_label"] = reg_meta.get("action_label", "Open Application")
            sample_context["action_url"] = f"{base_app_url}{reg_meta['action_route']}"

    if payload.variables:
        sample_context.update(payload.variables)

    # 2. Render Title, Subject, Message and HTML
    rendered_title = NotificationTemplateService.render_text(payload.title, sample_context) if payload.title else "Test Notification"
    rendered_subject = NotificationTemplateService.render_text(payload.subject, sample_context) if payload.subject else f"[Test] {rendered_title}"
    rendered_message = NotificationTemplateService.render_text(payload.message, sample_context)

    rendered_html = NotificationTemplateService.render_html_email(
        title=rendered_title,
        message=rendered_message,
        context=sample_context,
        action_url=sample_context.get("action_url"),
        action_label=sample_context.get("action_label")
    )

    # 3. Create EmailDeliveryLog
    log_id = uuid.uuid4()
    idempotency_key = f"test_send:{log_id}:{recipient}"
    
    from app.services.email_service import EmailService

    is_smtp_ready = EmailService.is_smtp_configured()

    if not is_smtp_ready:
        # SMTP not configured -> mark explicitly as SIMULATED
        delivery_log = EmailDeliveryLog(
            id=log_id,
            idempotency_key=idempotency_key,
            recipient_email=recipient,
            recipient_name=sample_context.get("user_name", "Test Recipient"),
            recipient_role="admin_tester",
            event_name="admin.test_send",
            template_key=payload.template_key or "custom_test",
            subject=rendered_subject,
            body_html=rendered_html,
            status="SIMULATED",
            attempts=1,
            max_attempts=1,
            sent_at=datetime.now(timezone.utc),
            error_message="SMTP credentials not configured in settings. Email was rendered and simulated.",
            metadata_json={"is_test_send": True, "variables": sample_context, "simulation": True}
        )
        db.add(delivery_log)
        db.commit()
        db.refresh(delivery_log)

        return TemplateTestSendResponse(
            status="SIMULATED",
            message="SMTP is not configured. Email was rendered and simulated, but not delivered to mailbox.",
            log_id=str(delivery_log.id),
            recipient_email=recipient
        )

    # SMTP configured -> attempt actual delivery
    try:
        EmailService.send_email(
            to_email=recipient,
            subject=rendered_subject,
            body=rendered_html,
            metadata={"test_send": True, "template_key": payload.template_key}
        )
        delivery_log = EmailDeliveryLog(
            id=log_id,
            idempotency_key=idempotency_key,
            recipient_email=recipient,
            recipient_name=sample_context.get("user_name", "Test Recipient"),
            recipient_role="admin_tester",
            event_name="admin.test_send",
            template_key=payload.template_key or "custom_test",
            subject=rendered_subject,
            body_html=rendered_html,
            status="SENT",
            attempts=1,
            max_attempts=1,
            sent_at=datetime.now(timezone.utc),
            error_message=None,
            metadata_json={"is_test_send": True, "variables": sample_context}
        )
        db.add(delivery_log)
        db.commit()
        db.refresh(delivery_log)

        return TemplateTestSendResponse(
            status="SENT",
            message=f"Test email sent successfully to {recipient}.",
            log_id=str(delivery_log.id),
            recipient_email=recipient
        )
    except Exception as exc:
        logger.error(f"Failed to send test email to {recipient}: {exc}")
        delivery_log = EmailDeliveryLog(
            id=log_id,
            idempotency_key=idempotency_key,
            recipient_email=recipient,
            recipient_name=sample_context.get("user_name", "Test Recipient"),
            recipient_role="admin_tester",
            event_name="admin.test_send",
            template_key=payload.template_key or "custom_test",
            subject=rendered_subject,
            body_html=rendered_html,
            status="FAILED",
            attempts=1,
            max_attempts=1,
            error_message=str(exc),
            metadata_json={"is_test_send": True, "variables": sample_context, "error": str(exc)}
        )
        db.add(delivery_log)
        db.commit()
        db.refresh(delivery_log)

        return TemplateTestSendResponse(
            status="FAILED",
            message=f"SMTP delivery failed: {str(exc)}",
            log_id=str(delivery_log.id),
            recipient_email=recipient
        )


@router.post("/seed-defaults")
def seed_default_notification_templates(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    admin_email = current_user.user.email if hasattr(current_user, "user") and current_user.user else "Platform Admin"
    count = NotificationTemplateService.seed_default_templates(db, updated_by=admin_email)
    rules_count = NotificationTemplateService.seed_default_rules(db)
    sched_count = NotificationScheduleService.seed_default_schedules(db)
    return {
        "status": "success",
        "message": f"Seeded {count} templates, {rules_count} default notification rules, and {sched_count} schedules."
    }


# ---------------------------------------------------------
# Notification Rules Endpoints
# ---------------------------------------------------------

@router.get("/rules", response_model=List[NotificationRuleResponse])
def get_notification_rules(
    event_name: Optional[str] = Query(None, description="Filter by event_name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """Retrieve all notification rules."""
    query = db.query(NotificationRule)
    if event_name:
        query = query.filter(NotificationRule.event_name == event_name)
    if is_active is not None:
        query = query.filter(NotificationRule.is_active == is_active)
    return query.order_by(NotificationRule.event_name, NotificationRule.created_at.desc()).all()


@router.post("/rules", response_model=NotificationRuleResponse, status_code=status.HTTP_201_CREATED)
def create_notification_rule(
    data: NotificationRuleCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create a new notification rule mapping an event to a template and recipient roles."""
    new_rule = NotificationRule(
        id=uuid.uuid4(),
        event_name=data.event_name,
        template_key=data.template_key,
        recipient_roles=data.recipient_roles,
        channels=data.channels,
        conditions=data.conditions,
        delay_minutes=data.delay_minutes,
        dedup_window_seconds=data.dedup_window_seconds,
        is_active=data.is_active
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule


@router.put("/rules/{id}", response_model=NotificationRuleResponse)
def update_notification_rule(
    id: uuid.UUID,
    data: NotificationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update an existing notification rule."""
    rule = db.query(NotificationRule).filter(NotificationRule.id == id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification rule not found"
        )

    update_dict = data.dict(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(rule, k, v)

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{id}")
def delete_notification_rule(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Delete a notification rule."""
    rule = db.query(NotificationRule).filter(NotificationRule.id == id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification rule not found"
        )
    db.delete(rule)
    db.commit()
    return {"status": "success", "message": "Notification rule deleted successfully"}


# ---------------------------------------------------------
# Dynamic Notification Schedules Endpoints
# ---------------------------------------------------------

@router.get("/schedules", response_model=List[NotificationScheduleResponse])
def get_notification_schedules(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """Retrieve all dynamic business notification schedules."""
    query = db.query(NotificationSchedule)
    if is_active is not None:
        query = query.filter(NotificationSchedule.is_active == is_active)
    return query.order_by(NotificationSchedule.created_at.asc()).all()


@router.put("/schedules/{id}", response_model=NotificationScheduleResponse)
def update_notification_schedule(
    id: uuid.UUID,
    data: NotificationScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Update a notification schedule (e.g. change time_of_day from 08:00 to 09:30, change day_of_week, timezone, or toggle active)."""
    schedule = db.query(NotificationSchedule).filter(NotificationSchedule.id == id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification schedule not found"
        )

    update_dict = data.dict(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(schedule, k, v)

    # Re-calculate next_run_at with new timings
    schedule.next_run_at = NotificationScheduleService.calculate_next_run(schedule)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.post("/schedules/{id}/run-now")
def run_notification_schedule_now(
    id: uuid.UUID,
    body: Optional[ScheduleRunNowRequest] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Safely trigger an immediate run of a scheduled business job for testing/verification.
    Supports dry_run and test_recipient_email safeguards.
    """
    schedule = db.query(NotificationSchedule).filter(NotificationSchedule.id == id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification schedule not found"
        )

    req = body or ScheduleRunNowRequest()
    if req.dry_run:
        return {
            "status": "dry_run_success",
            "message": f"Dry-run passed for '{schedule.display_name}'. No production emails dispatched.",
            "event_name": schedule.event_name,
            "next_run_at": schedule.next_run_at
        }

    # Dispatch corresponding handler
    from app.workers.notification_scheduler_worker import (
        generate_daily_dashboard_summary,
        generate_weekly_performance_report,
        check_onboarding_and_payment_milestones,
        check_inactive_leads,
        check_lead_sla_breaches
    )

    if schedule.event_name == "report.daily_summary":
        generate_daily_dashboard_summary()
    elif schedule.event_name == "report.weekly_performance":
        generate_weekly_performance_report()
    elif schedule.event_name in ["onboarding.milestones", "trial.milestones"]:
        check_onboarding_and_payment_milestones()
    elif schedule.event_name == "lead.inactive_scan":
        check_inactive_leads()
    elif schedule.event_name == "lead.sla_scan":
        check_lead_sla_breaches()

    return {
        "status": "success",
        "message": f"Successfully triggered manual run of '{schedule.display_name}'.",
        "event_name": schedule.event_name
    }


@router.post("/schedules/seed-defaults")
def seed_default_notification_schedules(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Seed default business notification schedules if not present."""
    count = NotificationScheduleService.seed_default_schedules(db)
    return {"status": "success", "message": f"Seeded {count} default notification schedules."}


# ---------------------------------------------------------
# Individual Template CRUD (Parameterized by template_id UUID)
# Must remain after literal routes to prevent path collision
# ---------------------------------------------------------

@router.get("/{template_id}", response_model=NotificationTemplateResponse)
def get_notification_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Notification template not found")
    return template


@router.put("/{template_id}", response_model=NotificationTemplateResponse)
def update_notification_template(
    template_id: uuid.UUID,
    data: NotificationTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Notification template not found")

    target_channel = data.channel if data.channel is not None else template.channel
    validate_channel_selection(template.template_key, target_channel)

    old_value = {
        "name": template.name,
        "category": template.category,
        "title": template.title,
        "subject": template.subject,
        "message": template.message,
        "channel": template.channel,
        "is_active": template.is_active
    }

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(template, key, value)

    admin_email = current_user.user.email if hasattr(current_user, "user") and current_user.user else "Platform Admin"
    template.updated_by = admin_email

    audit_entry = AdminAuditLog(
        id=uuid.uuid4(),
        admin_user_id=str(current_user.id),
        action="NOTIFICATION_TEMPLATE_UPDATED",
        reason=f"Updated notification template '{template.name}' ({template.template_key})",
        old_value=old_value,
        new_value=update_dict
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(template)

    NotificationTemplateService.clear_cache(template.template_key)
    return template


@router.patch("/{template_id}/toggle", response_model=NotificationTemplateResponse)
def toggle_notification_template_active(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Notification template not found")

    template.is_active = not template.is_active
    admin_email = current_user.user.email if hasattr(current_user, "user") and current_user.user else "Platform Admin"
    template.updated_by = admin_email

    audit_entry = AdminAuditLog(
        id=uuid.uuid4(),
        admin_user_id=str(current_user.id),
        action="NOTIFICATION_TEMPLATE_TOGGLED",
        reason=f"Toggled active state of notification template '{template.name}' to {template.is_active}",
        new_value={"is_active": template.is_active}
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(template)

    NotificationTemplateService.clear_cache(template.template_key)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_200_OK)
def delete_notification_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Notification template not found")

    key, channel, name = template.template_key, template.channel, template.name

    audit_entry = AdminAuditLog(
        id=uuid.uuid4(),
        admin_user_id=str(current_user.id),
        action="NOTIFICATION_TEMPLATE_DELETED",
        reason=f"Deleted notification template '{name}' ({key} - {channel})",
        old_value={"id": str(template.id), "name": name, "template_key": key, "channel": channel}
    )
    db.add(audit_entry)
    db.delete(template)
    db.commit()

    NotificationTemplateService.clear_cache(key)
    return {"status": "success", "message": f"Template '{name}' deleted successfully."}


