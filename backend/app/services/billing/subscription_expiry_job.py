"""Subscription Expiry Job — Daily cron task to send pre-expiry reminders (7 days and 3 days)."""

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.subscription import Subscription
from app.core.enums import SubscriptionStatus
from app.services.notification_service import NotificationService

logger = logging.getLogger("auromind")

def check_subscription_expiries(db: Session) -> dict:
    """
    Scans active subscriptions and sends reminders for ones expiring in 7 days or 3 days.
    Idempotent: Uses deduplication keys to guarantee reminders are sent exactly once per milestone.
    """
    now = datetime.now(timezone.utc)
    day_7_start = now + timedelta(days=6, hours=12)
    day_7_end   = now + timedelta(days=7, hours=12)
    
    day_3_start = now + timedelta(days=2, hours=12)
    day_3_end   = now + timedelta(days=3, hours=12)

    active_subs = db.query(Subscription).filter(
        Subscription.status == SubscriptionStatus.active
    ).all()

    reminders_sent = {"7_day": 0, "3_day": 0}

    for sub in active_subs:
        end_date = sub.current_period_end or sub.end_date
        if not end_date:
            continue

        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        formatted_date = end_date.strftime("%B %d, %Y")
        sub_id_str = str(sub.id)

        if day_7_start <= end_date <= day_7_end:
            try:
                NotificationService.notify_workspace(
                    db=db,
                    workspace_id=sub.workspace_id,
                    type="billing_alert",
                    title=None,
                    message=None,
                    send_email=True,
                    email_subject=None,
                    deduplication_key=f"sub_reminder:{sub_id_str}:7day",
                    template_key="subscription_expiring_7d",
                    variables={
                        "expiry_date": formatted_date
                    }
                )
                reminders_sent["7_day"] += 1
            except Exception as e:
                logger.error(f"[SubscriptionExpiryJob] Failed 7-day reminder for workspace {sub.workspace_id}: {e}")

        elif day_3_start <= end_date <= day_3_end:
            try:
                NotificationService.notify_workspace(
                    db=db,
                    workspace_id=sub.workspace_id,
                    type="billing_alert",
                    title=None,
                    message=None,
                    send_email=True,
                    is_critical=True,
                    email_subject=None,
                    deduplication_key=f"sub_reminder:{sub_id_str}:3day",
                    template_key="subscription_expiring_3d",
                    variables={
                        "expiry_date": formatted_date
                    }
                )
                reminders_sent["3_day"] += 1
            except Exception as e:
                logger.error(f"[SubscriptionExpiryJob] Failed 3-day reminder for workspace {sub.workspace_id}: {e}")

    logger.info(f"[SubscriptionExpiryJob] Completed. Sent {reminders_sent['7_day']} 7-day and {reminders_sent['3_day']} 3-day reminders.")
    return reminders_sent
