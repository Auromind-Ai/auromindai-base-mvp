import logging
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.auth import get_current_user, CurrentUser
from app.core.security import verify_workspace_access, to_uuid
from app.models.campaign import Campaign, CampaignRecipient, ContactList, ContactListMember
from app.models.workspace import Workspace
from app.schemas.campaign import (PreflightEstimateRequest,PreflightEstimateResponse,CampaignCreateRequest,CampaignResponse,ContactListCreateRequest,)
from app.services.marketing.campaign_service import CampaignService
from app.services.marketing.audience_service import AudienceService
from app.services.marketing.whatsapp_tier_service import WhatsAppTierService
from app.core.redis_lock import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketing", tags=["marketing"])


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
    """
    Step 5: Review & Save Campaign (Draft or Scheduled).
    """
    ws_uuid = to_uuid(payload.workspace_id)
    verify_workspace_access(current_user, db, ws_uuid)

    data = payload.model_dump()
    user_id = to_uuid(current_user.id) if getattr(current_user, "id", None) else None

    try:
        campaign = CampaignService.create_campaign(
            db=db,
            workspace_id=ws_uuid,
            user_id=user_id,
            data=data,
        )
        return {
            "status": "success",
            "campaign_id": str(campaign.id),
            "campaign_name": campaign.name,
            "total_recipients": campaign.total_recipients,
            "campaign_status": campaign.status,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error creating campaign: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/campaigns")
async def list_campaigns(
    workspace_id: str = Query(...),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Lists campaigns with real-time counters and filter by status.
    """
    ws_uuid = to_uuid(workspace_id)
    verify_workspace_access(current_user, db, ws_uuid)

    query = db.query(Campaign).filter(Campaign.workspace_id == ws_uuid)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Campaign.status == status_filter.lower())

    total = query.count()
    campaigns = query.order_by(Campaign.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for c in campaigns:
        items.append({
            "id": str(c.id),
            "workspace_id": str(c.workspace_id),
            "name": c.name,
            "campaign_type": c.campaign_type,
            "status": c.status,
            "total_recipients": c.total_recipients,
            "accepted_count": c.accepted_count,
            "sent_count": c.sent_count,
            "delivered_count": c.delivered_count,
            "read_count": c.read_count,
            "failed_count": c.failed_count,
            "estimated_cost": float(c.estimated_cost),
            "actual_cost": float(c.actual_cost),
            "paused_reason": c.paused_reason,
            "next_available_capacity_at": c.next_available_capacity_at.isoformat() if c.next_available_capacity_at else None,
            "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {"total": total, "items": items, "limit": limit, "offset": offset}


@router.get("/campaigns/{campaign_id}")
async def get_campaign_detail(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Returns single campaign metrics, live progress, and delivery percentages.
    """
    c_uuid = to_uuid(campaign_id)
    campaign = db.query(Campaign).filter(Campaign.id == c_uuid).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    verify_workspace_access(current_user, db, campaign.workspace_id)

    # Calculate deliverability percentages
    total = campaign.valid_recipients or 1
    sent = campaign.accepted_count or 0
    delivered = campaign.delivered_count or 0
    read = campaign.read_count or 0

    return {
        "id": str(campaign.id),
        "workspace_id": str(campaign.workspace_id),
        "name": campaign.name,
        "campaign_type": campaign.campaign_type,
        "status": campaign.status,
        "total_recipients": campaign.total_recipients,
        "valid_recipients": campaign.valid_recipients,
        "invalid_recipients": campaign.invalid_recipients,
        "accepted_count": campaign.accepted_count,
        "sent_count": campaign.sent_count,
        "delivered_count": campaign.delivered_count,
        "read_count": campaign.read_count,
        "failed_count": campaign.failed_count,
        "skipped_marketing_cap_count": campaign.skipped_marketing_cap_count,
        "delivery_rate": round((delivered / total) * 100, 1),
        "read_rate": round((read / total) * 100, 1),
        "estimated_cost": float(campaign.estimated_cost),
        "held_cost": float(campaign.held_cost),
        "actual_cost": float(campaign.actual_cost),
        "paused_reason": campaign.paused_reason,
        "next_available_capacity_at": campaign.next_available_capacity_at.isoformat() if campaign.next_available_capacity_at else None,
        "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None,
        "started_at": campaign.started_at.isoformat() if campaign.started_at else None,
        "completed_at": campaign.completed_at.isoformat() if campaign.completed_at else None,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
    }


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


@router.post("/audiences/upload-csv")
async def upload_audience_csv(
    workspace_id: str = Query(...),
    file: UploadFile = File(...),
    default_country_code: str = Query("91"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Step 2 Audience: Upload CSV, parse headers, normalize phone numbers, and return breakdown.
    """
    ws_uuid = to_uuid(workspace_id)
    verify_workspace_access(current_user, db, ws_uuid)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    parsed = AudienceService.parse_csv_contacts(content, default_country_code=default_country_code)
    return parsed


@router.get("/audiences/lists")
async def list_contact_lists(
    workspace_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Step 2 Audience: Lists existing CRM contact lists/segments.
    """
    ws_uuid = to_uuid(workspace_id)
    verify_workspace_access(current_user, db, ws_uuid)

    lists = db.query(ContactList).filter(ContactList.workspace_id == ws_uuid).order_by(ContactList.created_at.desc()).all()
    res = []
    for cl in lists:
        res.append({
            "id": str(cl.id),
            "name": cl.name,
            "description": cl.description,
            "total_contacts": cl.total_contacts,
            "created_at": cl.created_at.isoformat() if cl.created_at else None,
        })
    return res


@router.post("/audiences/lists")
async def create_contact_list(
    payload: ContactListCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    ws_uuid = to_uuid(payload.workspace_id)
    verify_workspace_access(current_user, db, ws_uuid)

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
    workspace_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Returns live Meta Business Portfolio messaging limit tier, quality rating, and rolling 24h usage.
    """
    ws_uuid = to_uuid(workspace_id)
    verify_workspace_access(current_user, db, ws_uuid)

    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    portfolio_id = workspace.meta_business_id or workspace.meta_waba_id or str(workspace.id)

    redis_client = None
    try:
        redis_client = get_redis_client()
    except Exception:
        pass

    usage = WhatsAppTierService.get_portfolio_usage(
        redis_client=redis_client,
        portfolio_id=portfolio_id,
        portfolio_tier_limit=2000
    )

    return {
        "portfolio_id": portfolio_id,
        "phone_number_id": workspace.meta_phone_number_id,
        "display_phone": workspace.meta_display_phone,
        "is_connected": bool(workspace.meta_access_token and workspace.meta_phone_number_id),
        "quality_score": "GREEN",
        "tier_limit": usage.get("limit", 2000),
        "used_today": usage.get("used", 0),
        "remaining_today": usage.get("remaining", 2000),
        "next_unlock_at": usage.get("next_unlock_at"),
    }
