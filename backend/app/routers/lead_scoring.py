
from __future__ import annotations

import json
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ai_action import Lead
from app.routers.auth import get_current_user
from app.core.security import verify_workspace_access
from app.services.crm import lead_scoring_service
from app.utils.intent_detection import detect_intent_signals
from app.utils.scoring_config import get_scoring_config
from app.schemas.lead_scoring import (
    BulkRecalcResponse,
    ConversationLogItem,
    LeadDetailResponse,
    LeadScoreListResponse,
    LeadScoreResponse,
    MessageIntentRequest,
    MessageIntentResponse,
    NodeProgressRequest,
    NodeProgressResponse,
    ScoreCalculateRequest,
    ScoreCalculateResponse,
    ScoreHistoryResponse,
    ConvertLeadRequest,
    ConvertLeadResponse,
    ManualLeadCreateRequest,
    ManualLeadCreateResponse,
)
from app.models.message import Message, SenderType, MessageStatus
from app.models.conversation import ChannelType
from app.services.inbox.conversation_service import ConversationService


router = APIRouter(prefix="/lead-scoring", tags=["lead-scoring"])



# 1. Stateless score preview (no DB write)


@router.post(
    "/calculate",
    response_model=ScoreCalculateResponse,
    summary="Preview score calculation",
    description="Pure-math score preview. Pass raw values, get a score + breakdown. Nothing is persisted.",
)
async def calculate_score_preview(
    body: ScoreCalculateRequest,
    current_user=Depends(get_current_user),
):
    breakdown = lead_scoring_service.calculate_score_breakdown(
        current_node=body.current_node,
        total_nodes=body.total_nodes,
        days_inactive=body.days_inactive,
        template_responses=body.template_responses,
        semantic_intent_score=body.semantic_intent_score,
    )
    return ScoreCalculateResponse(
        score=breakdown["total"],
        breakdown=breakdown,
    )



# 2. Recalculate & persist score for a single lead


@router.post(
    "/leads/{lead_id}/recalculate",
    response_model=LeadScoreResponse,
    summary="Recalculate lead score",
    description="Recalculate from current DB state and persist. Logs the change in score history.",
)
async def recalculate_lead(
    lead_id: UUID,
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)

    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.workspace_id == wid)
        .first()
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found in this workspace",
        )

    old_score = lead.score or 0

    breakdown = lead_scoring_service.recalculate_lead_score(
        lead, db, reason="manual_recalculation"
    )

    return LeadScoreResponse(
        lead_id=lead.id,
        name=lead.name,
        score=breakdown["total"],
        behavioral_score=breakdown["behavioral_score"],
        semantic_intent_score=breakdown["semantic_intent_score"],
        lead_tier=breakdown["lead_tier"],
        breakdown=breakdown,
        previous_score=old_score,
    )


@router.post(
    "/leads/{lead_id}/message-intent",
    response_model=MessageIntentResponse,
    summary="Process inbound lead message intent",
    description="Detects intent signals from an inbound customer message and updates lead score.",
)
async def message_intent(
    lead_id: UUID,
    body: MessageIntentRequest,
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)

    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.workspace_id == wid)
        .first()
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found in this workspace",
        )

    old_score = lead.score or 0
    message_length = len(body.message or "")

    cfg = get_scoring_config()
    if message_length < cfg.get_worker_config("min_message_length"):
        breakdown = lead_scoring_service.calculate_score_breakdown(
            current_node=lead.current_node or 0,
            total_nodes=lead.total_nodes or 0,
            days_inactive=lead_scoring_service._days_inactive(lead),
            template_responses=lead_scoring_service._template_responses(lead.id, db),
            semantic_intent_score=lead.semantic_intent_score or 0,
            intent_signals=getattr(lead, "intent_signals", None),
            word_count=0,
        )
        return MessageIntentResponse(
            lead_id=lead.id,
            message_length=message_length,
            skipped=True,
            signals={
                "has_number": {"value": False, "snippet": "", "explanation": "Budget mentioned", "reasoning": ""},
                "has_urgency": {"value": False, "snippet": "", "explanation": "Urgency detected", "reasoning": ""},
                "has_question": {"value": False, "snippet": "", "explanation": "Asked a clear question", "reasoning": ""},
                "has_pricing": {"value": False, "snippet": "", "explanation": "Pricing/budget inquiry", "reasoning": ""},
                "shared_contact": {"value": False, "snippet": "", "explanation": "Shared contact details", "reasoning": ""},
                "callback_request": {"value": False, "snippet": "", "explanation": "Callback request", "reasoning": ""},
                "pincode_shared": {"value": False, "snippet": "", "explanation": "Pincode shared", "reasoning": ""},
                "delivery_interest": {"value": False, "snippet": "", "explanation": "Delivery interest", "reasoning": ""},
                "is_specific": {"value": False, "snippet": "", "explanation": "Specific query details", "reasoning": ""},
                "is_vague": {"value": False, "snippet": "", "explanation": "Vague greeting", "reasoning": ""},
                "negative_intent": {"value": False, "snippet": "", "explanation": "Negative intent expressed", "reasoning": ""},
                "pricing_intent": {"value": False, "snippet": "", "explanation": "Pricing intent detected", "reasoning": ""},
                "payment_intent": {"value": False, "snippet": "", "explanation": "Payment intent detected", "reasoning": ""},
                "budget_acceptance": {"value": False, "snippet": "", "explanation": "Budget acceptance detected", "reasoning": ""}
            },
            semantic_intent_score=lead.semantic_intent_score or 0,
            behavioral_score=breakdown["behavioral_score"],
            lead_tier=breakdown["lead_tier"],
            score=breakdown["total"],
            breakdown=breakdown,
            previous_score=old_score,
        )

    result = detect_intent_signals(body.message)
    new_intent_score = result["semantic_intent_score"]
    lead.semantic_intent_score = new_intent_score
    lead.intent_signals = result["signals"]
    lead.last_activity_at = datetime.now(timezone.utc)

    breakdown = lead_scoring_service.recalculate_lead_score(
        lead, db, reason="message_intent", commit=False
    )
    db.commit()

    return MessageIntentResponse(
        lead_id=lead.id,
        message_length=message_length,
        skipped=False,
        signals=result["signals"],
        semantic_intent_score=lead.semantic_intent_score or 0,
        behavioral_score=breakdown["behavioral_score"],
        lead_tier=breakdown["lead_tier"],
        score=breakdown["total"],
        breakdown=breakdown,
        previous_score=old_score,
    )


@router.post(
    "/leads/{lead_id}/node-progress",
    response_model=NodeProgressResponse,
    summary="Update lead node progress",
    description="Updates the lead's current flow node and recalculates score.",
)
async def node_progress(
    lead_id: UUID,
    body: NodeProgressRequest,
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)

    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.workspace_id == wid)
        .first()
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found in this workspace",
        )

    if body.current_node > body.total_nodes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="current_node must be <= total_nodes",
        )

    previous_node = lead.current_node or 0
    previous_score = lead.score or 0

    lead.current_node = body.current_node
    lead.total_nodes = body.total_nodes
    lead.last_activity_at = datetime.now(timezone.utc)

    if body.node_name:
        reason = f"node_{body.node_name}"
    else:
        reason = f"node_progress_{body.current_node}_of_{body.total_nodes}"

    breakdown = lead_scoring_service.recalculate_lead_score(
        lead, db, reason=reason, commit=False
    )
    db.commit()

    progress_percent = round((body.current_node / body.total_nodes) * 100, 1)

    return NodeProgressResponse(
        lead_id=lead.id,
        previous_node=previous_node,
        current_node=body.current_node,
        total_nodes=body.total_nodes,
        progress_percent=progress_percent,
        score=breakdown["total"],
        breakdown=breakdown,
        previous_score=previous_score,
    )


# 3. Bulk recalculate all leads in a workspace


@router.post(
    "/workspace/recalculate",
    response_model=BulkRecalcResponse,
    summary="Bulk recalculate workspace scores",
    description="Recalculates scores for every lead in the workspace. Use sparingly.",
)
async def bulk_recalculate(
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)

    results = lead_scoring_service.recalculate_workspace_scores(wid, db)

    return BulkRecalcResponse(
        recalculated=len(results),
        items=results,
    )



# 4. Score history audit trail for a lead


@router.get(
    "/leads/{lead_id}/history",
    response_model=ScoreHistoryResponse,
    summary="Score change history",
    description="Returns the audit trail of score changes for a lead.",
)
async def lead_score_history(
    lead_id: UUID,
    workspace_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)

    # Verify lead belongs to workspace
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.workspace_id == wid)
        .first()
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found in this workspace",
        )

    history = lead_scoring_service.get_score_history(lead_id, db, limit=limit)

    return ScoreHistoryResponse(lead_id=lead_id, history=history)



# 5. List all leads with scores (paginated + filterable)


@router.get(
    "/leads",
    response_model=LeadScoreListResponse,
    summary="List leads with scores",
    description="Paginated, filterable list of leads with live score breakdowns.",
)
async def list_leads_with_scores(
    workspace_id: str | None = None,
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Filter by lead status: new, active, converted, lost",
    ),
    min_score: int | None = Query(default=None, ge=0, le=100),
    max_score: int | None = Query(default=None, ge=0, le=100),
    sort_by: str = Query(
        default="score_desc",
        description="Sort: score_desc, score_asc, recent",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)

    result = lead_scoring_service.get_workspace_lead_scores(
        workspace_id=wid,
        db=db,
        status_filter=status_filter,
        min_score=min_score,
        max_score=max_score,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )

    return LeadScoreListResponse(**result)



# 6. Lead detail with conversation log


@router.get(
    "/leads/{lead_id}/detail",
    response_model=LeadDetailResponse,
    summary="Lead detail with conversation log",
    description="Full lead detail including score breakdown and last 50 messages.",
)
async def lead_detail(
    lead_id: UUID,
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)

    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.workspace_id == wid)
        .first()
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found in this workspace",
        )

    # Score breakdown
    days = lead_scoring_service._days_inactive(lead)
    responses = lead_scoring_service._template_responses(lead.id, db)
    intent_signals = getattr(lead, "intent_signals", None)
    breakdown = lead_scoring_service.calculate_score_breakdown(
        current_node=lead.current_node or 0,
        total_nodes=lead.total_nodes or 0,
        days_inactive=days,
        template_responses=responses,
        semantic_intent_score=lead.semantic_intent_score or 0,
        intent_signals=intent_signals,
        word_count=int(intent_signals.get("word_count", 0))
                   if isinstance(intent_signals, dict) else 0,
    )

    # Override breakdown totals to match persisted values (single source of truth)
    breakdown["total"] = lead.score or 0
    breakdown["behavioral_score"] = lead.behavioral_score or 0
    breakdown["semantic_intent_score"] = lead.semantic_intent_score or 0
    breakdown["lead_tier"] = lead.lead_tier or "cold"

    # Conversation log
    conversation_log = []
    avg_reply_minutes = None
    if lead.conversation_id:
        avg_reply_minutes = lead_scoring_service.calculate_avg_reply_minutes(
            lead.conversation_id, db
        )
        messages = (
            db.query(Message)
            .filter(Message.conversation_id == lead.conversation_id)
            .order_by(Message.timestamp.asc())
            .limit(50)
            .all()
        )
        for msg in messages:
            direction = (
                "inbound" if msg.sender_type == SenderType.USER else "outbound"
            )
            meta = {}
            if msg.metadata_json:
                try:
                    meta = json.loads(msg.metadata_json) if isinstance(msg.metadata_json, str) else (msg.metadata_json or {})
                except (json.JSONDecodeError, TypeError):
                    meta = {}
            conversation_log.append(
                ConversationLogItem(
                    id=msg.id,
                    content=msg.content or "",
                    direction=direction,
                    sent_at=msg.timestamp,
                    metadata=meta if meta else None,
                )
            )

    return LeadDetailResponse(
        lead_id=lead.id,
        name=lead.name,
        phone=lead.phone,
        source=lead.source,
        channel=lead.source,
        status=lead.status or "new",
        score=lead.score or 0,
        behavioral_score=lead.behavioral_score or 0,
        semantic_intent_score=lead.semantic_intent_score or 0,
        lead_tier=lead.lead_tier or "cold",
        breakdown=breakdown,
        conversation_id=lead.conversation_id,
        budget_min=float(lead.budget_min) if lead.budget_min is not None else None,
        budget_max=float(lead.budget_max) if lead.budget_max is not None else None,
        intent_signals=lead.intent_signals,
        current_node=lead.current_node or 0,
        total_nodes=lead.total_nodes or 0,
        last_activity_at=lead.last_activity_at,
        assigned_to=lead.assigned_to,
        created_at=lead.created_at,
        conversation_log=conversation_log,
        avg_reply_minutes=avg_reply_minutes,
        is_converted=lead.is_converted,
        conversion_amount=float(lead.conversion_amount) if lead.conversion_amount is not None else None,
        converted_at=lead.converted_at,
        converted_product=lead.converted_product,
        conversion_notes=lead.conversion_notes,
    )


@router.post(
    "/leads/{lead_id}/convert",
    response_model=ConvertLeadResponse,
    summary="Convert lead",
    description="Mark a lead as converted and save the conversion details.",
)
async def convert_lead(
    lead_id: UUID,
    body: ConvertLeadRequest,
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)

    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.workspace_id == wid)
        .first()
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found in this workspace",
        )

    lead.status = "converted"
    lead.is_converted = True
    lead.conversion_amount = body.amount
    lead.converted_product = body.product
    lead.conversion_notes = body.notes
    lead.converted_at = datetime.now(timezone.utc)
    
    # Recalculate lead score with reason "converted"
    lead_scoring_service.recalculate_lead_score(lead, db, reason="converted", commit=False)
    db.commit()

    return ConvertLeadResponse(
        lead_id=lead.id,
        status=lead.status,
        conversion_amount=float(lead.conversion_amount),
        converted_at=lead.converted_at,
        is_converted=lead.is_converted,
        converted_product=lead.converted_product,
        conversion_notes=lead.conversion_notes,
        score=lead.score or 0,
        behavioral_score=lead.behavioral_score or 0,
        semantic_intent_score=lead.semantic_intent_score or 0,
        lead_tier=lead.lead_tier or "cold",
    )


@router.post(
    "/leads/manual",
    response_model=ManualLeadCreateResponse,
    summary="Create a lead manually",
    description="Manually create a lead, resolve or create the conversation, record an optional note, calculate initial score, and return the lead details.",
)
async def create_manual_lead(
    body: ManualLeadCreateRequest,
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    import re
    wid = verify_workspace_access(current_user, db, workspace_id)

    # 1. Clean and validate phone number format
    cleaned_phone = re.sub(r"[\s\-\(\)]", "", body.phone)
    if not re.match(r"^(?:\+91)?[6-9]\d{9}$", cleaned_phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number must be a valid Indian mobile format (e.g. +91XXXXXXXXXX or 10 digits starting with 6-9)."
        )

    # 2. Validate name
    if len(body.name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name must be at least 2 characters long."
        )

    # 3. Validate budget
    if body.budget_min is not None and body.budget_max is not None:
        if body.budget_max <= body.budget_min:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Max budget must be greater than min budget."
            )

    # 4. Resolve ChannelType from source
    resolved_channel = ChannelType.WEB
    if body.source:
        src_lower = body.source.lower()
        if src_lower == "whatsapp":
            resolved_channel = ChannelType.WHATSAPP
        elif src_lower == "instagram":
            resolved_channel = ChannelType.INSTAGRAM
        elif src_lower == "web":
            resolved_channel = ChannelType.WEB

    # 5. Resolve / get or create conversation
    conv = ConversationService.get_or_create_conversation(
        db=db,
        workspace_id=wid,
        channel=resolved_channel,
        phone=cleaned_phone,
        external_id=cleaned_phone,
        contact_name=body.name,
    )

    # 6. Check for duplicate lead for this conversation in workspace
    existing_lead = (
        db.query(Lead)
        .filter(Lead.workspace_id == wid, Lead.conversation_id == conv.id)
        .first()
    )
    if existing_lead:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A lead already exists for this conversation/phone number."
        )

    # 7. Create Lead record
    now = datetime.now(timezone.utc)
    lead = Lead(
        workspace_id=wid,
        conversation_id=conv.id,
        name=body.name.strip(),
        phone=cleaned_phone,
        source=body.source or "manual",
        status=body.status or "new",
        budget_min=body.budget_min,
        budget_max=body.budget_max,
        requirement=body.note,
        score=0,
        current_node=0,
        total_nodes=0,
        semantic_intent_score=0,
        last_activity_at=now,
    )
    db.add(lead)
    db.flush()

    # 8. Create system message note if provided
    if body.note:
        msg = Message(
            conversation_id=conv.id,
            content=f"Note: {body.note}",
            sender_type=SenderType.SYSTEM,
            status=MessageStatus.SENT,
            timestamp=now,
            is_read=True,
            source="manual",
        )
        db.add(msg)

    # 9. Recalculate lead score
    lead_scoring_service.recalculate_lead_score(
        lead, db, reason="manual_creation", commit=False
    )
    db.commit()

    return ManualLeadCreateResponse(
        lead_id=lead.id,
        name=lead.name,
        phone=lead.phone,
        source=lead.source,
        status=lead.status or "new",
        score=lead.score or 0,
        behavioral_score=lead.behavioral_score or 0,
        semantic_intent_score=lead.semantic_intent_score or 0,
        lead_tier=lead.lead_tier or "cold",
        created_at=lead.created_at,
    )

