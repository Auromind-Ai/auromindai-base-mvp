import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.email_delivery_log import EmailDeliveryLog
from app.services.notifications.notification_rule_engine import NotificationRuleEngine
from app.routers.auth import CurrentUser, get_current_user
from app.core.security import to_uuid

router = APIRouter(prefix="/email-logs", tags=["admin_email_logs"])


class EmailLogItemResponse(BaseModel):
    id: uuid.UUID
    idempotency_key: str
    workspace_id: Optional[uuid.UUID]
    recipient_email: str
    recipient_name: Optional[str]
    recipient_role: Optional[str]
    event_name: str
    template_key: str
    subject: str
    status: str
    attempts: int
    max_attempts: int
    error_message: Optional[str]
    scheduled_for: Optional[datetime]
    sent_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmailLogListResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[EmailLogItemResponse]


class EmailLogDetailResponse(EmailLogItemResponse):
    body_html: str
    metadata_json: Optional[Dict[str, Any]] = None


@router.get("", response_model=EmailLogListResponse)
@router.get("/", response_model=EmailLogListResponse)
def get_email_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter by status: PENDING, SENT, FAILED, RETRYING"),
    event_name: Optional[str] = Query(None, description="Filter by event_name"),
    recipient_email: Optional[str] = Query(None, description="Filter by recipient email"),
    workspace_id: Optional[str] = Query(None, description="Filter by workspace_id"),
    search: Optional[str] = Query(None, description="Search term for recipient, subject, or event"),
    db: Session = Depends(get_db)
):
    """Retrieve paginated email delivery logs with rich search and filtering."""
    query = db.query(EmailDeliveryLog)

    if status and status.lower() != "all":
        query = query.filter(EmailDeliveryLog.status.ilike(status))

    if event_name and event_name.lower() != "all":
        query = query.filter(EmailDeliveryLog.event_name == event_name)

    if recipient_email:
        query = query.filter(EmailDeliveryLog.recipient_email.ilike(f"%{recipient_email.strip()}%"))

    ws_uuid = to_uuid(workspace_id)
    if ws_uuid:
        query = query.filter(EmailDeliveryLog.workspace_id == ws_uuid)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                EmailDeliveryLog.recipient_email.ilike(term),
                EmailDeliveryLog.subject.ilike(term),
                EmailDeliveryLog.event_name.ilike(term),
                EmailDeliveryLog.template_key.ilike(term)
            )
        )

    total = query.count()
    items = query.order_by(EmailDeliveryLog.created_at.desc()).offset(skip).limit(limit).all()

    return EmailLogListResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=items
    )


@router.get("/stats")
def get_email_stats(db: Session = Depends(get_db)):
    """Summary statistics for email delivery health."""
    total = db.query(func.count(EmailDeliveryLog.id)).scalar() or 0
    sent = db.query(func.count(EmailDeliveryLog.id)).filter(EmailDeliveryLog.status == "SENT").scalar() or 0
    failed = db.query(func.count(EmailDeliveryLog.id)).filter(EmailDeliveryLog.status == "FAILED").scalar() or 0
    pending = db.query(func.count(EmailDeliveryLog.id)).filter(EmailDeliveryLog.status == "PENDING").scalar() or 0
    retrying = db.query(func.count(EmailDeliveryLog.id)).filter(EmailDeliveryLog.status == "RETRYING").scalar() or 0

    success_rate = (sent / total * 100) if total > 0 else 100.0

    return {
        "total": total,
        "sent": sent,
        "failed": failed,
        "pending": pending,
        "retrying": retrying,
        "success_rate": round(success_rate, 2)
    }


@router.get("/{id}", response_model=EmailLogDetailResponse)
def get_email_log_detail(
    id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Retrieve full details of a specific email delivery log including HTML body."""
    log = db.query(EmailDeliveryLog).filter(EmailDeliveryLog.id == id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email delivery log not found"
        )
    return log


@router.post("/{id}/retry")
def retry_failed_email_log(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Manually re-trigger sending of a failed or pending email delivery log."""
    log = db.query(EmailDeliveryLog).filter(EmailDeliveryLog.id == id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email delivery log not found"
        )

    # Reset status and attempts
    log.status = "PENDING"
    log.attempts = max(0, log.attempts - 1)
    db.commit()

    success = NotificationRuleEngine.dispatch_single_log(db, log.id)
    return {
        "status": "success" if success else "failed",
        "message": "Email delivered successfully" if success else "Retry attempt failed",
        "log_status": log.status
    }
