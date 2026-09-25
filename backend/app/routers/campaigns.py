import logging
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.routers.auth import get_current_user, CurrentUser
from app.core.security import verify_workspace_access, to_uuid
from app.models.campaign import Campaign, CampaignRecipient, ContactList, ContactListMember
from app.models.templates import Template
from app.models.workspace import Workspace, WorkspaceMember
from app.models.ai_action import Lead
from app.schemas.campaign import (
    PreflightEstimateRequest,
    PreflightEstimateResponse,
    CampaignCreateRequest,
    CampaignUpdateRequest,
    CampaignResponse,
    ContactListCreateRequest,
)
from app.services.marketing.campaign_service import CampaignService
from app.services.marketing.audience_service import AudienceService
from app.services.marketing.whatsapp_tier_service import WhatsAppTierService
from app.services.marketing.error_classification import ErrorClassificationService
from app.core.redis_lock import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketing", tags=["marketing"])


def resolve_workspace_id(current_user: CurrentUser, db: Session, workspace_id: Optional[str]) -> uuid.UUID:
   
    if workspace_id and str(workspace_id).strip():
        ws_uuid = to_uuid(workspace_id)
        verify_workspace_access(current_user, db, ws_uuid)
        return ws_uuid

    user_id = to_uuid(current_user.id) if getattr(current_user, "id", None) else None
    if getattr(current_user, "default_workspace_id", None):
        ws_uuid = to_uuid(current_user.default_workspace_id)
        verify_workspace_access(current_user, db, ws_uuid)
        return ws_uuid

    if user_id:
        ws = db.query(Workspace).filter(Workspace.created_by == user_id).first()
        if not ws:
            member = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user_id).first()
            if member:
                ws = db.query(Workspace).filter(Workspace.id == member.workspace_id).first()
        if ws:
            return ws.id

    raise HTTPException(status_code=400, detail="No active workspace found for user. Please specify workspace_id.")


@router.post("/campaigns/estimate", response_model=PreflightEstimateResponse)
async def estimate_campaign_cost(
    payload: PreflightEstimateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    ws_uuid = to_uuid(payload.workspace_id)
    verify_workspace_access(current_user, db, ws_uuid)

    try:
        data = CampaignService.calculate_preflight_estimation(
            db=db,
            workspace_id=ws_uuid,
            valid_recipients_count=payload.valid_recipients_count,
            category=payload.category,
        )
        return data
    except Exception as exc:
        logger.error("Error calculating campaign estimation: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/campaigns")
async def create_campaign(
    payload: CampaignCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    ws_uuid = resolve_workspace_id(current_user, db, payload.workspace_id)
    user_id = to_uuid(current_user.id) if getattr(current_user, "id", None) else None

    
    # 1. Validate template ownership if specified
    if payload.template_id:
        tmpl_uuid = to_uuid(payload.template_id)
        tmpl = db.query(Template).filter(Template.id == tmpl_uuid).first()
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template not found")
        if tmpl.workspace_id and tmpl.workspace_id != ws_uuid:
            if not tmpl.system_tag and (not user_id or tmpl.user_id != user_id):
                raise HTTPException(status_code=403, detail="Access denied to specified template")

    # 2. Validate contact_list_ids ownership if specified
    if payload.contact_list_ids:
        for cl_id in payload.contact_list_ids:
            cl_uuid = to_uuid(cl_id)
            cl = db.query(ContactList).filter(ContactList.id == cl_uuid).first()
            if not cl:
                raise HTTPException(status_code=404, detail=f"Contact list {cl_id} not found")
            if cl.workspace_id != ws_uuid:
                raise HTTPException(status_code=403, detail=f"Access denied to contact list {cl_id}")

    # 3. Validate lead_ids ownership if specified
    if payload.lead_ids:
        foreign_leads = db.query(Lead.id).filter(
            Lead.id.in_([to_uuid(lid) for lid in payload.lead_ids]),
            Lead.workspace_id != ws_uuid
        ).first()
        if foreign_leads:
            raise HTTPException(status_code=403, detail="Access denied to one or more selected leads")

    # 4. Validate phone_number_id ownership if specified
    if payload.phone_number_id:
        ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if ws:
            valid_numbers = {
                ws.meta_phone_number_id,
                ws.meta_display_phone,
                ws.twilio_phone_number
            }
            valid_numbers = {str(n).strip() for n in valid_numbers if n}
            if valid_numbers and str(payload.phone_number_id).strip() not in valid_numbers:
                raise HTTPException(status_code=403, detail="Phone number does not belong to this workspace")

    data = payload.model_dump()

    try:
        campaign = CampaignService.create_campaign(
            db=db,
            workspace_id=ws_uuid,
            user_id=user_id,
            data=data,
        )

        if getattr(payload, "auto_launch", False):
            try:
                campaign = CampaignService.launch_campaign(db, campaign.id)
            except Exception as launch_err:
                logger.warning("Auto-launch failed for campaign %s: %s", campaign.id, launch_err)

        return {
            "status": "success",
            "campaign_id": str(campaign.id),
            "campaign_name": campaign.name,
            "total_recipients": campaign.total_recipients,
            "campaign_status": campaign.status,
            "held_cost": float(getattr(campaign, "held_cost", 0.0) or 0.0),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error creating campaign: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/campaigns")
async def list_campaigns(
    workspace_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Lists campaigns with real-time counters, search, date range, and status filter.
    Supports both snake_case and camelCase attributes for complete frontend compatibility.
    """
    ws_uuid = resolve_workspace_id(current_user, db, workspace_id)

    query = db.query(Campaign).filter(Campaign.workspace_id == ws_uuid)
    if status_filter and status_filter.lower() != "all":
        st = status_filter.lower()
        if st == "sending":
            query = query.filter(Campaign.status.in_(["in_progress", "sending"]))
        else:
            query = query.filter(Campaign.status == st)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(Campaign.name.ilike(term))

    if start_date and start_date.strip():
        query = query.filter(Campaign.created_at >= start_date.strip())

    if end_date and end_date.strip():
        query = query.filter(Campaign.created_at <= end_date.strip())

    total = query.count()
    campaigns = query.order_by(Campaign.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for c in campaigns:
        # Calculate human date
        date_str = c.created_at.strftime("%b %d, %Y") if c.created_at else "Today"

        # Calculate response rate
        s_count = c.sent_count or c.accepted_count or 0
        r_count = c.read_count or 0
        resp_rate = f"{round((r_count / s_count) * 100, 1)}%" if s_count > 0 else "0.0%"

        items.append({
            "id": str(c.id),
            "workspace_id": str(c.workspace_id),
            "name": c.name,
            "campaign_type": c.campaign_type,
            "type": (c.campaign_type or "promotional").capitalize(),
            "status": c.status,
            "total_recipients": c.total_recipients,
            "recipientsCount": c.total_recipients,
            "valid_recipients": c.valid_recipients,
            "validRecipients": c.valid_recipients,
            "invalid_recipients": c.invalid_recipients,
            "invalidRecipients": c.invalid_recipients,
            "accepted_count": c.accepted_count,
            "sent_count": c.sent_count,
            "sentCount": c.sent_count or c.accepted_count,
            "delivered_count": c.delivered_count,
            "deliveredCount": c.delivered_count,
            "read_count": c.read_count,
            "repliesCount": c.read_count,
            "failed_count": c.failed_count,
            "failedCount": c.failed_count,
            "responseRate": resp_rate,
            "estimated_cost": float(c.estimated_cost or 0.0),
            "actual_cost": float(c.actual_cost or 0.0),
            "whatsappNumber": c.phone_number_id,
            "audienceListName": c.campaign_goal or "All Customers",
            "paused_reason": c.paused_reason,
            "next_available_capacity_at": c.next_available_capacity_at.isoformat() if c.next_available_capacity_at else None,
            "schedule_type": c.schedule_type,
            "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
            "send_gradually": c.send_gradually,
            "sendGradually": c.send_gradually,
            "messages_per_minute": c.messages_per_minute,
            "sendingRate": c.messages_per_minute,
            "skip_invalid_numbers": c.skip_invalid_numbers,
            "skipInvalid": c.skip_invalid_numbers,
            "stop_on_high_failure_rate": c.stop_on_high_failure_rate,
            "stopOnFailure": c.stop_on_high_failure_rate,
            "quiet_hours_enabled": c.quiet_hours_enabled,
            "quietHours": c.quiet_hours_enabled,
            "message_content": c.message_content,
            "media_url": c.media_url,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "date": date_str,
        })

    return {"total": total, "items": items, "limit": limit, "offset": offset}


def serialize_campaign_recipient(r: CampaignRecipient) -> dict:
    error_info = {}
    is_failed_state = (
        r.status in ("failed", "skipped_marketing_frequency_limit", "skipped_invalid", "skipped_opted_out", "held_portfolio_limit")
        or bool(r.error_code)
    )
    if is_failed_state:
        code = r.error_code or (
            "131049" if r.status == "skipped_marketing_frequency_limit"
            else ("SKIPPED_INVALID" if r.status == "skipped_invalid"
            else ("SKIPPED_OPTED_OUT" if r.status == "skipped_opted_out" else "131026"))
        )
        error_info = ErrorClassificationService.classify(code, r.error_message)

    return {
        "id": str(r.id),
        "campaign_id": str(r.campaign_id),
        "lead_id": str(r.lead_id) if r.lead_id else None,
        "phone_number": r.phone_number,
        "phone": r.phone_number,
        "normalized_phone": r.normalized_phone,
        "recipient_name": r.recipient_name,
        "name": r.recipient_name or r.phone_number,
        "variables": r.variables or {},
        "status": r.status,
        "wamid": r.wamid,
        "error_code": r.error_code or error_info.get("error_code"),
        "error_message": r.error_message,
        "error_title": error_info.get("title"),
        "error_category": error_info.get("category"),
        "what_this_means": error_info.get("what_this_means"),
        "what_you_can_do": error_info.get("what_you_can_do"),
        "severity": error_info.get("severity", "error"),
        "is_retryable": error_info.get("is_retryable", False),
        "sent_at": r.sent_at.isoformat() if r.sent_at else (r.accepted_at.isoformat() if r.accepted_at else None),
        "accepted_at": r.accepted_at.isoformat() if r.accepted_at else None,
        "delivered_at": r.delivered_at.isoformat() if r.delivered_at else (r.read_at.isoformat() if r.read_at else None),
        "read_at": r.read_at.isoformat() if r.read_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "cost": float(r.cost or 0.0),
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign_detail(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)

    # Calculate deliverability percentages
    total = campaign.valid_recipients or campaign.total_recipients or 1
    sent = campaign.sent_count or campaign.accepted_count or 0
    delivered = campaign.delivered_count or 0
    read = campaign.read_count or 0
    failed = campaign.failed_count or 0

    delivery_rate = round((delivered / total) * 100, 1) if total > 0 else 0.0
    failed_rate = round((failed / total) * 100, 1) if total > 0 else 0.0
    sent_rate = round((sent / total) * 100, 1) if total > 0 else 0.0
    read_rate = round((read / total) * 100, 1) if total > 0 else 0.0

    # Calculate error breakdown for failed messages
    failed_recipients = [
        r for r in campaign.recipients
        if r.status in ("failed", "skipped_marketing_frequency_limit", "skipped_invalid", "skipped_opted_out") or r.error_code
    ]

    breakdown_map = {}
    for fr in failed_recipients:
        code = fr.error_code or (
            "131049" if fr.status == "skipped_marketing_frequency_limit"
            else ("SKIPPED_INVALID" if fr.status == "skipped_invalid"
            else ("SKIPPED_OPTED_OUT" if fr.status == "skipped_opted_out" else "131026"))
        )
        if code not in breakdown_map:
            cls_info = ErrorClassificationService.classify(code, fr.error_message)
            breakdown_map[code] = {
                "error_code": code,
                "error_title": cls_info.get("title", "Delivery Failed"),
                "error_category": cls_info.get("category", "GENERAL_DELIVERY_FAILURE"),
                "count": 0
            }
        breakdown_map[code]["count"] += 1

    error_breakdown = sorted(list(breakdown_map.values()), key=lambda x: x["count"], reverse=True)

    return {
        "id": str(campaign.id),
        "workspace_id": str(campaign.workspace_id),
        "name": campaign.name,
        "campaign_type": campaign.campaign_type,
        "type": (campaign.campaign_type or "promotional").capitalize(),
        "status": campaign.status,
        "total_recipients": campaign.total_recipients,
        "recipientsCount": campaign.total_recipients,
        "valid_recipients": campaign.valid_recipients,
        "validRecipients": campaign.valid_recipients,
        "invalid_recipients": campaign.invalid_recipients,
        "invalidRecipients": campaign.invalid_recipients,
        "accepted_count": campaign.accepted_count,
        "sent_count": campaign.sent_count,
        "sentCount": campaign.sent_count or campaign.accepted_count,
        "delivered_count": campaign.delivered_count,
        "deliveredCount": campaign.delivered_count,
        "read_count": campaign.read_count,
        "repliesCount": campaign.read_count,
        "failed_count": campaign.failed_count,
        "failedCount": campaign.failed_count,
        "skipped_marketing_cap_count": campaign.skipped_marketing_cap_count,
        "sent_rate": sent_rate,
        "delivery_rate": delivery_rate,
        "failed_rate": failed_rate,
        "read_rate": read_rate,
        "estimated_cost": float(campaign.estimated_cost or 0.0),
        "held_cost": float(campaign.held_cost or 0.0),
        "actual_cost": float(campaign.actual_cost or 0.0),
        "whatsappNumber": campaign.phone_number_id,
        "phone_number_id": campaign.phone_number_id,
        "audience_source": campaign.audience_source,
        "audienceListName": campaign.campaign_goal or "All Customers",
        "message_type": campaign.message_type,
        "template_id": str(campaign.template_id) if campaign.template_id else None,
        "paused_reason": campaign.paused_reason,
        "next_available_capacity_at": campaign.next_available_capacity_at.isoformat() if campaign.next_available_capacity_at else None,
        "schedule_type": campaign.schedule_type,
        "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None,
        "send_gradually": campaign.send_gradually,
        "sendGradually": campaign.send_gradually,
        "messages_per_minute": campaign.messages_per_minute,
        "sendingRate": campaign.messages_per_minute,
        "skip_invalid_numbers": campaign.skip_invalid_numbers,
        "skipInvalid": campaign.skip_invalid_numbers,
        "stop_on_high_failure_rate": campaign.stop_on_high_failure_rate,
        "stopOnFailure": campaign.stop_on_high_failure_rate,
        "failure_rate_threshold": campaign.failure_rate_threshold,
        "quiet_hours_enabled": campaign.quiet_hours_enabled,
        "quietHours": campaign.quiet_hours_enabled,
        "quiet_hours_start": campaign.quiet_hours_start,
        "quiet_hours_end": campaign.quiet_hours_end,
        "message_content": campaign.message_content,
        "media_url": campaign.media_url,
        "media_type": campaign.media_type,
        "started_at": campaign.started_at.isoformat() if campaign.started_at else None,
        "completed_at": campaign.completed_at.isoformat() if campaign.completed_at else None,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
        "date": campaign.created_at.strftime("%b %d, %Y") if campaign.created_at else "Today",
        "error_breakdown": error_breakdown,
        "recipients": [serialize_campaign_recipient(r) for r in campaign.recipients],
    }


@router.get("/campaigns/{campaign_id}/recipients")
async def list_campaign_recipients(
    campaign_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    error_code: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)

    query = db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == c_uuid)

    # Status filter
    if status_filter and isinstance(status_filter, str):
        sf = status_filter.lower().strip()
        if sf == "sent":
            query = query.filter(
                or_(
                    CampaignRecipient.status.in_(["sent", "accepted", "delivered", "read"]),
                    CampaignRecipient.sent_at.isnot(None),
                    CampaignRecipient.accepted_at.isnot(None),
                    CampaignRecipient.wamid.isnot(None),
                )
            )
        elif sf == "delivered":
            query = query.filter(
                or_(
                    CampaignRecipient.status.in_(["delivered", "read"]),
                    CampaignRecipient.delivered_at.isnot(None),
                    CampaignRecipient.read_at.isnot(None),
                )
            )
        elif sf == "failed":
            query = query.filter(
                or_(
                    CampaignRecipient.status.in_(["failed", "skipped_marketing_frequency_limit", "skipped_invalid", "skipped_opted_out", "held_portfolio_limit"]),
                    CampaignRecipient.error_code.isnot(None),
                )
            )
        elif sf not in ("all", ""):
            query = query.filter(CampaignRecipient.status == sf)

    # Search filter
    if search and isinstance(search, str) and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CampaignRecipient.phone_number.ilike(term),
                CampaignRecipient.normalized_phone.ilike(term),
                CampaignRecipient.recipient_name.ilike(term),
                CampaignRecipient.wamid.ilike(term),
            )
        )

    # Error code filter
    if error_code and isinstance(error_code, str) and error_code.strip() and error_code.strip().lower() != "all":
        ec = error_code.strip().upper()
        if ec == "131049":
            query = query.filter(
                or_(
                    CampaignRecipient.error_code == "131049",
                    CampaignRecipient.status == "skipped_marketing_frequency_limit"
                )
            )
        else:
            query = query.filter(CampaignRecipient.error_code == ec)

    total_filtered = query.count()
    recipients = query.order_by(CampaignRecipient.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Pre-calculate counts across the whole campaign for UI tabs
    total_count = campaign.valid_recipients if campaign.valid_recipients is not None else (campaign.total_recipients or 0)
    sent_count = campaign.sent_count if campaign.sent_count is not None else (campaign.accepted_count or 0)
    delivered_count = campaign.delivered_count or 0
    failed_count = campaign.failed_count or 0

    # Error breakdown across all failed messages in campaign
    aggregated_errors = db.query(
        CampaignRecipient.error_code, 
        func.count(CampaignRecipient.id)
    ).filter(
        CampaignRecipient.campaign_id == c_uuid,
        CampaignRecipient.error_code.isnot(None)
    ).group_by(CampaignRecipient.error_code).all()

    breakdown_map = {}
    for code, count in aggregated_errors:
        info = ErrorClassificationService.classify(code)
        breakdown_map[code] = {
            "error_code": code,
            "error_title": info.get("title", "Delivery Failed"),
            "error_category": info.get("category", "GENERAL_DELIVERY_FAILURE"),
            "count": count
        }

    # Also account for any skipped_marketing_frequency_limit
    skipped_count = db.query(func.count(CampaignRecipient.id)).filter(
        CampaignRecipient.campaign_id == c_uuid,
        CampaignRecipient.status == "skipped_marketing_frequency_limit",
        CampaignRecipient.error_code.is_(None)
    ).scalar() or 0
    if skipped_count > 0:
        if "131049" in breakdown_map:
            breakdown_map["131049"]["count"] += skipped_count
        else:
            info = ErrorClassificationService.classify("131049")
            breakdown_map["131049"] = {
                "error_code": "131049",
                "error_title": info.get("title", "Marketing message limit reached"),
                "error_category": info.get("category", "MARKETING_FREQUENCY_LIMIT"),
                "count": skipped_count
            }

    error_breakdown = sorted(list(breakdown_map.values()), key=lambda x: x["count"], reverse=True)

    return {
        "items": [serialize_campaign_recipient(r) for r in recipients],
        "total": total_filtered,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total_filtered + limit - 1) // limit),
        "counts": {
            "total": total_count,
            "sent": sent_count,
            "delivered": delivered_count,
            "failed": failed_count,
        },
        "error_breakdown": error_breakdown,
    }



@router.patch("/campaigns/{campaign_id}")
@router.put("/campaigns/{campaign_id}")
async def update_campaign_endpoint(
    campaign_id: str,
    payload: CampaignUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Updates an existing campaign (especially drafts).
    """
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)
    user_id = to_uuid(current_user.id) if getattr(current_user, "id", None) else None

    # Validate template ownership if specified
    if payload.template_id:
        tmpl_uuid = to_uuid(payload.template_id)
        tmpl = db.query(Template).filter(Template.id == tmpl_uuid).first()
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template not found")
        if tmpl.workspace_id and tmpl.workspace_id != campaign.workspace_id:
            if not tmpl.system_tag and (not user_id or tmpl.user_id != user_id):
                raise HTTPException(status_code=403, detail="Access denied to specified template")

    data = payload.model_dump(exclude_unset=True)

    try:
        updated = CampaignService.update_campaign(
            db=db,
            campaign_id=c_uuid,
            data=data,
            user_id=user_id,
        )

        should_launch = bool(getattr(payload, "auto_launch", False)) and data.get("status") != "draft"
        if should_launch or (data.get("status") in ("in_progress", "scheduled") and data.get("status") != "draft"):
            try:
                updated = CampaignService.launch_campaign(db, updated.id)
            except Exception as launch_err:
                logger.warning("Auto-launch failed for updated campaign %s: %s", updated.id, launch_err)

        return {
            "status": "success",
            "campaign_id": str(updated.id),
            "campaign_name": updated.name,
            "total_recipients": updated.total_recipients,
            "campaign_status": updated.status,
            "held_cost": float(getattr(updated, "held_cost", 0.0) or 0.0),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error updating campaign %s: %s", c_uuid, exc)
        raise HTTPException(status_code=500, detail=str(exc))



@router.post("/campaigns/{campaign_id}/launch")
async def launch_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Launches campaign execution: preflight check, locks escrow in WCCWallet, dispatches worker.
    """
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)

    try:
        updated = CampaignService.launch_campaign(db, c_uuid)
        return {
            "status": "success",
            "campaign_id": str(updated.id),
            "campaign_status": updated.status,
            "held_cost": float(updated.held_cost),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error launching campaign: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: str,
    reason: str = Query("MANUAL_PAUSE"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)
    updated = CampaignService.pause_campaign(db, c_uuid, reason=reason)
    return {"status": "paused", "campaign_id": str(updated.id), "reason": updated.paused_reason}


@router.post("/campaigns/{campaign_id}/resume")
async def resume_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)
    updated = CampaignService.resume_campaign(db, c_uuid)
    return {"status": "in_progress", "campaign_id": str(updated.id)}


@router.post("/campaigns/{campaign_id}/cancel")
async def cancel_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)
    updated = CampaignService.cancel_campaign(db, c_uuid)
    return {"status": "cancelled", "campaign_id": str(updated.id)}


@router.post("/campaigns/{campaign_id}/duplicate")
async def duplicate_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Duplicates an existing campaign as a new draft, copying settings and recipient snapshot.
    """
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)
    user_id = to_uuid(current_user.id) if getattr(current_user, "id", None) else None

    cloned = CampaignService.duplicate_campaign(db, c_uuid, user_id=user_id)
    return {
        "status": "success",
        "campaign_id": str(cloned.id),
        "campaign_name": cloned.name,
        "total_recipients": cloned.total_recipients,
        "campaign_status": cloned.status,
    }


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)

    if campaign.status == "in_progress":
        raise HTTPException(status_code=400, detail="Cannot delete an actively running campaign. Please pause or cancel it first.")

    # Release any remaining held escrow
    if campaign.status == "scheduled":
        CampaignService.cancel_campaign(db, c_uuid)

    db.delete(campaign)
    db.commit()
    return {"status": "deleted", "campaign_id": str(c_uuid)}


@router.post("/audiences/upload-csv")
async def upload_audience_csv(
    workspace_id: Optional[str] = Query(None),
    file: UploadFile = File(...),
    default_country_code: str = Query("91"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Step 2 Audience: Upload CSV, parse headers, normalize phone numbers, and return breakdown.
    """
    ws_uuid = resolve_workspace_id(current_user, db, workspace_id)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    parsed = AudienceService.parse_csv_contacts(
        content,
        default_country_code=default_country_code,
        filename=file.filename or "",
    )
    return parsed


@router.get("/audiences/lists")
@router.get("/contact-lists")
async def list_contact_lists(
    workspace_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    ws_uuid = resolve_workspace_id(current_user, db, workspace_id)

    lists = db.query(ContactList).filter(ContactList.workspace_id == ws_uuid).order_by(ContactList.created_at.desc()).all()
    leads_count = db.query(Lead).filter(Lead.workspace_id == ws_uuid).count()

    res = []
    if leads_count > 0:
        res.append({
            "id": "crm_all_leads",
            "name": "All CRM Contacts",
            "description": f"Auto-synced contacts from CRM leads database ({leads_count} contacts)",
            "total_contacts": leads_count,
            "totalContacts": leads_count,
            "valid_contacts": leads_count,
            "validContacts": leads_count,
            "invalid_contacts": 0,
            "invalidContacts": 0,
            "opted_in": leads_count,
            "optedIn": leads_count,
            "opted_out": 0,
            "optedOut": 0,
            "created_at": None,
            "createdOn": "Live CRM",
        })

    for cl in lists:
        count = cl.total_contacts or 0
        date_str = cl.created_at.strftime("%b %d, %Y") if cl.created_at else "Recently"
        res.append({
            "id": str(cl.id),
            "name": cl.name,
            "description": cl.description or "Saved contact list",
            "total_contacts": count,
            "totalContacts": count,
            "valid_contacts": count,
            "validContacts": count,
            "invalid_contacts": 0,
            "invalidContacts": 0,
            "opted_in": count,
            "optedIn": count,
            "opted_out": 0,
            "optedOut": 0,
            "created_at": cl.created_at.isoformat() if cl.created_at else None,
            "createdOn": date_str,
        })
    return res


@router.get("/audiences/leads")
async def list_marketing_crm_leads(
    workspace_id: Optional[str] = Query(None),
    segment: Optional[str] = Query("all"),
    search: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Returns real CRM leads for Step 2 Audience selection & Smart Segments.
    """
    ws_uuid = resolve_workspace_id(current_user, db, workspace_id)
    query = db.query(Lead).filter(Lead.workspace_id == ws_uuid)

    if segment == "hot":
        query = query.filter(Lead.score >= 70)
    elif segment == "warm":
        query = query.filter(Lead.score >= 40, Lead.score < 70)
    elif segment == "new":
        query = query.filter(Lead.status == "new")
    elif segment == "converted":
        query = query.filter(Lead.status == "converted")
    elif segment == "cold":
        query = query.filter(Lead.score < 40)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(Lead.name.ilike(term), Lead.phone.ilike(term)))

    leads = query.order_by(Lead.score.desc().nullslast(), Lead.created_at.desc()).limit(limit).all()

    total_count = db.query(Lead).filter(Lead.workspace_id == ws_uuid).count()
    hot_count = db.query(Lead).filter(Lead.workspace_id == ws_uuid, Lead.score >= 70).count()
    warm_count = db.query(Lead).filter(Lead.workspace_id == ws_uuid, Lead.score >= 40, Lead.score < 70).count()
    new_count = db.query(Lead).filter(Lead.workspace_id == ws_uuid, Lead.status == "new").count()
    converted_count = db.query(Lead).filter(Lead.workspace_id == ws_uuid, Lead.status == "converted").count()

    return {
        "total": len(leads),
        "segment_counts": {
            "all": total_count,
            "hot": hot_count,
            "warm": warm_count,
            "new": new_count,
            "converted": converted_count,
        },
        "leads": [
            {
                "id": str(l.id),
                "name": l.name or "Contact",
                "phone": l.phone,
                "score": l.score or 0,
                "status": l.status or "new",
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in leads
        ]
    }


@router.post("/audiences/lists")
@router.post("/contact-lists")
async def create_contact_list(
    payload: ContactListCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    ws_uuid = resolve_workspace_id(current_user, db, payload.workspace_id)

    cl = ContactList(
        workspace_id=ws_uuid,
        name=payload.name,
        description=payload.description,
        total_contacts=len(payload.lead_ids or []),
    )
    db.add(cl)
    db.flush()

    if payload.lead_ids:
        for lid in payload.lead_ids:
            db.add(ContactListMember(
                contact_list_id=cl.id,
                lead_id=to_uuid(lid)
            ))

    db.commit()
    db.refresh(cl)
    return {"status": "success", "id": str(cl.id), "name": cl.name, "total_contacts": cl.total_contacts}


@router.get("/tier-info")
async def get_portfolio_tier_info(
    workspace_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):

    ws_uuid = resolve_workspace_id(current_user, db, workspace_id)

    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    portfolio_id = workspace.meta_business_id or workspace.meta_waba_id or str(workspace.id)

    redis_client = None
    try:
        redis_client = get_redis_client()
    except Exception:
        pass

    display_phone = workspace.meta_display_phone or workspace.twilio_phone_number or ""
    phone_number_id = workspace.meta_phone_number_id or workspace.twilio_phone_number or ""

    configured_tier = getattr(workspace, "meta_tier_limit", None)
    has_meta = bool(
        (workspace.meta_access_token and (workspace.meta_phone_number_id or workspace.meta_waba_id))
        or (configured_tier and (workspace.meta_display_phone or workspace.meta_phone_number_id))
    )
    has_twilio = bool(workspace.twilio_account_sid and workspace.twilio_phone_number)

    is_connected = False
    tier_limit = 0
    quality_score = "NOT_CONNECTED"

    if has_meta:
        if workspace.meta_access_token and (workspace.meta_phone_number_id or workspace.meta_waba_id):
            cache_id = workspace.meta_phone_number_id or workspace.meta_waba_id
            cache_key = f"wa:meta_tier:{cache_id}"
            cached = None
            if redis_client:
                try:
                    cached = redis_client.get(cache_key)
                except Exception:
                    cached = None

            if cached:
                try:
                    tier_limit = int(cached.decode("utf-8") if isinstance(cached, bytes) else str(cached))
                    is_connected = tier_limit > 0
                    quality_score = "GREEN" if is_connected else "NOT_CONNECTED"
                except (ValueError, TypeError):
                    tier_limit = 0
            elif configured_tier:
                # Fast path: Use tier limit already retrieved and saved during WhatsApp channel connection
                is_connected = True
                tier_limit = int(configured_tier)
                quality_score = "GREEN"
                if redis_client and tier_limit:
                    try:
                        redis_client.setex(cache_key, 3600, str(tier_limit))
                    except Exception:
                        pass
            else:
                meta_tier = WhatsAppTierService.fetch_live_portfolio_tier(
                    waba_id=workspace.meta_waba_id,
                    access_token=workspace.meta_access_token,
                    business_id=workspace.meta_business_id,
                    phone_number_id=workspace.meta_phone_number_id,
                )
                if meta_tier.get("is_connected"):
                    is_connected = True
                    tier_limit = meta_tier.get("daily_limit", 1000)
                    quality_score = meta_tier.get("quality_score", "GREEN")
                    try:
                        workspace.meta_tier_limit = tier_limit
                        db.commit()
                    except Exception:
                        pass
                    if redis_client and tier_limit:
                        redis_client.setex(cache_key, 3600, str(tier_limit))
                elif configured_tier:
                    is_connected = True
                    tier_limit = int(configured_tier)
                    quality_score = "GREEN"
                else:
                    is_connected = False
                    tier_limit = 0
                    quality_score = "NOT_CONNECTED"
        elif configured_tier:
            is_connected = True
            tier_limit = int(configured_tier)
            quality_score = "GREEN"
    elif has_twilio:
        is_connected = True
        tier_limit = int(configured_tier or 1000)
        quality_score = "GREEN"

    if not is_connected or tier_limit <= 0:
        usage = {"limit": 0, "used": 0, "remaining": 0, "next_unlock_at": None}
    else:
        usage = WhatsAppTierService.get_portfolio_usage(
            redis_client=redis_client,
            portfolio_id=portfolio_id,
            portfolio_tier_limit=tier_limit,
            db=db,
            workspace_id=workspace.id,
        )

    return {
        "portfolio_id": portfolio_id,
        "phone_number_id": phone_number_id,
        "display_phone": display_phone,
        "is_connected": is_connected,
        "quality_score": quality_score,
        "tier_limit": usage.get("limit", 0),
        "used_today": usage.get("used", 0),
        "remaining_today": usage.get("remaining", 0),
        "next_unlock_at": usage.get("next_unlock_at"),
    }


@router.get("/templates")
async def get_marketing_templates(
    workspace_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query("approved"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    import re
    from sqlalchemy import func
    ws_uuid = resolve_workspace_id(current_user, db, workspace_id)
    user_id = to_uuid(current_user.id) if getattr(current_user, "id", None) else None

    query = db.query(Template).filter(
        or_(
            Template.workspace_id == ws_uuid,
            Template.user_id == user_id,
            Template.system_tag.isnot(None),
        )
    )

    # Marketing campaigns require Meta-approved templates unless explicitly requested all
    if status and status.lower() != "all":
        query = query.filter(func.lower(Template.status) == status.lower())

    if category and category.lower() != "all":
        query = query.filter(Template.category.ilike(category))

    templates = query.order_by(Template.created_at.desc()).all()

    items = []
    for t in templates:
        body_text = t.content or ""
        vars_found = list(dict.fromkeys(re.findall(r"\{\{[^}]+\}\}", body_text)))
        items.append({
            "id": str(t.id),
            "name": t.name,
            "type": t.type or "TEXT",
            "content": body_text,
            "body": body_text,
            "header": t.header,
            "footer": t.footer,
            "cta": t.cta,
            "cta_btn_title": t.cta_btn_title,
            "status": (t.status or "draft").upper(),
            "category": (t.category or "MARKETING").upper(),
            "language": t.language or "en_US",
            "variables": vars_found,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {
        "items": items,
        "templates": items,
        "total": len(items),
    }
