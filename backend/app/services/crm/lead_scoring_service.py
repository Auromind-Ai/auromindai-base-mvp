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

# Import standalone is_vague helper or define a fallback that delegates to detect_intent_signals
try:
    from app.utils.intent_detection import is_vague
except ImportError:
    from app.utils.intent_detection import detect_intent_signals
    def is_vague(message: str) -> bool:
        return detect_intent_signals(message)["signals"]["is_vague"]["value"]


# Core formula (stateless, pure function)

def get_lead_tier(score: int, business_type: str = "default") -> str:
    return get_scoring_config(business_type).get_tier(score)

def calculate_score(
    current_node: int,
    total_nodes: int,
    days_inactive: int,
    template_responses: list[str],
    semantic_intent_score: int = 0,
    progress_score: float | None = None,
    template_logs: list[TemplateLog] | None = None,
    active_labels: list[str] | None = None,
    label_score: int = 0,
) -> tuple[int, int, int, int, str]:
    # --- 1. Flow progress (20 pts max) ---
    # CHANGE 1: AI Flow node progress logic or normal flow progress
    if progress_score is not None:
        progress = progress_score
    elif total_nodes > 0:
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
    # CHANGE 2: Filter template engagement by 24h window
    if template_logs is not None:
        positive_replies = 0
        ignored_templates = 0
        now_utc = datetime.now(timezone.utc)
        for template in template_logs:
            sent_at = template.sent_at
            if sent_at.tzinfo is None:
                sent_at = sent_at.replace(tzinfo=timezone.utc)
            age = now_utc - sent_at
            # Skip templates still within 24h window (outcome not yet known)
            if age.total_seconds() < 86400:
                continue
            is_replied = getattr(template, "replied", None)
            if is_replied is None:
                is_replied = template.response_type in ("replied", "clicked")
            if is_replied:
                positive_replies += 1
            else:
                ignored_templates += 1
        engagement = (positive_replies * 10) - (ignored_templates * 5)
        engagement = max(min(engagement, 20), 0)
    else:
        positive = sum(1 for r in template_responses if r in ("replied", "clicked"))
        negative = sum(1 for r in template_responses if r == "ignored")
        engagement = min((positive * 10) - (negative * 5), 20)
        engagement = max(engagement, 0)

    # Behavioral score purely from engagement, progress, recency, capped at 60
    behavioral_score = max(min(round(progress + recency + engagement), 60), 0)
    cfg = get_scoring_config()
    intent_score = max(
        min(semantic_intent_score, cfg.get_cap("intent_max")),
        cfg.get_cap("intent_min")
    )
    
    # Natural AI Score (behavioral + intent) capped at 100/0
    natural_ai_score = max(
        min(behavioral_score + intent_score, cfg.get_cap("total_max")),
        cfg.get_cap("total_min")
    )
    
    # Calculate Agent Label Bonus
    LABEL_BONUSES = {
        "Interested": 10,
        "High Priority": 15,
        "Premium Lead": 20,
        "Follow Up": 5,
    }
    agent_label_bonus = sum(LABEL_BONUSES.get(label, 0) for label in (active_labels or []))
    if label_score > 0 and not active_labels:
        # Fallback to legacy label_score for compatibility
        agent_label_bonus = label_score
        
    # Final Score = Natural AI Score + Agent Label Bonus
    total_score = max(
        min(natural_ai_score + agent_label_bonus, cfg.get_cap("total_max")),
        cfg.get_cap("total_min")
    )
    
    tier = get_lead_tier(total_score)
    return total_score, behavioral_score, intent_score, agent_label_bonus, tier


# Score breakdown (same math, structured output)

def calculate_score_breakdown(
    current_node: int,
    total_nodes: int,
    days_inactive: int,
    template_responses: list[str],
    semantic_intent_score: int = 0,
    intent_signals: dict[str, Any] | None = None,
    word_count: int = 0,
    progress_score: float | None = None,
    template_logs: list[TemplateLog] | None = None,
    active_labels: list[str] | None = None,
    label_score: int = 0,
) -> dict[str, Any]:
    """Return the total score *plus* per-factor details."""
    
    total, behavioral, intent, agent_label_bonus, tier = calculate_score(
        current_node=current_node,
        total_nodes=total_nodes,
        days_inactive=days_inactive,
        template_responses=template_responses,
        semantic_intent_score=semantic_intent_score,
        progress_score=progress_score,
        template_logs=template_logs,
        active_labels=active_labels,
        label_score=label_score,
    )

    if progress_score is not None:
        progress = progress_score
    else:
        progress = round((current_node / total_nodes) * 20, 1) if total_nodes > 0 else 0.0

    if days_inactive == 0:
        recency = 20
    elif days_inactive <= 3:
        recency = 15
    elif days_inactive <= 7:
        recency = 10
    else:
        recency = 0

    if template_logs is not None:
        positive_replies = 0
        ignored_templates = 0
        now_utc = datetime.now(timezone.utc)
        for template in template_logs:
            sent_at = template.sent_at
            if sent_at.tzinfo is None:
                sent_at = sent_at.replace(tzinfo=timezone.utc)
            age = now_utc - sent_at
            if age.total_seconds() < 86400:
                continue
            is_replied = getattr(template, "replied", None)
            if is_replied is None:
                is_replied = template.response_type in ("replied", "clicked")
            if is_replied:
                positive_replies += 1
            else:
                ignored_templates += 1
        engagement = max(min((positive_replies * 10) - (ignored_templates * 5), 20), 0)
        positive_responses_count = positive_replies
        negative_responses_count = ignored_templates
    else:
        positive_responses_count = sum(1 for r in template_responses if r in ("replied", "clicked"))
        negative_responses_count = sum(1 for r in template_responses if r == "ignored")
        engagement_raw = (positive_responses_count * 10) - (negative_responses_count * 5)
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
                       "positive_responses": positive_responses_count,
                       "negative_responses": negative_responses_count},
        "intent": {
            "score": intent,
            "max": MAX_INTENT_SCORE,
            "signals": signals,
            "word_count": word_count,
        },
        "label_score": agent_label_bonus,
        "agent_label_bonus": agent_label_bonus,
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
    t_logs = db.query(TemplateLog).filter(TemplateLog.lead_id == lead.id).all()
    responses = [t.response_type for t in t_logs if t.response_type]

    # CHANGE 1: AI vs Normal Flow node progress detection
    from app.models.flow_execution import FlowExecutionState
    from app.models.automation import AutomationFlow
    from app.models.message import Message, SenderType
    
    flow_type = None
    state = db.query(FlowExecutionState).filter(FlowExecutionState.conversation_id == lead.conversation_id).first()
    if state and state.active_flow_id:
        flow = db.query(AutomationFlow).filter(AutomationFlow.id == state.active_flow_id).first()
        if flow:
            flow_type = getattr(flow, "type", None)
            
    progress_score = None
    if flow_type == "ai":
        messages = (
            db.query(Message)
            .filter(Message.conversation_id == lead.conversation_id)
            .order_by(Message.timestamp.asc())
            .all()
        )
        # Count customer messages that are not vague
        meaningful_count = sum(
            1 for msg in messages
            if (msg.sender_type == SenderType.USER or getattr(msg, "sender", None) == "customer")
            and not is_vague(msg.content or "")
        )
        progress_score = min(meaningful_count * 4, 20)

    current_node = lead.current_node or 0
    total_nodes = lead.total_nodes or 0

    intent_signals = getattr(lead, "intent_signals", None)
    semantic_intent_score = _resolve_semantic_intent_score(lead)
    
    active_labels = getattr(lead, "labels", None) or []
    
    breakdown = calculate_score_breakdown(
        current_node=current_node,
        total_nodes=total_nodes,
        days_inactive=days,
        template_responses=responses,
        semantic_intent_score=semantic_intent_score,
        intent_signals=intent_signals,
        word_count=int(intent_signals.get("word_count", 0)) if isinstance(intent_signals, dict) else 0,
        progress_score=progress_score,
        template_logs=t_logs,
        active_labels=active_labels,
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

    # Auto-update lead status based on new score
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
            active_labels=lead.labels or [],
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

            # labels list (NEW)
            "labels": lead.labels or [],

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

