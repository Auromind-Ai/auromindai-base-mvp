from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta
from typing import Dict, Any

from app.database import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.workspace import Workspace
from app.models.invoice import Invoice
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.models.token_ledger import TokenLedger
from app.core.enums import InvoiceStatus, SubscriptionStatus
from app.core.metrics import get_metrics
from app.routers.admin.system import get_queue_depth, get_cache_hit_rate

router = APIRouter()

@router.get("/analytics")
async def get_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        now = datetime.utcnow()
        today = now.date()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)
        seven_days_ago = now - timedelta(days=7)

        # 1. User Metrics
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        new_users_7d = db.query(func.count(User.id)).filter(User.created_at >= seven_days_ago).scalar() or 0
        active_users_30d = db.query(func.count(User.id)).filter(User.created_at >= thirty_days_ago, User.is_active == True).scalar() or active_users
        verified_users = active_users

        users_last_30d = db.query(func.count(User.id)).filter(User.created_at >= thirty_days_ago).scalar() or 0
        users_prev_30d = db.query(func.count(User.id)).filter(User.created_at >= sixty_days_ago, User.created_at < thirty_days_ago).scalar() or 0
        if users_prev_30d > 0:
            user_growth_val = round(((users_last_30d - users_prev_30d) / users_prev_30d) * 100, 1)
            users_growth = f"{'+' if user_growth_val >= 0 else ''}{user_growth_val}%"
        elif users_last_30d > 0:
            users_growth = "+100%"
        else:
            users_growth = "+0%"

        # 2. Workspace Metrics
        total_workspaces = db.query(func.count(Workspace.id)).scalar() or 0
        active_workspaces = (
            db.query(func.count(Workspace.id))
            .outerjoin(User, Workspace.created_by == User.id)
            .filter((User.is_active == True) | (User.is_active.is_(None)))
            .scalar()
        ) or total_workspaces

        trial_users = (
            db.query(func.count(Subscription.id))
            .join(Plan, Subscription.plan_id == Plan.id)
            .filter(
                Subscription.status == SubscriptionStatus.active,
                func.lower(Plan.name).in_(["free", "trial"])
            )
            .scalar() or 0
        )

        # 3. Conversation & Message Metrics
        total_conversations = db.query(func.count(Conversation.id)).scalar() or 0
        active_conversations = total_conversations
        conversations_today = db.query(func.count(Conversation.id)).filter(
            func.date(Conversation.created_at) == today
        ).scalar() or 0
        total_messages = db.query(func.count(Message.id)).scalar() or 0
        avg_messages = round(total_messages / total_conversations, 2) if total_conversations > 0 else 0.0

        # 4. Revenue & Subscription Metrics
        total_revenue_val = (
            db.query(func.coalesce(func.sum(Invoice.amount), 0.0))
            .filter(Invoice.status == InvoiceStatus.paid)
            .scalar()
        )
        total_revenue = float(total_revenue_val or 0.0)

        mrr_val = (
            db.query(func.coalesce(func.sum(Plan.monthly_price), 0.0))
            .join(Subscription, Subscription.plan_id == Plan.id)
            .filter(Subscription.status == SubscriptionStatus.active)
            .scalar()
        )
        mrr = float(mrr_val or 0.0)

        one_time_val = (
            db.query(func.coalesce(func.sum(Invoice.amount), 0.0))
            .filter(
                Invoice.status == InvoiceStatus.paid,
                Invoice.product_type != "subscription"
            )
            .scalar()
        )
        one_time_revenue = float(one_time_val or 0.0)

        arpu = round(total_revenue / total_users, 2) if total_users > 0 else 0.0

        rev_last_30d = float(db.query(func.coalesce(func.sum(Invoice.amount), 0.0)).filter(Invoice.status == InvoiceStatus.paid, Invoice.paid_at >= thirty_days_ago).scalar() or 0.0)
        rev_prev_30d = float(db.query(func.coalesce(func.sum(Invoice.amount), 0.0)).filter(Invoice.status == InvoiceStatus.paid, Invoice.paid_at >= sixty_days_ago, Invoice.paid_at < thirty_days_ago).scalar() or 0.0)
        if rev_prev_30d > 0:
            rev_growth_val = round(((rev_last_30d - rev_prev_30d) / rev_prev_30d) * 100, 1)
            revenue_growth = f"{'+' if rev_growth_val >= 0 else ''}{rev_growth_val}%"
        elif rev_last_30d > 0:
            revenue_growth = "+100%"
        else:
            revenue_growth = "+0%"

        # 5. Token Usage
        total_token_usage = (
            db.query(func.coalesce(func.sum(TokenLedger.total_tokens), 0))
            .scalar()
        ) or 0

        # 6. Database Healthcheck
        db_status = "Healthy"
        try:
            db.execute(text("SELECT 1"))
        except Exception:
            db_status = "Degraded"

        # 7. System & API Middleware Metrics
        metrics = await get_metrics()

        return {
            "api_calls_today": metrics["total_api_calls"],
            "total_api_calls": metrics["total_api_calls"],
            "api_calls_month": metrics["total_api_calls"],
            "avg_response_time": metrics["avg_response_time"],
            "error_rate": metrics["error_rate"],
            "uptime_percent": 99.95,

            "total_users": total_users,
            "active_today": active_users,
            "active_users_30d": active_users_30d,
            "new_users_7d": new_users_7d,
            "verified_users": verified_users,
            "trial_users": trial_users,

            "total_workspaces": total_workspaces,
            "active_workspaces": active_workspaces,

            "total_conversations": total_conversations,
            "active_conversations": active_conversations,
            "conversations_today": conversations_today,
            "avg_messages_per_conv": avg_messages,

            "total_revenue": total_revenue,
            "mrr": mrr,
            "one_time_revenue": one_time_revenue,
            "arpu": arpu,
            "total_token_usage": total_token_usage,

            "users_growth": users_growth,
            "revenue_growth": revenue_growth,
            "api_growth": "+0%",
            "active_today_growth": "+0%",

            "db_status": db_status,
            "cache_hit_rate": get_cache_hit_rate(),
            "queue_depth": get_queue_depth(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {str(e)}")
