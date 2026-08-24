import logging
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact_inquiry import ContactInquiry
from app.schemas.contact_inquiry import ContactInquiryCreate
from app.services.notification_template_service import NotificationTemplateService
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
            phone=payload.phone.strip(),
            email=payload.email.strip(),
            company=payload.company.strip() if payload.company else "Individual",
            budget=payload.budget.strip() if payload.budget else "Not specified",
            requirement=payload.requirement.strip(),
            status="pending",
        )
        db.add(inquiry)
        db.commit()
        db.refresh(inquiry)

        context = {
            "user_name": inquiry.name,
            "email": inquiry.email,
            "phone": inquiry.phone,
            "company": inquiry.company,
            "budget": inquiry.budget,
            "requirement": inquiry.requirement,
        }

        try:
            user_tpl = NotificationTemplateService.get_template(db, "contact_inquiry_user_ack")
            sub = NotificationTemplateService.render_text(
                user_tpl.get("subject", "Thank you for reaching out! - Auromind") if user_tpl else "Thank you for reaching out! - Auromind",
                context,
            )
            body = NotificationTemplateService.render_text(
                user_tpl.get("message", "We have received your requirement.") if user_tpl else "We have received your requirement.",
                context,
            )
            send_email_with_retry(
                to_email=inquiry.email,
                subject=sub,
                body=body,
                max_attempts=3,
            )
        except Exception as e:
            logger.error("Failed to queue user email: %s", e)

        sales_target = SALES_TEAM_EMAIL.strip() if SALES_TEAM_EMAIL else ""
        if sales_target:
            try:
                sales_tpl = NotificationTemplateService.get_template(db, "contact_inquiry_sales_alert")
                sub = NotificationTemplateService.render_text(
                    sales_tpl.get("subject", f"🔥 New Enterprise Lead: {inquiry.name}") if sales_tpl else f"🔥 New Enterprise Lead: {inquiry.name}",
                    context,
                )
                body = NotificationTemplateService.render_text(
                    sales_tpl.get("message", f"New inquiry from {inquiry.name}") if sales_tpl else f"New inquiry from {inquiry.name}",
                    context,
                )
                send_email_with_retry(
                    to_email=sales_target,
                    subject=sub,
                    body=body,
                    max_attempts=3,
                )
            except Exception as e:
                logger.error("Failed to queue sales email: %s", e)

        return {
            "status": "success",
            "message": "Inquiry recorded successfully",
            "id": str(inquiry.id),
        }

    except Exception as exc:
        db.rollback()
        logger.exception("Failed to save contact inquiry: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to submit inquiry.")