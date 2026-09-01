

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, text, case, and_
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings

logger = logging.getLogger(__name__)

# Optional Redis cache (graceful degradation if Redis is unavailable)
_redis_client = None


async def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as aioredis
        _redis_client = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
        return _redis_client
    except Exception:
        return None


async def _cache_get(key: str) -> Any | None:
    r = await _get_redis()
    if not r:
        return None
    try:
        raw = await r.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def _cache_set(key: str, value: Any, ttl: int = 60) -> None:
    r = await _get_redis()
    if not r:
        return
    try:
        await r.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        pass


# Internal helper

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _start_of_month(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _human_time_ago(dt: datetime) -> str:
    """Convert a datetime to a human-readable '2m ago' string."""
    if dt is None:
        return "recently"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = _now_utc() - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return f"{seconds}s ago"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return f"{seconds // 86400}d ago"


def _safe_pct_change(current: float, previous: float) -> str:
    if previous == 0:
        return "New" if current > 0 else "—"
    pct = ((current - previous) / previous) * 100
    sign = "+" if pct >= 0 else ""
    return f"{sign}{pct:.1f}%"



def _trend(current: float, previous: float) -> str:
    if current > previous:
        return "up"
    if current < previous:
        return "down"
    return "neutral"


def _resolve_dates(start_date: date | None, end_date: date | None) -> tuple[datetime, datetime]:
    if start_date is not None and end_date is not None:
        start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        return start_dt, end_dt

    # Default to current week (Mon-Sun of this week)
    now = datetime.now(timezone.utc)
    monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    sunday = (monday + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=999999)
    return monday, sunday


def fmt_inr(amount: float | int) -> str:
    """Format an INR amount using the Indian numbering system (e.g. 1,00,000)."""
    try:
        val_str = str(int(round(float(amount or 0))))
    except (TypeError, ValueError):
        val_str = "0"
    
    if len(val_str) <= 3:
        return f"₹{val_str}"
    
    last_three = val_str[-3:]
    remaining = val_str[:-3]
    
    groups = []
    while remaining:
        groups.append(remaining[-2:])
        remaining = remaining[:-2]
        
    groups.reverse()
    formatted = ",".join(groups) + "," + last_three
    return f"₹{formatted}"


# 1. Overview metrics

async def get_overview_metrics(workspace_id: str, db: Session, start_date: date | None = None, end_date: date | None = None) -> list[dict]:
    import uuid
    if isinstance(workspace_id, str):
        try:
            workspace_id = uuid.UUID(workspace_id)
        except ValueError:
            pass
 
    start_dt, end_dt = _resolve_dates(start_date, end_date)
    duration = end_dt - start_dt
    prev_start_dt = start_dt - duration - timedelta(microseconds=1)
    prev_end_dt = start_dt - timedelta(microseconds=1)

    cache_key = f"dashboard:overview:{workspace_id}:{start_dt.isoformat()}:{end_dt.isoformat()}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    try:

        #  1. Total Revenue
        from app.models.ai_action import Lead

        if hasattr(Lead, "conversion_amount"):
            conversion_date = func.coalesce(Lead.converted_at, Lead.created_at)
            # Current period revenue
            revenue_this = (
                db.query(func.coalesce(func.sum(Lead.conversion_amount), 0))
                .filter(
                    Lead.workspace_id == workspace_id,
                    (Lead.status == "converted") | (Lead.is_converted == True),
                    conversion_date >= start_dt,
                    conversion_date <= end_dt,
                )
                .scalar()
            ) or 0

            # Last period revenue  
            revenue_last = (
                db.query(func.coalesce(func.sum(Lead.conversion_amount), 0))
                .filter(
                    Lead.workspace_id == workspace_id,
                    (Lead.status == "converted") | (Lead.is_converted == True),
                    conversion_date >= prev_start_dt,
                    conversion_date <= prev_end_dt,
                )
                .scalar()
            ) or 0

            revenue_this = float(revenue_this)
            revenue_last = float(revenue_last)

            revenue_metric = {
                "label": "Total Revenue",
                "value": fmt_inr(revenue_this),
                "raw_value": revenue_this,
                "change": _safe_pct_change(revenue_this, revenue_last),
                "trend": _trend(revenue_this, revenue_last),
                "subtext": "vs prior period",
                "gradient": "from-blue-500 via-cyan-400 to-emerald-400",
            }
        else:
            revenue_metric = {
                "label": "Total Revenue",
                "value": "₹0",
                "raw_value": 0,
                "change": "—",
                "trend": "neutral",
                "subtext": "mark leads as converted to track",
                "gradient": "from-blue-500 via-cyan-400 to-emerald-400",
            }

        #  2. Active Leads
        active_leads_now = (
            db.query(func.count(Lead.id))
            .filter(
                Lead.workspace_id == workspace_id,
                Lead.status.in_(["new", "active"]),
                Lead.created_at >= start_dt,
                Lead.created_at <= end_dt,
            )
            .scalar()
        ) or 0

        active_leads_prev = (
            db.query(func.count(Lead.id))
            .filter(
                Lead.workspace_id == workspace_id,
                Lead.status.in_(["new", "active"]),
                Lead.created_at >= prev_start_dt,
                Lead.created_at <= prev_end_dt,
            )
            .scalar()
        ) or 0

        #  3. Conversion Rate
        total_leads = (
            db.query(func.count(Lead.id))
            .filter(
                Lead.workspace_id == workspace_id,
                Lead.created_at >= start_dt,
                Lead.created_at <= end_dt,
            )
            .scalar()
        ) or 0

        conversion_date = func.coalesce(Lead.converted_at, Lead.created_at)
        converted_leads = (
            db.query(func.count(Lead.id))
            .filter(
                Lead.workspace_id == workspace_id,
                (Lead.status == "converted") | (Lead.is_converted == True),
                conversion_date >= start_dt,
                conversion_date <= end_dt,
            )
            .scalar()
        ) or 0

        total_leads_prev = (
            db.query(func.count(Lead.id))
            .filter(
                Lead.workspace_id == workspace_id,
                Lead.created_at >= prev_start_dt,
                Lead.created_at <= prev_end_dt,
            )
            .scalar()
        ) or 0

        converted_leads_prev = (
            db.query(func.count(Lead.id))
            .filter(
                Lead.workspace_id == workspace_id,
                (Lead.status == "converted") | (Lead.is_converted == True),
                conversion_date >= prev_start_dt,
                conversion_date <= prev_end_dt,
            )
            .scalar()
        ) or 0

        conv_rate = round((converted_leads / max(total_leads, 1)) * 100, 1)
        conv_rate_prev = round((converted_leads_prev / max(total_leads_prev, 1)) * 100, 1)

        #  4. Average Response Time
        from app.models.message import Message

        avg_resp_q = text("""
            SELECT AVG(
              EXTRACT(EPOCH FROM 
                (bot.timestamp - usr.timestamp)
              ) / 60
            )
            FROM (
              SELECT conversation_id, MIN(timestamp) as timestamp
              FROM messages WHERE sender_type::text = 'USER'
              AND timestamp >= :start_dt AND timestamp <= :end_dt
              GROUP BY conversation_id
            ) usr
            JOIN (
              SELECT conversation_id, MIN(timestamp) as timestamp
              FROM messages 
              WHERE sender_type::text IN ('AI','AGENT')
              GROUP BY conversation_id
            ) bot ON (
              bot.conversation_id = usr.conversation_id
              AND bot.timestamp > usr.timestamp
            )
            JOIN conversations c ON c.id = usr.conversation_id
            WHERE c.workspace_id = :wid
            AND EXTRACT(EPOCH FROM 
              (bot.timestamp - usr.timestamp)
            ) / 3600 < 1
        """)
        avg_resp_min = db.execute(avg_resp_q, {"wid": workspace_id, "start_dt": start_dt, "end_dt": end_dt}).scalar()
        avg_resp_min = round(float(avg_resp_min or 0), 0)

        # Prior period avg resp
        avg_resp_prev_q = text("""
            SELECT AVG(
              EXTRACT(EPOCH FROM 
                (bot.timestamp - usr.timestamp)
              ) / 60
            )
            FROM (
              SELECT conversation_id, MIN(timestamp) as timestamp
              FROM messages WHERE sender_type::text = 'USER'
              AND timestamp >= :prev_start_dt AND timestamp <= :prev_end_dt
              GROUP BY conversation_id
            ) usr
            JOIN (
              SELECT conversation_id, MIN(timestamp) as timestamp
              FROM messages 
              WHERE sender_type::text IN ('AI','AGENT')
              GROUP BY conversation_id
            ) bot ON (
              bot.conversation_id = usr.conversation_id
              AND bot.timestamp > usr.timestamp
            )
            JOIN conversations c ON c.id = usr.conversation_id
            WHERE c.workspace_id = :wid
            AND EXTRACT(EPOCH FROM 
              (bot.timestamp - usr.timestamp)
            ) / 3600 < 1
        """)
        avg_resp_prev = db.execute(avg_resp_prev_q, {"wid": workspace_id, "prev_start_dt": prev_start_dt, "prev_end_dt": prev_end_dt}).scalar()
        avg_resp_prev = round(float(avg_resp_prev or 0), 0)

        # Format minutes → "Xm" or "Xh Ym"
        def fmt_time(mins: float) -> str:
            m = int(mins)
            if m == 0:
                return "< 1m"
            if m < 60:
                return f"{m}m"
            return f"{m // 60}h {m % 60}m"

        if avg_resp_prev == 0:
            avg_resp_trend = "neutral" if avg_resp_min == 0 else "up"
        else:
            avg_resp_trend = "up" if avg_resp_min < avg_resp_prev else ("down" if avg_resp_min > avg_resp_prev else "neutral")

        result = [
            revenue_metric,
            {
                "label": "Active Leads",
                "value": str(active_leads_now),
                "raw_value": int(active_leads_now),
                "change": _safe_pct_change(active_leads_now, active_leads_prev),
                "trend": _trend(active_leads_now, active_leads_prev),
                "subtext": "active status",
                "gradient": "from-yellow-400 via-amber-400 to-orange-500",
            },
            {
                "label": "Conversion Rate",
                "value": f"{conv_rate}%",
                "raw_value": float(conv_rate),
                "change": _safe_pct_change(conv_rate, conv_rate_prev),
                "trend": _trend(conv_rate, conv_rate_prev),
                "subtext": "leads converted",
                "gradient": "from-purple-500 via-fuchsia-500 to-indigo-500",
            },
            {
                "label": "Avg. Response Time",
                "value": fmt_time(avg_resp_min),
                "raw_value": float(avg_resp_min),
                "change": _safe_pct_change(avg_resp_min, avg_resp_prev),
                "trend": avg_resp_trend,
                "subtext": "AI first reply",
                "gradient": "from-orange-600 via-red-500 to-rose-600",
            },
        ]

        await _cache_set(cache_key, result, ttl=120)
        return result

    except Exception as exc:
        logger.error(f"[dashboard_service] get_overview_metrics error: {exc}", exc_info=True)
        # Return safe fallback shapes so the frontend doesn't crash
        return _fallback_metrics()


def _fallback_metrics():
    return [
        {"label": "Total Revenue", "value": "—", "raw_value": 0, "change": "—", "trend": "neutral", "subtext": "data unavailable", "gradient": "from-blue-500 via-cyan-400 to-emerald-400"},
        {"label": "Active Leads", "value": "—", "raw_value": 0, "change": "—", "trend": "neutral", "subtext": "data unavailable", "gradient": "from-yellow-400 via-amber-400 to-orange-500"},
        {"label": "Conversion Rate", "value": "—", "raw_value": 0, "change": "—", "trend": "neutral", "subtext": "data unavailable", "gradient": "from-purple-500 via-fuchsia-500 to-indigo-500"},
        {"label": "Avg. Response Time", "value": "—", "raw_value": 0, "change": "—", "trend": "neutral", "subtext": "data unavailable", "gradient": "from-orange-600 via-red-500 to-rose-600"},
    ]


# 2. Revenue chart data

async def get_revenue_chart(workspace_id: str, db: Session, start_date: date | None = None, end_date: date | None = None) -> dict:
    import uuid
    if isinstance(workspace_id, str):
        try:
            workspace_id = uuid.UUID(workspace_id)
        except ValueError:
            pass

    now_utc = datetime.now(timezone.utc)
    current_year = now_utc.year
    prior_year = current_year - 1

    cache_key = f"dashboard:revenue:{workspace_id}:{current_year}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    try:
        from app.models.ai_action import Lead

        conversion_date = func.coalesce(Lead.converted_at, Lead.created_at)
        year_start = datetime(prior_year, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        year_end = datetime(current_year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)

        rows = (
            db.query(
                func.extract("year", conversion_date).label("yr"),
                func.extract("month", conversion_date).label("mo"),
                func.coalesce(func.sum(Lead.conversion_amount), 0).label("total"),
            )
            .filter(
                Lead.workspace_id == workspace_id,
                (Lead.status == "converted") | (Lead.is_converted == True),
                conversion_date >= year_start,
                conversion_date <= year_end,
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
            .all()
        )

        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        current_data = [0] * 12
        prior_data = [0] * 12
        for row in rows:
            mo_idx = int(row.mo) - 1
            amount_inr = float(row.total or 0)
            if int(row.yr) == current_year:
                current_data[mo_idx] = int(amount_inr)
            elif int(row.yr) == prior_year:
                prior_data[mo_idx] = int(amount_inr)

        result = {
            "months": months,
            "current_year": current_year,
            "prior_year": prior_year,
            "current_data": current_data,
            "prior_data": prior_data,
            "current_month_index": now_utc.month,
        }
        await _cache_set(cache_key, result, ttl=30)
        return result

    except Exception as exc:
        logger.error(f"[dashboard_service] get_revenue_chart error: {exc}", exc_info=True)
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return {
            "months": months,
            "current_year": current_year,
            "prior_year": prior_year,
            "current_data": [0] * 12,
            "prior_data": [0] * 12,
            "current_month_index": now_utc.month,
        }


# 3. Recent activities

async def get_recent_activities(workspace_id: str, db: Session, start_date: date | None = None, end_date: date | None = None) -> list[dict]:
    import uuid
    if isinstance(workspace_id, str):
        try:
            workspace_id = uuid.UUID(workspace_id)
        except ValueError:
            pass
  
    start_dt, end_dt = _resolve_dates(start_date, end_date)
    cache_key = f"dashboard:activities:{workspace_id}:{start_dt.isoformat()}:{end_dt.isoformat()}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    events: list[tuple[datetime, str]] = []

    # 1. Customer Messages
    try:
        from app.models.message import Message, SenderType
        from app.models.conversation import Conversation

        msgs = (
            db.query(Message.content, Message.timestamp, Conversation.contact_name)
            .join(Conversation, Conversation.id == Message.conversation_id)
            .filter(
                Conversation.workspace_id == workspace_id,
                Message.sender_type == SenderType.USER,
                Message.timestamp >= start_dt,
                Message.timestamp <= end_dt,
            )
            .order_by(Message.timestamp.desc())
            .limit(5)
            .all()
        )
        for m in msgs:
            contact = m.contact_name or "Customer"
            raw_content = (m.content or "").strip()
            snippet = f": {raw_content[:40]}…" if len(raw_content) > 40 else (f": {raw_content}" if raw_content else "")
            label = f"Customer message from {contact}{snippet}"
            events.append((m.timestamp, label))

    except Exception as e:
        logger.warning(f"[activities] messages fetch failed: {e}")

    # 2. AI Action / Tool Executions
    try:
        from app.models.ai_action import AIAction

        ai_actions = (
            db.query(AIAction.action_type, AIAction.created_at)
            .filter(
                AIAction.workspace_id == workspace_id,
                AIAction.execution_status == "completed",
                AIAction.created_at >= start_dt,
                AIAction.created_at <= end_dt,
            )
            .order_by(AIAction.created_at.desc())
            .limit(5)
            .all()
        )
        for a in ai_actions:
            action_title = (a.action_type or "task").replace("_", " ").title()
            label = f"AI action: {action_title}"
            events.append((a.created_at, label))

    except Exception as e:
        logger.warning(f"[activities] ai_actions fetch failed: {e}")

    # 3. New Lead Captured
    try:
        from app.models.ai_action import Lead

        leads = (
            db.query(Lead.name, Lead.source, Lead.created_at)
            .filter(
                Lead.workspace_id == workspace_id,
                Lead.created_at >= start_dt,
                Lead.created_at <= end_dt,
            )
            .order_by(Lead.created_at.desc())
            .limit(5)
            .all()
        )
        for l in leads:
            lead_name = l.name or "Unknown"
            source_tag = f" ({l.source.title()})" if l.source else ""
            label = f"New lead captured: {lead_name}{source_tag}"
            events.append((l.created_at, label))

    except Exception as e:
        logger.warning(f"[activities] leads fetch failed: {e}")

    # 4. Lead Score / Tier Upgraded
    try:
        from app.models.lead_scoring import LeadScoreHistory
        from app.models.ai_action import Lead

        score_events = (
            db.query(
                Lead.name,
                Lead.lead_tier,
                LeadScoreHistory.score_after,
                LeadScoreHistory.reason,
                LeadScoreHistory.created_at,
            )
            .join(Lead, Lead.id == LeadScoreHistory.lead_id)
            .filter(
                Lead.workspace_id == workspace_id,
                LeadScoreHistory.created_at >= start_dt,
                LeadScoreHistory.created_at <= end_dt,
                (LeadScoreHistory.score_after >= 70) | (Lead.lead_tier == "hot") | (LeadScoreHistory.reason.ilike("%tier%")),
            )
            .order_by(LeadScoreHistory.created_at.desc())
            .limit(5)
            .all()
        )
        for se in score_events:
            lead_name = se.name or "Lead"
            tier = (se.lead_tier or "HOT").upper()
            if se.score_after and se.score_after >= 70:
                label = f"Lead qualified: {lead_name} marked as {tier} ({se.score_after} pts)"
            else:
                label = f"Lead qualified: {lead_name} marked as {tier}"
            events.append((se.created_at, label))

    except Exception as e:
        logger.warning(f"[activities] lead score history fetch failed: {e}")

    # 5. Deal Won / Converted
    try:
        from app.models.ai_action import Lead

        converted_leads = (
            db.query(Lead.name, Lead.conversion_amount, Lead.converted_at)
            .filter(
                Lead.workspace_id == workspace_id,
                Lead.is_converted == True,
                Lead.converted_at.isnot(None),
                Lead.converted_at >= start_dt,
                Lead.converted_at <= end_dt,
            )
            .order_by(Lead.converted_at.desc())
            .limit(5)
            .all()
        )
        for cl in converted_leads:
            lead_name = cl.name or "Lead"
            if cl.conversion_amount:
                try:
                    amt_val = float(cl.conversion_amount)
                    amt_str = f"₹{amt_val:,.0f}" if amt_val.is_integer() else f"₹{amt_val:,.2f}"
                except Exception:
                    amt_str = f"₹{cl.conversion_amount}"
                label = f"Deal Won: {lead_name} ({amt_str})"
            else:
                label = f"Deal Won: {lead_name}"
            events.append((cl.converted_at, label))

    except Exception as e:
        logger.warning(f"[activities] converted leads fetch failed: {e}")

    # 6. Demo / Meeting Booked
    try:
        from app.models.integration import CalendarEvent

        meetings = (
            db.query(CalendarEvent.title, CalendarEvent.client_name, CalendarEvent.created_at)
            .filter(
                CalendarEvent.workspace_id == workspace_id,
                CalendarEvent.created_at >= start_dt,
                CalendarEvent.created_at <= end_dt,
            )
            .order_by(CalendarEvent.created_at.desc())
            .limit(5)
            .all()
        )
        for m in meetings:
            client = m.client_name or "Client"
            meeting_title = m.title or "Product Demo"
            label = f"Meeting scheduled: {meeting_title} with {client}"
            events.append((m.created_at, label))

    except Exception as e:
        logger.warning(f"[activities] meetings fetch failed: {e}")

    # Sort all events by timestamp desc
    events.sort(key=lambda x: x[0] if x[0] else datetime.min.replace(tzinfo=timezone.utc), reverse=True)

    result = [
        {"label": label, "time": _human_time_ago(ts)}
        for ts, label in events[:10]
    ]

    if not result:
        result = [{"label": "No recent activity", "time": "now"}]

    await _cache_set(cache_key, result, ttl=30)
    return result


# 4. AI Insights

async def get_ai_insights(workspace_id: str, db: Session, start_date: date | None = None, end_date: date | None = None) -> list[dict]:
    import uuid
    if isinstance(workspace_id, str):
        try:
            workspace_id = uuid.UUID(workspace_id)
        except ValueError:
            pass
    start_dt, end_dt = _resolve_dates(start_date, end_date)
    duration = end_dt - start_dt
    prev_start_dt = start_dt - duration - timedelta(microseconds=1)
    prev_end_dt = start_dt - timedelta(microseconds=1)

    cache_key = f"dashboard:insights:{workspace_id}:{start_dt.isoformat()}:{end_dt.isoformat()}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    now_utc = datetime.now(timezone.utc)
    today = now_utc.date()
    is_current_period = end_dt.date() >= today

    insights: list[dict] = []

    if is_current_period:

        # 1. Hot Leads Ready to Convert
        try:
            from app.models.ai_action import Lead

            hot_count = (
                db.query(func.count(Lead.id))
                .filter(
                    Lead.workspace_id == workspace_id,
                    (func.lower(Lead.qualification) == "hot") | (func.lower(Lead.lead_tier) == "hot"),
                    Lead.is_converted == False,
                    Lead.status.notin_(["converted", "lost", "closed"]),
                    Lead.archived_at.is_(None),
                )
                .scalar()
            ) or 0

            if hot_count > 0:
                insights.append({
                    "type": "opportunity",
                    "icon_type": "flame",
                    "title": "Hot Leads Ready to Convert",
                    "subtitle": f"{hot_count} active Hot Lead{'s' if hot_count != 1 else ''} showing high buying intent. Follow up to close deals.",
                    "icon_bg": "bg-orange-500/10",
                    "icon_color": "text-orange-400",
                })
        except Exception as e:
            logger.warning(f"[insights] current hot leads error: {e}")

        # 2. Human Attention Required
        try:
            from app.models.conversation import Conversation

            escalated_count = (
                db.query(func.count(Conversation.id))
                .filter(
                    Conversation.workspace_id == workspace_id,
                    Conversation.status == "OPEN",
                    Conversation.agent_locked == True,
                )
                .scalar()
            ) or 0

            if escalated_count > 0:
                insights.append({
                    "type": "optimization",
                    "icon_type": "bot",
                    "title": "Human Attention Required",
                    "subtitle": f"{escalated_count} conversation{'s' if escalated_count != 1 else ''} escalated for human agent review.",
                    "icon_bg": "bg-red-500/10",
                    "icon_color": "text-red-400",
                })
        except Exception as e:
            logger.warning(f"[insights] human attention error: {e}")

        # 3. AI Booked Meetings
        try:
            from app.models.integration import CalendarEvent

            meeting_count = (
                db.query(func.count(CalendarEvent.id))
                .filter(
                    CalendarEvent.workspace_id == workspace_id,
                    CalendarEvent.created_at >= start_dt,
                    CalendarEvent.created_at <= end_dt,
                )
                .scalar()
            ) or 0

            if meeting_count > 0:
                insights.append({
                    "type": "opportunity",
                    "icon_type": "bot",
                    "title": "AI Booked Meetings",
                    "subtitle": f"{meeting_count} demo meeting{'s' if meeting_count != 1 else ''} scheduled by AI for this period.",
                    "icon_bg": "bg-purple-500/10",
                    "icon_color": "text-purple-400",
                })
        except Exception as e:
            logger.warning(f"[insights] booked meetings error: {e}")

        # 4. Strong Inbound Momentum
        try:
            from app.models.conversation import Conversation
            from app.models.ai_action import Lead

            cur_convs = (
                db.query(func.count(Conversation.id))
                .filter(
                    Conversation.workspace_id == workspace_id,
                    Conversation.created_at >= start_dt,
                    Conversation.created_at <= end_dt,
                )
                .scalar()
            ) or 0

            prev_convs = (
                db.query(func.count(Conversation.id))
                .filter(
                    Conversation.workspace_id == workspace_id,
                    Conversation.created_at >= prev_start_dt,
                    Conversation.created_at <= prev_end_dt,
                )
                .scalar()
            ) or 0

            total_leads = (
                db.query(func.count(Lead.id))
                .filter(
                    Lead.workspace_id == workspace_id,
                    Lead.created_at >= start_dt,
                    Lead.created_at <= end_dt,
                )
                .scalar()
            ) or 0

            converted_leads = (
                db.query(func.count(Lead.id))
                .filter(
                    Lead.workspace_id == workspace_id,
                    Lead.is_converted == True,
                    Lead.converted_at >= start_dt,
                    Lead.converted_at <= end_dt,
                )
                .scalar()
            ) or 0

            conv_rate = round((converted_leads / total_leads * 100), 0) if total_leads > 0 else 0

            if cur_convs > prev_convs and prev_convs > 0:
                growth_pct = round(((cur_convs - prev_convs) / prev_convs) * 100, 0)
                insights.append({
                    "type": "opportunity",
                    "icon_type": "mail",
                    "title": "Strong Inbound Momentum",
                    "subtitle": f"Inbound conversations grew {growth_pct:.0f}% this period with a {conv_rate:.0f}% lead conversion rate.",
                    "icon_bg": "bg-emerald-500/10",
                    "icon_color": "text-emerald-400",
                })
            elif cur_convs > 0:
                insights.append({
                    "type": "opportunity",
                    "icon_type": "mail",
                    "title": "Strong Inbound Momentum",
                    "subtitle": f"{cur_convs} inbound conversation{'s' if cur_convs != 1 else ''} recorded with a {conv_rate:.0f}% lead conversion rate.",
                    "icon_bg": "bg-emerald-500/10",
                    "icon_color": "text-emerald-400",
                })
        except Exception as e:
            logger.warning(f"[insights] inbound momentum error: {e}")

    else:

        # 1. Lead Generation Performance
        try:
            from app.models.ai_action import Lead

            captured_count = (
                db.query(func.count(Lead.id))
                .filter(
                    Lead.workspace_id == workspace_id,
                    Lead.created_at >= start_dt,
                    Lead.created_at <= end_dt,
                )
                .scalar()
            ) or 0

            if captured_count > 0:
                insights.append({
                    "type": "opportunity",
                    "icon_type": "bot",
                    "title": "Strong Lead Activity",
                    "subtitle": f"{captured_count} lead{'s were' if captured_count != 1 else ' was'} captured during this period.",
                    "icon_bg": "bg-indigo-500/10",
                    "icon_color": "text-indigo-400",
                })
        except Exception as e:
            logger.warning(f"[insights] historical lead activity error: {e}")

        # 2. Conversion Performance
        try:
            from app.models.ai_action import Lead

            converted_count = (
                db.query(func.count(Lead.id))
                .filter(
                    Lead.workspace_id == workspace_id,
                    Lead.is_converted == True,
                    Lead.converted_at >= start_dt,
                    Lead.converted_at <= end_dt,
                )
                .scalar()
            ) or 0

            if converted_count > 0:
                insights.append({
                    "type": "opportunity",
                    "icon_type": "flame",
                    "title": "Conversion Performance",
                    "subtitle": f"{converted_count} lead{'s were' if converted_count != 1 else ' was'} converted during this period.",
                    "icon_bg": "bg-orange-500/10",
                    "icon_color": "text-orange-400",
                })
        except Exception as e:
            logger.warning(f"[insights] historical conversion error: {e}")

        # 3. Response Performance
        try:
            avg_resp_q = text("""
                SELECT AVG(
                  EXTRACT(EPOCH FROM 
                    (bot.timestamp - usr.timestamp)
                  ) / 60
                )
                FROM (
                  SELECT conversation_id, MIN(timestamp) as timestamp
                  FROM messages WHERE sender_type::text = 'USER'
                  AND timestamp >= :start_dt AND timestamp <= :end_dt
                  GROUP BY conversation_id
                ) usr
                JOIN (
                  SELECT conversation_id, MIN(timestamp) as timestamp
                  FROM messages 
                  WHERE sender_type::text IN ('AI','AGENT')
                  GROUP BY conversation_id
                ) bot ON (
                  bot.conversation_id = usr.conversation_id
                  AND bot.timestamp > usr.timestamp
                )
                JOIN conversations c ON c.id = usr.conversation_id
                WHERE c.workspace_id = :wid
                AND EXTRACT(EPOCH FROM 
                  (bot.timestamp - usr.timestamp)
                ) / 3600 < 1
            """)
            avg_resp_val = db.execute(avg_resp_q, {"wid": str(workspace_id), "start_dt": start_dt, "end_dt": end_dt}).scalar()
            avg_resp_min = round(float(avg_resp_val or 0), 1)

            if avg_resp_min > 0 and avg_resp_min <= 1:
                resp_text = "under 1 minute"
            elif avg_resp_min > 1:
                resp_text = f"around {int(avg_resp_min)} minutes"
            else:
                resp_text = "under 1 minute"

            insights.append({
                "type": "optimization",
                "icon_type": "mail",
                "title": "Response Performance",
                "subtitle": f"Average first response was {resp_text}.",
                "icon_bg": "bg-emerald-500/10",
                "icon_color": "text-emerald-400",
            })
        except Exception as e:
            logger.warning(f"[insights] historical response performance error: {e}")

        # 4. AI Booked Meetings
        try:
            from app.models.integration import CalendarEvent

            meeting_count = (
                db.query(func.count(CalendarEvent.id))
                .filter(
                    CalendarEvent.workspace_id == workspace_id,
                    CalendarEvent.created_at >= start_dt,
                    CalendarEvent.created_at <= end_dt,
                )
                .scalar()
            ) or 0

            if meeting_count > 0:
                insights.append({
                    "type": "opportunity",
                    "icon_type": "bot",
                    "title": "AI Booked Meetings",
                    "subtitle": f"{meeting_count} demo meeting{'s were' if meeting_count != 1 else ' was'} scheduled in this period.",
                    "icon_bg": "bg-purple-500/10",
                    "icon_color": "text-purple-400",
                })
        except Exception as e:
            logger.warning(f"[insights] historical booked meetings error: {e}")

    # 5. Fallback if nothing computed
    if not insights:
        insights = [
            {
                "type": "info",
                "icon_type": "bot",
                "title": "All Systems Healthy",
                "subtitle": "No actionable insights right now. Check back soon.",
                "icon_bg": "bg-emerald-500/10",
                "icon_color": "text-emerald-400",
            }
        ]

    await _cache_set(cache_key, insights, ttl=15)
    return insights


# 5. Overview bundle (single endpoint, parallel aggregation)

async def get_full_overview(workspace_id: str, db: Session, start_date: date | None = None, end_date: date | None = None) -> dict:
    start_dt, end_dt = _resolve_dates(start_date, end_date)
    cache_key = f"dashboard:full:{workspace_id}:{start_dt.isoformat()}:{end_dt.isoformat()}"
    cached = await _cache_get(cache_key)
    if cached:
        return cached

    # Run sub-aggregations sequentially to prevent concurrent access issues on the shared DB session
    metrics = await get_overview_metrics(workspace_id, db, start_date=start_date, end_date=end_date)
    revenue = await get_revenue_chart(workspace_id, db, start_date=start_date, end_date=end_date)
    activities = await get_recent_activities(workspace_id, db, start_date=start_date, end_date=end_date)
    insights = await get_ai_insights(workspace_id, db, start_date=start_date, end_date=end_date)

    result = {
        "metrics": metrics,
        "revenue": revenue,
        "activities": activities,
        "insights": insights,
    }
    await _cache_set(cache_key, result, ttl=15)
    return result
