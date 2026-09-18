"""One workspace-scoped query for the existing CRM list, export and analytics."""
from sqlalchemy import cast, func, or_, select, case
from sqlalchemy.dialects.postgresql import JSONB

from app.models.ai_action import Lead
from app.models.lead_scoring import LeadScoreHistory
from app.models.message import Message, SenderType
from app.schemas.crm_filters import LeadFilters
from app.utils.scoring_config import get_scoring_config


def signal_active(key):
    # Older rows store booleans; current scoring stores {value, ...} per signal.
    signals = cast(Lead.intent_signals, JSONB)
    return or_(signals[key].astext == "true", signals[key]["value"].astext == "true")


def source_expression():
    source = func.lower(func.coalesce(Lead.source, "manual"))
    return case((source.in_(["sms", "phone", "twilio"]), "twilio"),
                (source == "", "manual"), else_=source)


def lead_query(db, workspace_id, filters: LeadFilters, user_id=None):
    q = db.query(Lead).filter(Lead.workspace_id == workspace_id)
    f = filters
    if f.search and f.search.strip():
        term = "%" + f.search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        q = q.filter(or_(*[c.ilike(term, escape="\\") for c in (Lead.name, Lead.phone, Lead.email)]))
    for values, column in ((f.sources, source_expression()), (f.statuses, Lead.status), (f.tiers, Lead.lead_tier)):
        if values:
            q = q.filter(column.in_(values))
    for low, high, column in ((f.min_score, f.max_score, func.coalesce(Lead.score, 0)),
                              (f.min_value, f.max_value, Lead.conversion_amount),
                              (f.created_from, f.created_to, Lead.created_at),
                              (f.activity_from, f.activity_to, Lead.last_activity_at),
                              (f.converted_from, f.converted_to, Lead.converted_at)):
        if low is not None:
            q = q.filter(column >= low)
        if high is not None:
            # Datetime upper bounds are exclusive, so full days include fractional seconds.
            q = q.filter(column < high if hasattr(high, "tzinfo") else column <= high)
    for value, column in ((f.converted, Lead.is_converted), (f.favorite, Lead.is_favorite)):
        if value is not None:
            q = q.filter(column.is_(value))
    for value, column in ((f.has_phone, Lead.phone), (f.has_email, Lead.email)):
        if value is not None:
            present = func.length(func.trim(func.coalesce(column, ""))) > 0
            q = q.filter(present if value else ~present)
    if f.product:
        q = q.filter(Lead.converted_product.ilike("%" + f.product.replace("%", "\\%").replace("_", "\\_") + "%", escape="\\"))
    if f.assignment == "mine":
        if user_id is None:
            raise ValueError("My leads requires an authenticated user")
        q = q.filter(Lead.assigned_to == user_id)
    elif f.assignment == "unassigned":
        q = q.filter(Lead.assigned_to.is_(None))
    elif f.assignment == "assigned":
        q = q.filter(Lead.assigned_to.isnot(None))
    if f.assigned_to:
        q = q.filter(Lead.assigned_to == f.assigned_to)
    if f.labels:
        q = q.filter(or_(*[cast(Lead.labels, JSONB).contains([label]) for label in f.labels]))
    if f.intents:
        allowed = get_scoring_config().get_weights()
        if any(key not in allowed for key in f.intents):
            raise ValueError("Unknown buying intent filter")
        q = q.filter(or_(*[signal_active(key) for key in f.intents]))
    if f.score_changed:
        delta = (select(LeadScoreHistory.score_after - LeadScoreHistory.score_before)
                 .where(LeadScoreHistory.lead_id == Lead.id)
                 .order_by(LeadScoreHistory.created_at.desc(), LeadScoreHistory.id.desc())
                 .limit(1).correlate(Lead).scalar_subquery())
        q = q.filter({"increased": delta > 0, "decreased": delta < 0, "unchanged": delta == 0}[f.score_changed])
    if f.min_messages is not None or f.max_messages is not None:
        count = (select(func.count(Message.id)).where(Message.conversation_id == Lead.conversation_id,
                 Message.sender_type != SenderType.SYSTEM).correlate(Lead).scalar_subquery())
        if f.min_messages is not None:
            q = q.filter(count >= f.min_messages)
        if f.max_messages is not None:
            q = q.filter(count <= f.max_messages)
    if f.unread is not None:
        unread = (select(Message.id).where(Message.conversation_id == Lead.conversation_id,
                  Message.sender_type == SenderType.USER, Message.is_read.is_(False)).correlate(Lead).exists())
        q = q.filter(unread if f.unread else ~unread)
    if f.waiting:
        last_sender = (select(Message.sender_type).where(Message.conversation_id == Lead.conversation_id,
                       Message.sender_type != SenderType.SYSTEM)
                       .order_by(Message.timestamp.desc(), Message.id.desc()).limit(1).correlate(Lead).scalar_subquery())
        q = q.filter(last_sender == SenderType.USER if f.waiting == "customer"
                     else last_sender.in_([SenderType.AI, SenderType.AGENT]))
    return q
