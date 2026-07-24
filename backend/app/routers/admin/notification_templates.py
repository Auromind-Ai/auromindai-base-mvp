import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.notification_template import NotificationTemplate
from app.models.admin_audit_log import AdminAuditLog
from app.schemas.notification_template import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
    NotificationTemplateResponse,
    TemplateTestRenderRequest,
    TemplateTestRenderResponse
)
from app.services.notification_template_service import NotificationTemplateService,NotificationRegistry
from app.routers.auth import CurrentUser, get_current_user

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

    # Check for existing key-channel pair
    existing = db.query(NotificationTemplate).filter(
        NotificationTemplate.template_key == data.template_key,
        NotificationTemplate.channel == data.channel
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template with key '{data.template_key}' and channel '{data.channel}' already exists."
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
    NotificationTemplateService.clear_cache(data.template_key, data.channel)
    return template


@router.get("/{template_id}", response_model=NotificationTemplateResponse)
def get_notification_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    try:
        clean_id = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid template ID format")

    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == clean_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Notification template not found")
    return template


@router.put("/{template_id}", response_model=NotificationTemplateResponse)
def update_notification_template(
    template_id: str,
    data: NotificationTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        clean_id = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid template ID format")

    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == clean_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Notification template not found")

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

    NotificationTemplateService.clear_cache(template.template_key, template.channel)
    return template


@router.patch("/{template_id}/toggle", response_model=NotificationTemplateResponse)
def toggle_notification_template_active(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        clean_id = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid template ID format")

    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == clean_id).first()
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

    NotificationTemplateService.clear_cache(template.template_key, template.channel)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_200_OK)
def delete_notification_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        clean_id = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid template ID format")

    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == clean_id).first()
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

    NotificationTemplateService.clear_cache(key, channel)
    return {"status": "success", "message": f"Template '{name}' deleted successfully."}


@router.post("/test-render", response_model=TemplateTestRenderResponse)
def test_render_notification_template(payload: TemplateTestRenderRequest):
    """
    Renders test payload for real-time live preview in Admin UI.
    Default sample context values supplied if missing.
    """
    sample_context = {
        "user_name": "Arun",
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

    return TemplateTestRenderResponse(
        rendered_title=rendered_title,
        rendered_subject=rendered_subject,
        rendered_message=rendered_message
    )


@router.post("/seed-defaults")
def seed_default_notification_templates(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    admin_email = current_user.user.email if hasattr(current_user, "user") and current_user.user else "Platform Admin"
    count = NotificationTemplateService.seed_default_templates(db, updated_by=admin_email)
    return {"status": "success", "message": f"Seeded {count} default notification templates."}
