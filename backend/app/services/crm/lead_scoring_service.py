from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.models.ai_action import Lead
from app.models.lead_scoring import LeadScoreHistory, TemplateLog

logger = logging.getLogger(__name__)

from app.utils.scoring_config import get_scoring_config


# Core formula (stateless, pure function)

def get_lead_tier(score: int, business_type: str = "default") -> str:
    return get_scoring_config(business_type).get_tier(score)

def calculate_score(
    current_node: int,
    total_nodes: int,
    days_inactive: int,
    template_responses: list[str],
    semantic_intent_score: int = 0,
) -> tuple[int, int, int, str]:
    # --- 1. Flow progress (20 pts max) ---
    if total_nodes > 0:
        progress = (current_node / total_nodes) * 20
    else:
        progress = 0.0

    # --- 2. Recency (20 pts max) ---
    if days_inactive == 0:
        recency = 20
    elif days_inactive <= 3:
        recency = 15
    elif days_inactive <= 7:
        recency = 10
    else:
        recency = 0

    # --- 3. Template engagement (20 pts max) ---
    positive = sum(1 for r in template_responses if r in ("replied", "clicked"))
    negative = sum(1 for r in template_responses if r == "ignored")
    engagement = min((positive * 10) - (negative * 5), 20)
    engagement = max(engagement, 0)

    behavioral_score = round(progress + recency + engagement)
    cfg = get_scoring_config()
    intent_score = max(
        min(semantic_intent_score, cfg.get_cap("intent_max")),
        cfg.get_cap("intent_min")
    )
    total_score = max(
        min(behavioral_score + intent_score, cfg.get_cap("total_max")),
        cfg.get_cap("total_min")
    )
    tier = get_lead_tier(total_score)
    return total_score, behavioral_score, intent_score, tier


# Score breakdown (same math, structured output)

def calculate_score_breakdown(
    current_node: int,
    total_nodes: int,
    days_inactive: int,
    template_responses: list[str],
    semantic_intent_score: int = 0,
    intent_signals: dict[str, Any] | None = None,
    word_count: int = 0,
) -> dict[str, Any]:
    """Return the total score *plus* per-factor details."""
    
    total, behavioral, intent, tier = calculate_score(
        current_node, total_nodes, days_inactive, template_responses, semantic_intent_score
    )

    progress = round((current_node / total_nodes) * 20, 1) if total_nodes > 0 else 0.0

    if days_inactive == 0:
        recency = 20
    elif days_inactive <= 3:
        recency = 15
    elif days_inactive <= 7:
        recency = 10
    else:
        recency = 0

    positive = sum(1 for r in template_responses if r in ("replied", "clicked"))
    negative = sum(1 for r in template_responses if r == "ignored")
    engagement_raw = (positive * 10) - (negative * 5)
    engagement = max(min(engagement_raw, 20), 0)

    signals = {
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
        "negative_intent": {"value": False, "snippet": "", "explanation": "Negative intent expressed", "reasoning": ""}
    }
    if intent_signals is not None:
        for k, v in intent_signals.items():
            if k in signals:
                if isinstance(v, dict):
                    signals[k] = {
                        "value": bool(v.get("value", False)),
                        "snippet": str(v.get("snippet", "")),
                        "explanation": str(v.get("explanation", signals[k]["explanation"])),
                        "reasoning": str(v.get("reasoning", ""))
                    }
                else:
                    signals[k]["value"] = bool(v)
    MAX_INTENT_SCORE = get_scoring_config().get_cap("intent_max")
    return {
        "total": total,
        "behavioral_score": behavioral,
        "semantic_intent_score": intent,
        "lead_tier": tier,
        "progress": {"score": round(progress), "max": 20,
                      "current_node": current_node,
                      "total_nodes": total_nodes},
        "recency":  {"score": recency, "max": 20,
                     "days_inactive": days_inactive},
        "engagement": {"score": engagement, "max": 20,
                       "positive_responses": positive,
                       "negative_responses": negative},
        "intent": {
            "score": intent,
            "max": MAX_INTENT_SCORE,
            "signals": signals,
            "word_count": word_count,
        },
    }


# DB helpers

def _days_inactive(lead: Lead) -> int:
    """Calendar days since last_activity_at (or created_at fallback)."""
    ref = lead.last_activity_at or lead.created_at or datetime.now(timezone.utc)
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - ref
    return max(delta.days, 0)

def _template_responses(lead_id: UUID, db: Session) -> list[str]:
    """Fetch all response_type values from template_logs for a lead."""
    rows = (
        db.query(TemplateLog.response_type)
        .filter(
            TemplateLog.lead_id == lead_id,
            TemplateLog.response_type.isnot(None),
        )
        .all()
    )
    return [r[0] for r in rows]


def _resolve_semantic_intent_score(lead: Lead) -> int:
    """Return the active semantic intent score for the lead.

    Prefer semantic_intent_score. Legacy intent_bonus values are used only for
    backward compatibility with pre-refactor data.
    """
    current_score = lead.semantic_intent_score or 0
    legacy_score = getattr(lead, "intent_bonus", 0) or 0
    return max(current_score, legacy_score)


def _log_score_change(
    lead: Lead,
    old_score: int,
    new_score: int,
    b_delta: int,
    i_delta: int,
    reason: str,
    db: Session,
) -> None:
    """Insert an audit row into lead_score_history."""
    entry = LeadScoreHistory(
        lead_id=lead.id,
        score_before=old_score,
        score_after=new_score,
        behavioral_score_delta=b_delta,
        intent_score_delta=i_delta,
        reason=reason,
        event_type=reason,
    )
    db.add(entry)

# Public service functions

def update_lead_status(lead: Lead) -> None:
    """
    Automatic status transitions based on score + activity.
    Called after every score recalculation.
    Final states (converted/lost) are never auto-changed.
    """
    if lead.status in ("converted", "lost"):
        return

    cfg = get_scoring_config()
    if lead.score >= cfg.get_status_threshold("active"):
        lead.status = "active"
    elif lead.score >= cfg.get_status_threshold("new"):
        lead.status = "new"

def recalculate_lead_score(
    lead: Lead,
    db: Session,
    *,
    reason: str = "recalculation",
    commit: bool = True,
) -> dict[str, Any]:
    days = _days_inactive(lead)
    responses = _template_responses(lead.id, db)

    current_node = lead.current_node or 0
    total_nodes = lead.total_nodes or 0

    intent_signals = getattr(lead, "intent_signals", None)
    semantic_intent_score = _resolve_semantic_intent_score(lead)
    
    breakdown = calculate_score_breakdown(
        current_node=current_node,
        total_nodes=total_nodes,
        days_inactive=days,
        template_responses=responses,
        semantic_intent_score=semantic_intent_score,
        intent_signals=intent_signals,
        word_count=int(intent_signals.get("word_count", 0)) if isinstance(intent_signals, dict) else 0,
    )

    old_score = lead.score or 0
    new_score = breakdown["total"]
    old_b = lead.behavioral_score or 0
    old_i = lead.semantic_intent_score or 0
    new_b = breakdown["behavioral_score"]
    new_i = breakdown["semantic_intent_score"]
    
    if old_score != new_score or old_b != new_b or old_i != new_i:
        b_delta = new_b - old_b
        i_delta = new_i - old_i
        _log_score_change(lead, old_score, new_score, b_delta, i_delta, reason, db)

    lead.score = new_score
    lead.behavioral_score = new_b
    lead.semantic_intent_score = new_i
    lead.lead_tier = breakdown["lead_tier"]

    # FIX 3: Auto-update lead status based on new score
    update_lead_status(lead)

    if commit:
        db.commit()

    return breakdown


def recalculate_workspace_scores(
    workspace_id: UUID,
    db: Session,
) -> list[dict[str, Any]]:
    """Bulk-recalculate scores for every lead in a workspace."""
    leads = (
        db.query(Lead)
        .filter(Lead.workspace_id == workspace_id)
        .all()
    )
    results = []
    for lead in leads:
        breakdown = recalculate_lead_score(
            lead, db, reason="bulk_recalculation", commit=False
        )
        results.append({
            "lead_id": str(lead.id),
            "name": lead.name,
            "score": breakdown["total"],
            "behavioral_score": breakdown["behavioral_score"],
            "semantic_intent_score": breakdown["semantic_intent_score"],
            "lead_tier": breakdown["lead_tier"],
            "breakdown": breakdown,
        })
    db.flush()
    return results


def get_score_history(
    lead_id: UUID,
    db: Session,
    *,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Return the most recent score-change audit entries."""
    rows = (
        db.query(LeadScoreHistory)
        .filter(LeadScoreHistory.lead_id == lead_id)
        .order_by(LeadScoreHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "score_before": r.score_before,
            "score_after": r.score_after,
            "reason": r.reason,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


def get_workspace_lead_scores(
    workspace_id: UUID,
    db: Session,
    *,
    status_filter: str | None = None,
    min_score: int | None = None,
    max_score: int | None = None,
    sort_by: str = "score_desc",
    limit: int = 100,
    offset: int = 0,
) -> dict[str, Any]:
    """
    List leads with their current scores.
    Supports filtering by status, score range, and sorting.
    """
    query = db.query(Lead).filter(Lead.workspace_id == workspace_id)

    if status_filter:
        query = query.filter(Lead.status == status_filter)
    if min_score is not None:
        query = query.filter(Lead.score >= min_score)
    if max_score is not None:
        query = query.filter(Lead.score <= max_score)

    # Total count (before pagination)
    total = query.count()

    # Sorting
    if sort_by == "score_asc":
        query = query.order_by(Lead.score.asc().nullslast())
    elif sort_by == "score_desc":
        query = query.order_by(Lead.score.desc().nullsfirst())
    elif sort_by == "recent":
        query = query.order_by(Lead.last_activity_at.desc().nullslast())
    else:
        query = query.order_by(Lead.score.desc().nullsfirst())

    leads = query.offset(offset).limit(limit).all()

    items = []
    for lead in leads:
        days = _days_inactive(lead)
        responses = _template_responses(lead.id, db)
        intent_signals = getattr(lead, "intent_signals", None)
        breakdown = calculate_score_breakdown(
            current_node=lead.current_node or 0,
            total_nodes=lead.total_nodes or 0,
            days_inactive=days,
            template_responses=responses,
            semantic_intent_score=lead.semantic_intent_score or 0,
            intent_signals=intent_signals,
            word_count=int(intent_signals.get("word_count", 0))
                       if isinstance(intent_signals, dict) else 0,
        )

        # Ensure breakdown.total matches persisted score (single source of truth)
        breakdown["total"] = lead.score or 0
        breakdown["behavioral_score"] = lead.behavioral_score or 0
        breakdown["semantic_intent_score"] = lead.semantic_intent_score or 0
        breakdown["lead_tier"] = lead.lead_tier or "cold"

        items.append({
            "lead_id": str(lead.id),
            "name": lead.name,
            "phone": lead.phone,
            "source": lead.source,
            "channel": lead.source,
            "status": lead.status,

            # total score
            "score": lead.score or 0,

            # NEW segmented scores
            "behavioral_score": lead.behavioral_score or 0,
            "semantic_intent_score": lead.semantic_intent_score or 0,
            "lead_tier": lead.lead_tier or "cold",

            # explainable breakdown
            "breakdown": breakdown,

            "current_node": lead.current_node,
            "total_nodes": lead.total_nodes,

            "last_activity_at": (
                lead.last_activity_at.isoformat()
                if lead.last_activity_at else None
            ),

            "assigned_to": (
                str(lead.assigned_to)
                if lead.assigned_to else None
            ),

            "conversation_id": (
                str(lead.conversation_id)
                if lead.conversation_id else None
            ),
            "is_converted": lead.is_converted,
            "conversion_amount": float(lead.conversion_amount) if lead.conversion_amount is not None else None,
            "converted_at": lead.converted_at,
            "converted_product": lead.converted_product,
            "conversion_notes": lead.conversion_notes,
            "is_favorite": lead.is_favorite,
        })

    return {"total": total, "items": items}


def calculate_avg_reply_minutes(conversation_id: UUID, db: Session) -> float | None:
    if not conversation_id:
        return None

    from app.models.message import Message, SenderType
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.timestamp.asc())
        .all()
    )

    delays = []
    last_outbound_time = None

    for msg in messages:
        if msg.sender_type in (SenderType.AI, SenderType.AGENT):
            last_outbound_time = msg.timestamp
        elif msg.sender_type == SenderType.USER and last_outbound_time:
            delay_seconds = (msg.timestamp - last_outbound_time).total_seconds()
            if delay_seconds > 0:
                delays.append(delay_seconds / 60.0)
            last_outbound_time = None

    if not delays:
        return None

    return sum(delays) / len(delays)

