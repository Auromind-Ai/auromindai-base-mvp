import logging
from typing import Any
from datetime import datetime, timezone, timedelta
from app.core.celery_app import celery_app
from app.database import SessionLocal
from app.models.subscription import Subscription
from app.models.billing import Payment
from app.models.wcc import WCCTransaction, WCCRechargeLog
from app.core.enums import SubscriptionStatus, PaymentStatus
from sqlalchemy import func

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.workers.billing_worker.cleanup_abandoned_pending_subscriptions",
)
def cleanup_abandoned_pending_subscriptions():
    """Daily Celery Beat Task: Automatically cancels pending subscription checkout initializations older than 24 hours."""
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        abandoned_subs = (
            db.query(Subscription)
            .filter(
                Subscription.status == SubscriptionStatus.pending,
                Subscription.created_at < cutoff
            )
            .all()
        )
        cancelled_count = 0
        for sub in abandoned_subs:
            sub.status = SubscriptionStatus.cancelled
            sub.canceled_at = datetime.now(timezone.utc)
            cancelled_count += 1

        db.commit()
        logger.info(f"[cleanup_abandoned_pending_subscriptions] Auto-cancelled {cancelled_count} abandoned pending checkouts older than 24 hours.")
        return {"cancelled_count": cancelled_count}
    except Exception as exc:
        db.rollback()
        logger.error(f"[cleanup_abandoned_pending_subscriptions] Error cleaning up pending checkouts: {exc}")
        raise exc
    finally:
        db.close()


@celery_app.task(
    name="app.workers.billing_worker.cleanup_expired_subscriptions",
)
def cleanup_expired_subscriptions():
    """Daily Celery Beat Task: Automatically marks subscriptions past their period end as expired."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expired_subs = (
            db.query(Subscription)
            .filter(
                Subscription.status == SubscriptionStatus.active,
                Subscription.current_period_end < now
            )
            .all()
        )
        expired_count = 0
        for sub in expired_subs:
            sub.status = SubscriptionStatus.expired
            expired_count += 1

        db.commit()
        logger.info(f"[cleanup_expired_subscriptions] Marked {expired_count} past-due subscriptions as expired.")
        return {"expired_count": expired_count}
    except Exception as exc:
        db.rollback()
        logger.error(f"[cleanup_expired_subscriptions] Error cleaning up expired subscriptions: {exc}")
        raise exc
    finally:
        db.close()


@celery_app.task(
    name="app.workers.billing_worker.wcc_daily_reconciliation",
)
def wcc_daily_reconciliation():
    """Daily Celery Beat Task: Reconciles daily WhatsApp credit session debits across all active workspaces."""
    logger.info("[wcc_daily_reconciliation] Starting daily WCC wallet reconciliation")
    db = SessionLocal()
    try:
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        start_of_yesterday = datetime(yesterday.year, yesterday.month, yesterday.day, 0, 0, 0, tzinfo=timezone.utc)
        end_of_yesterday = datetime(yesterday.year, yesterday.month, yesterday.day, 23, 59, 59, tzinfo=timezone.utc)

        summary = (
            db.query(
                WCCTransaction.workspace_id,
                func.sum(WCCTransaction.debit_amount).label("total_debit"),
                func.count(WCCTransaction.id).label("total_sessions")
            )
            .filter(WCCTransaction.created_at >= start_of_yesterday)
            .filter(WCCTransaction.created_at <= end_of_yesterday)
            .group_by(WCCTransaction.workspace_id)
            .all()
        )

        for row in summary:
            logger.info(
                f"[wcc_daily_reconciliation] Workspace {row.workspace_id} had {row.total_sessions} sessions "
                f"costing {row.total_debit} INR yesterday ({start_of_yesterday.date()})"
            )

        return {"reconciled_workspaces": len(summary)}
    except Exception as exc:
        logger.error(f"[wcc_daily_reconciliation] Error: {exc}")
        raise exc
    finally:
        db.close()
