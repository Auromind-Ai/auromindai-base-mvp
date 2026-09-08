"""
Notification Category Resolver and Taxonomy Registry.

Separates notification categorization business logic from database models,
providing a single source of truth for mapping event types to presentation tabs
('mentions', 'updates', 'system').
"""
from typing import Optional, Dict


class NotificationCategory:
    ALL = "all"
    UNREAD = "unread"
    MENTIONS = "mentions"
    UPDATES = "updates"
    SYSTEM = "system"


NOTIFICATION_CATEGORY_MAPPING: Dict[str, str] = {
    # Mentions & direct engagements
    "lead_alert": NotificationCategory.MENTIONS,
    "lead_assigned": NotificationCategory.MENTIONS,
    "lead_created": NotificationCategory.MENTIONS,
    "lead_converted": NotificationCategory.MENTIONS,
    "mention": NotificationCategory.MENTIONS,
    "team_mention": NotificationCategory.MENTIONS,
    "task_assigned": NotificationCategory.MENTIONS,
    "conversation_assigned": NotificationCategory.MENTIONS,
    "message_received": NotificationCategory.MENTIONS,
    "lead.created": NotificationCategory.MENTIONS,
    "lead.assigned": NotificationCategory.MENTIONS,

    # Product, credits & workflow updates
    "product_update": NotificationCategory.UPDATES,
    "ai_credits": NotificationCategory.UPDATES,
    "workflow_completed": NotificationCategory.UPDATES,
    "wallet_recharge": NotificationCategory.UPDATES,
    "credit_added": NotificationCategory.UPDATES,
    "report_ready": NotificationCategory.UPDATES,
    "feature_announcement": NotificationCategory.UPDATES,
    "workflow.completed": NotificationCategory.UPDATES,
    "wallet.recharge": NotificationCategory.UPDATES,

    # System, security & billing alerts
    "security_alert": NotificationCategory.SYSTEM,
    "payment_failed": NotificationCategory.SYSTEM,
    "payment_confirmed": NotificationCategory.SYSTEM,
    "payment_cancelled": NotificationCategory.SYSTEM,
    "workflow_failed": NotificationCategory.SYSTEM,
    "billing_alert": NotificationCategory.SYSTEM,
    "workspace_alert": NotificationCategory.SYSTEM,
    "usage_warning": NotificationCategory.SYSTEM,
    "integration_alert": NotificationCategory.SYSTEM,
    "system": NotificationCategory.SYSTEM,
    "payment.failed": NotificationCategory.SYSTEM,
    "payment.succeeded": NotificationCategory.SYSTEM,
    "payment.cancelled": NotificationCategory.SYSTEM,
}


def resolve_notification_category(notif_type: Optional[str]) -> str:
    """
    Resolve a notification type/event string into one of the top-level categories:
    'mentions', 'updates', or 'system'.

    Uses exact dictionary lookup first, then semantic keyword heuristics
    to guarantee zero uncategorized notifications for custom/dynamic events.
    """
    if not notif_type:
        return NotificationCategory.SYSTEM

    clean_type = str(notif_type).strip().lower()

    if clean_type in NOTIFICATION_CATEGORY_MAPPING:
        return NOTIFICATION_CATEGORY_MAPPING[clean_type]

    clean_underscore = clean_type.replace(".", "_")
    if clean_underscore in NOTIFICATION_CATEGORY_MAPPING:
        return NOTIFICATION_CATEGORY_MAPPING[clean_underscore]

    # Keyword heuristics for dynamic or custom workflow events
    if any(k in clean_underscore for k in ("lead", "mention", "assign", "message")):
        return NotificationCategory.MENTIONS

    if any(k in clean_underscore for k in ("update", "credit", "completed", "recharge", "wallet")):
        return NotificationCategory.UPDATES

    return NotificationCategory.SYSTEM
