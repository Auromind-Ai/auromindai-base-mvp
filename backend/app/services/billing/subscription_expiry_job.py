

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.event_bus import emit_event
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
                emit_event(
                    event_name="subscription.expiring_7d",
                    payload={
                        "expiry_date": formatted_date,
                        "workspace_id": str(sub.workspace_id),
                        "action_route": "/billing",
                        "action_label": "Renew Plan"
                    },
                    workspace_id=sub.workspace_id,
                    idempotency_key=f"sub_reminder:{sub_id_str}:7day",
                    db=db
                )
                reminders_sent["7_day"] += 1
            except Exception as e:
                logger.error(f"[SubscriptionExpiryJob] Failed 7-day reminder for workspace {sub.workspace_id}: {e}")

        elif day_3_start <= end_date <= day_3_end:
            try:
                from app.core.event_bus import emit_event
                emit_event(
                    event_name="subscription.expiring_3d",
                    payload={
                        "expiry_date": formatted_date,
                        "workspace_id": str(sub.workspace_id),
                        "action_route": "/billing",
                        "action_label": "Renew Immediately",
                        "is_critical": True
                    },
                    workspace_id=sub.workspace_id,
                    idempotency_key=f"sub_reminder:{sub_id_str}:3day",
                    db=db
                )
                reminders_sent["3_day"] += 1
            except Exception as e:
                logger.error(f"[SubscriptionExpiryJob] Failed 3-day reminder for workspace {sub.workspace_id}: {e}")

    logger.info(f"[SubscriptionExpiryJob] Completed. Sent {reminders_sent['7_day']} 7-day and {reminders_sent['3_day']} 3-day reminders.")
    return reminders_sent
