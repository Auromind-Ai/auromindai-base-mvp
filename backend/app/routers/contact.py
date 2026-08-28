import logging
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact_inquiry import ContactInquiry
from app.schemas.contact_inquiry import ContactInquiryCreate
from app.services.notification_template_service import NotificationTemplateService
from app.services.notifications.event_registry_service import (
    EventRegistryService,
    get_base_frontend_url,
    build_action_url,
)
from app.services.platform_settings_service import get_setting
from app.workers.email_retry_worker import send_email_with_retry

router = APIRouter(tags=["contact-inquiry"])
logger = logging.getLogger("app")

SALES_TEAM_EMAIL = os.getenv("SALES_TEAM_EMAIL", "")


@router.post("/contact/inquiry", status_code=status.HTTP_201_CREATED)
def submit_contact_inquiry(
    payload: ContactInquiryCreate,
    db: Session = Depends(get_db),
):
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    if not payload.requirement or not payload.requirement.strip():
        raise HTTPException(status_code=400, detail="Requirement cannot be empty.")

    try:
        inquiry = ContactInquiry(
            name=payload.name.strip(),
            phone=payload.phone.strip() if payload.phone else "",
            email=payload.email.strip() if payload.email else "",
            company=payload.company.strip() if payload.company else "Individual",
            budget=payload.budget.strip() if payload.budget else "Not specified",
            requirement=payload.requirement.strip(),
            status="pending",
        )
        db.add(inquiry)
        db.commit()
        db.refresh(inquiry)

        # Dynamic Platform Context & Branding
        db_app_name = get_setting(db, "app_name")
        app_name = db_app_name or os.getenv("APP_NAME", "Auromind AI")
        frontend_url = get_base_frontend_url()

        context = {
            "user_name": inquiry.name,
            "email": inquiry.email,
            "phone": inquiry.phone,
            "company": inquiry.company,
            "budget": inquiry.budget,
            "requirement": inquiry.requirement,
            "app_name": app_name,
            "workspace_name": inquiry.company or "Auromind AI",
            "frontend_url": frontend_url,
            "action_label": "Explore Platform and Features",
            "action_route": "/pricing",
            "action_url": build_action_url("/pricing", frontend_url),
        }

        # Dynamically record / learn schema in EventRegistryService
        try:
            EventRegistryService.record_payload("contact.inquiry.user_ack", context, db=db)
        except Exception:
            pass

        # 1. Send Styled HTML Confirmation Email to User
        if inquiry.email:
            try:
                user_tpl = NotificationTemplateService.get_template(db, "contact_inquiry_user_ack")
                tpl_title = (user_tpl.get("title") if user_tpl and user_tpl.get("title") else "We Received Your Enterprise Request 🚀")
                tpl_subject = (user_tpl.get("subject") if user_tpl and user_tpl.get("subject") else "Thank you for reaching out, {{user_name}}! — {{app_name}}")
                tpl_message = (user_tpl.get("message") if user_tpl and user_tpl.get("message") else "Thank you for reaching out to us regarding our Enterprise and Custom solutions! We have safely received your requirements.")

                rendered_title = NotificationTemplateService.render_text(tpl_title, context)
                rendered_subject = NotificationTemplateService.render_text(tpl_subject, context)
                rendered_message = NotificationTemplateService.render_text(tpl_message, context)

                html_body = NotificationTemplateService.render_html_email(
                    title=rendered_title,
                    message=rendered_message,
                    context=context,
                    action_url=context.get("action_url"),
                    action_label=context.get("action_label"),
                    app_name=app_name,
                )

                send_email_with_retry(
                    to_email=inquiry.email,
                    subject=rendered_subject,
                    body=html_body,
                    max_attempts=3,
                )
            except Exception as e:
                logger.error("Failed to send user confirmation email: %s", e)

        # 2. Send Styled HTML Alert Email to Sales Team
        sales_target = SALES_TEAM_EMAIL.strip() if SALES_TEAM_EMAIL else ""
        if sales_target:
            try:
                sales_tpl = NotificationTemplateService.get_template(db, "contact_inquiry_sales_alert")
                tpl_title = (sales_tpl.get("title") if sales_tpl and sales_tpl.get("title") else "🔥 New Enterprise Lead Received")
                tpl_subject = (sales_tpl.get("subject") if sales_tpl and sales_tpl.get("subject") else "🔥 New Enterprise Lead: {{user_name}} ({{company}})")
                tpl_message = (sales_tpl.get("message") if sales_tpl and sales_tpl.get("message") else f"New enterprise inquiry from {inquiry.name} ({inquiry.email}).\nCompany: {inquiry.company}\nBudget: {inquiry.budget}\nRequirement: {inquiry.requirement}")

                sales_context = dict(context)
                sales_context["action_label"] = "View Inquiries in Admin"
                sales_context["action_route"] = "/admin/inquiries"
                sales_context["action_url"] = build_action_url("/admin/inquiries", frontend_url)

                rendered_title = NotificationTemplateService.render_text(tpl_title, sales_context)
                rendered_subject = NotificationTemplateService.render_text(tpl_subject, sales_context)
                rendered_message = NotificationTemplateService.render_text(tpl_message, sales_context)

                sales_html = NotificationTemplateService.render_html_email(
                    title=rendered_title,
                    message=rendered_message,
                    context=sales_context,
                    action_url=sales_context.get("action_url"),
                    action_label=sales_context.get("action_label"),
                    app_name=app_name,
                )

                send_email_with_retry(
                    to_email=sales_target,
                    subject=rendered_subject,
                    body=sales_html,
                    max_attempts=3,
                )
            except Exception as e:
                logger.error("Failed to send sales team alert email: %s", e)

        return {
            "status": "success",
            "message": "Inquiry recorded successfully",
            "id": str(inquiry.id),
        }

    except Exception as exc:
        db.rollback()
        logger.exception("Failed to save contact inquiry: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to submit inquiry.")