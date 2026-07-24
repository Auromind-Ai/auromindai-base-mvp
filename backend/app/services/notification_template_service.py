import re
import json
import logging
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session

from app.models.notification_template import NotificationTemplate
from app.core.config import settings

logger = logging.getLogger("app")

# Thread-safe in-memory cache fallback for templates: key = (template_key, channel) -> dict
_MEMORY_TEMPLATE_CACHE: Dict[Tuple[str, str], Optional[Dict[str, Any]]] = {}

SUPPORTED_NOTIFICATION_EVENTS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "Security": {
        "welcome_signup": {
            "name": "Welcome Signup Notification",
            "description": "Sent to new users immediately after successful account registration.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "email", "workspace_name"],
            "action_route": "/dashboard",
            "action_label": "Open Dashboard"
        },
        "new_device_login": {
            "name": "New Device Login Security Alert",
            "description": "Sent when a login occurs from an unrecognized device, browser, or IP location.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "login_time", "ip_address", "device", "browser", "location"],
            "action_route": "/settings/security",
            "action_label": "Security Settings"
        },
        "known_device_login": {
            "name": "Known Device Login Alert",
            "description": "Sent upon user login from a verified device.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "login_time", "ip_address", "device"],
            "action_route": "/settings/security",
            "action_label": "Security Settings"
        },
        "2fa_enabled": {
            "name": "2FA Two-Factor Authentication Enabled",
            "description": "Sent when 2FA TOTP protection is turned on for an account.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "login_time"],
            "action_route": "/settings/security",
            "action_label": "Security Settings"
        },
        "2fa_disabled": {
            "name": "2FA Two-Factor Authentication Disabled",
            "description": "Sent when 2FA TOTP protection is turned off.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "login_time"],
            "action_route": "/settings/security",
            "action_label": "Security Settings"
        },
        "recovery_codes": {
            "name": "2FA Recovery Codes Generated",
            "description": "Sent when new 2FA backup recovery codes are generated.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "login_time"],
            "action_route": "/settings/security",
            "action_label": "View Recovery Codes"
        },
        "session_revoked": {
            "name": "Session Revoked Alert",
            "description": "Sent when an active login session is revoked.",
            "channels": ["in_app", "email"],
            "supports_subject": True,
            "placeholders": ["user_name", "ip_address", "device_info"],
            "action_route": "/settings/security",
            "action_label": "Manage Sessions"
        },
        "session_blocked": {
            "name": "Session and Device Blocked",
            "description": "Sent when a device/IP is blocked due to security violations.",
            "channels": ["in_app", "email"],
            "supports_subject": True,
            "placeholders": ["user_name", "ip_address", "device_info"],
            "action_route": "/settings/security",
            "action_label": "Manage Sessions"
        },
        "session_unblocked": {
            "name": "Session and Device Unblocked",
            "description": "Sent when a previously blocked session/IP is unblocked.",
            "channels": ["in_app", "email"],
            "supports_subject": True,
            "placeholders": ["user_name", "ip_address", "device_info"],
            "action_route": "/settings/security",
            "action_label": "Manage Sessions"
        },
        "account_deletion_requested": {
            "name": "Account Deletion Scheduled Notice",
            "description": "Sent when account deletion is requested (30-day grace period).",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "deletion_date"],
            "action_route": "/settings/account",
            "action_label": "Account Settings"
        },
        "account_deletion_cancelled": {
            "name": "Account Deletion Cancelled Notice",
            "description": "Sent when account deletion is cancelled and account restored.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name"],
            "action_route": "/settings/account",
            "action_label": "Account Settings"
        },
        "otp_code": {
            "name": "OTP Verification Code Email",
            "description": "Sent for passwordless login or 2FA verification.",
            "channels": ["email"],
            "supports_subject": True,
            "placeholders": ["user_name", "otp", "auth_type"],
            "action_route": "/login",
            "action_label": "Login"
        }
    },
    "Billing": {
        "payment_success": {
            "name": "Payment Confirmation Notice",
            "description": "Sent upon successful subscription or credit pack invoice payment.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["amount", "invoice_id", "payment_date", "workspace_name"],
            "action_route": "/billing",
            "action_label": "View Billing"
        },
        "payment_failed": {
            "name": "Payment Failure Warning",
            "description": "Sent when an invoice payment fails or card declined.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["amount", "error_message", "action_url", "workspace_name"],
            "action_route": "/billing",
            "action_label": "Retry Payment"
        },
        "subscription_expiring_7d": {
            "name": "7-Day Subscription Expiry Notice",
            "description": "Sent 7 days before subscription expiration.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["expiry_date", "action_url", "workspace_name"],
            "action_route": "/billing",
            "action_label": "Renew Subscription"
        },
        "subscription_expiring_3d": {
            "name": "3-Day Urgent Subscription Expiry Notice",
            "description": "Sent 3 days before subscription expiration.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["expiry_date", "action_url", "workspace_name"],
            "action_route": "/billing",
            "action_label": "Renew Subscription"
        }
    },
    "Usage": {
        "usage_80": {
            "name": "80% AI Token Quota Notice",
            "description": "Sent when workspace consumes 80% of allocated AI tokens.",
            "channels": ["in_app", "email"],
            "supports_subject": True,
            "placeholders": ["resource_name", "used_amount", "total_limit", "workspace_name"],
            "action_route": "/billing/usage",
            "action_label": "View Usage"
        },
        "usage_90": {
            "name": "90% AI Token Quota Warning",
            "description": "Sent when workspace consumes 90% of allocated AI tokens.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["resource_name", "used_amount", "total_limit", "workspace_name"],
            "action_route": "/billing/usage",
            "action_label": "View Usage"
        },
        "usage_100": {
            "name": "100% AI Token Quota Limit Reached",
            "description": "Sent when workspace consumes 100% of AI tokens and tasks are paused.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["resource_name", "used_amount", "total_limit", "action_url"],
            "action_route": "/billing/upgrade",
            "action_label": "Upgrade Plan"
        }
    },
    "Workflow": {
        "workflow_completed": {
            "name": "Workflow Run Success Alert",
            "description": "Sent upon successful execution of an automated workflow.",
            "channels": ["in_app", "email"],
            "supports_subject": True,
            "placeholders": ["workflow_name", "duration", "workspace_name"],
            "action_route": "/automation/workflows",
            "action_label": "View Workflow"
        },
        "workflow_failed": {
            "name": "Workflow Run Execution Failure",
            "description": "Sent when an automated workflow fails or throws an exception.",
            "channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["workflow_name", "node_name", "error_message", "timestamp"],
            "action_route": "/automation/workflows",
            "action_label": "Review Workflow"
        }
    },
    "CRM": {
        "lead_alert": {
            "name": "New Lead Captured Alert",
            "description": "Sent when a new lead is captured via webhooks or inbox.",
            "channels": ["in_app", "email"],
            "supports_subject": True,
            "placeholders": ["lead_name", "lead_email", "lead_score", "source"],
            "action_route": "/crm/leads",
            "action_label": "Open Lead"
        }
    },
    "AI": {
        "human_escalation": {
            "name": "AI Agent Human Escalation Event",
            "description": "Sent when an AI agent escalates a conversation to human agent.",
            "channels": ["in_app", "email"],
            "supports_subject": True,
            "placeholders": ["customer_name", "escalation_reason", "workspace_name"],
            "action_route": "/inbox",
            "action_label": "Open Conversation"
        }
    }
}


class NotificationRegistry:
    """Enterprise registry for verified backend-supported notification event keys and rich metadata."""
    EVENTS: Dict[str, Dict[str, Dict[str, Any]]] = SUPPORTED_NOTIFICATION_EVENTS

    @classmethod
    def get_supported_events(cls) -> Dict[str, Dict[str, Dict[str, Any]]]:
        return cls.EVENTS

    @classmethod
    def is_supported(cls, template_key: str) -> bool:
        for cat_data in cls.EVENTS.values():
            if template_key in cat_data:
                return True
        return False

    @classmethod
    def get_metadata(cls, template_key: str) -> Optional[Dict[str, Any]]:
        for cat_data in cls.EVENTS.values():
            if template_key in cat_data:
                return cat_data[template_key]
        return None

    @classmethod
    def get_category_for_key(cls, template_key: str) -> Optional[str]:
        for cat, cat_data in cls.EVENTS.items():
            if template_key in cat_data:
                return cat
        return None


# Built-in Default Fallback Templates for all categories
DEFAULT_NOTIFICATION_TEMPLATES = [
    # --- Security Category ---
    {
        "category": "Security",
        "template_key": "welcome_signup",
        "name": "Welcome Signup",
        "channel": "email",
        "title": "Welcome to {{workspace_name}}",
        "subject": "Welcome to {{workspace_name}}, {{user_name}}!",
        "message": "Hi {{user_name}},\n\nWelcome to {{workspace_name}}! We are thrilled to have you on board. Explore your workspace and start building your AI solutions today.\n\nBest regards,\nThe {{workspace_name}} Team",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "welcome_signup",
        "name": "Welcome Signup In-App",
        "channel": "in_app",
        "title": "Welcome to {{workspace_name}}!",
        "subject": None,
        "message": "Hello {{user_name}}, welcome to {{workspace_name}}! Get started by exploring your dashboard.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "new_device_login",
        "name": "New Device Login Email",
        "channel": "email",
        "title": "Security Alert: New Device Login",
        "subject": "[Security Alert] New Login from Unrecognized Device",
        "message": "Hi {{user_name}},\n\nWe detected a login to your account from a new device or browser ({{device}}).\n\nIP Address: {{ip_address}}\nLocation: {{location}}\nTime: {{login_time}}\n\nIf this was not you, please reset your password immediately.\n\nSecurity Team",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "new_device_login",
        "name": "New Device Login In-App",
        "channel": "in_app",
        "title": "Security Alert: New Device Login",
        "subject": None,
        "message": "New login detected from {{device}} (IP: {{ip_address}}) at {{login_time}}.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "known_device_login",
        "name": "Known Device Login In-App",
        "channel": "in_app",
        "title": "Successful Login",
        "subject": None,
        "message": "You logged in from {{ip_address}} at {{login_time}}.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "known_device_login",
        "name": "Known Device Login Email",
        "channel": "email",
        "title": "Successful Login Notification",
        "subject": "Successful Login to {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYou successfully logged in to {{workspace_name}} from {{device}} (IP: {{ip_address}}) at {{login_time}}.\n\nIf this was not you, please secure your account immediately.\n\nSecurity Team",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "2fa_enabled",
        "name": "2FA Enabled Notification",
        "channel": "email",
        "title": "Two-Factor Authentication Enabled",
        "subject": "2FA Enabled for Your Account",
        "message": "Hi {{user_name}},\n\nTwo-Factor Authentication (2FA) has been successfully enabled for your account. Your account is now more secure.\n\nIf you did not make this change, please contact support immediately.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "2fa_disabled",
        "name": "2FA Disabled Warning",
        "channel": "email",
        "title": "Security Warning: 2FA Disabled",
        "subject": "[Security Warning] Two-Factor Authentication Disabled",
        "message": "Hi {{user_name}},\n\nTwo-Factor Authentication (2FA) was disabled for your account at {{login_time}}.\n\nIf this was done by you, no further action is required. Otherwise, please enable 2FA immediately.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "recovery_codes",
        "name": "2FA Recovery Codes Generated",
        "channel": "email",
        "title": "New 2FA Recovery Codes",
        "subject": "Your New 2FA Backup Recovery Codes",
        "message": "Hi {{user_name}},\n\nNew 2FA recovery backup codes were generated for your account. Please keep them in a safe place.\n\nTime: {{login_time}}",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "session_revoked",
        "name": "Session Revoked Alert",
        "channel": "in_app",
        "title": "Session Revoked",
        "subject": "Security Notice: Session Revoked",
        "message": "A active session from IP {{ip_address}} has been revoked.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "session_blocked",
        "name": "Session and Device Blocked Alert",
        "channel": "in_app",
        "title": "Session and Device Blocked",
        "subject": "Security Warning: Device Blocked",
        "message": "Session from IP {{ip_address}} has been blocked.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "account_deletion_requested",
        "name": "Account Deletion Requested Notice",
        "channel": "email",
        "title": "Account Deletion Scheduled",
        "subject": "Your account is scheduled for deletion",
        "message": "Hi {{user_name}},\n\nYour account has been scheduled for permanent deletion on {{deletion_date}}.\n\nIf you change your mind, simply log in before that date and cancel the deletion from your account settings.\n\nIf you did not request this, please contact support immediately.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "account_deletion_cancelled",
        "name": "Account Deletion Cancelled Notice",
        "channel": "email",
        "title": "Account Deletion Cancelled",
        "subject": "Account deletion cancelled — you're back!",
        "message": "Hi {{user_name}},\n\nYour account deletion has been successfully cancelled. Your account is fully restored and active.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "otp_code",
        "name": "OTP Verification Code Email",
        "channel": "email",
        "title": "Verification Code",
        "subject": "Your {{auth_type}} Verification Code",
        "message": "Hi {{user_name}},\n\nYour verification code is {{otp}}. It will expire in 5 minutes.\n\nIf you did not request this, please ignore this message.",
        "is_active": True
    },

    # --- Billing Category ---
    {
        "category": "Billing",
        "template_key": "payment_success",
        "name": "Payment Successful",
        "channel": "email",
        "title": "Payment Confirmed",
        "subject": "Payment Received - {{workspace_name}} Invoice",
        "message": "Hi {{user_name}},\n\nThank you for your payment of {{amount}} for {{workspace_name}}. Your subscription is active.\n\nInvoice ID: {{invoice_id}}\nDate: {{payment_date}}\n\nThank you for choosing {{workspace_name}}!",
        "is_active": True
    },
    {
        "category": "Billing",
        "template_key": "payment_failed",
        "name": "Payment Failed",
        "channel": "email",
        "title": "Action Required: Payment Failed",
        "subject": "[Action Required] Payment Failure for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nWe were unable to process your payment of {{amount}} for {{workspace_name}}.\n\nPlease update your billing information at {{action_url}} to prevent service interruption.\n\nBilling Team",
        "is_active": True
    },
    {
        "category": "Billing",
        "template_key": "subscription_expiring_7d",
        "name": "Subscription Renewal Warning (7 Days)",
        "channel": "email",
        "title": "Subscription Expiring Soon",
        "subject": "Notice: Your {{workspace_name}} Subscription Expires in 7 Days",
        "message": "Hi {{user_name}},\n\nYour subscription for {{workspace_name}} is set to expire on {{expiry_date}} (in 7 days).\n\nTo ensure uninterrupted service, please renew your plan at {{action_url}}.",
        "is_active": True
    },
    {
        "category": "Billing",
        "template_key": "subscription_expiring_3d",
        "name": "Subscription Renewal Alert (3 Days)",
        "channel": "email",
        "title": "Subscription Expiring in 3 Days",
        "subject": "Urgent: {{workspace_name}} Subscription Expires in 3 Days!",
        "message": "Hi {{user_name}},\n\nYour subscription for {{workspace_name}} will expire in 3 days on {{expiry_date}}.\n\nPlease renew immediately to prevent account downgrade.",
        "is_active": True
    },

    # --- Usage Category ---
    {
        "category": "Usage",
        "template_key": "usage_80",
        "name": "Quota Usage 80%",
        "channel": "in_app",
        "title": "Usage Warning (80%)",
        "subject": "Usage Notice: 80% Quota Reached for {{workspace_name}}",
        "message": "Hi {{user_name}}, {{workspace_name}} has consumed 80% of your {{resource_name}} limit. {{used_amount}} / {{total_limit}} consumed.",
        "is_active": True
    },
    {
        "category": "Usage",
        "template_key": "usage_90",
        "name": "Quota Usage 90%",
        "channel": "in_app",
        "title": "Usage Warning (90%)",
        "subject": "High Usage Alert: 90% Quota Reached",
        "message": "Warning: {{workspace_name}} has used 90% of your {{resource_name}} quota. Consider upgrading your plan to avoid limit blocks.",
        "is_active": True
    },
    {
        "category": "Usage",
        "template_key": "usage_100",
        "name": "Quota Usage Limit Reached (100%)",
        "channel": "email",
        "title": "Quota Limit Exceeded",
        "subject": "[Important] {{resource_name}} Limit Reached for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has reached 100% of its {{resource_name}} limit ({{total_limit}}).\n\nUpgrade your plan now to restore full operations: {{action_url}}",
        "is_active": True
    },

    # --- Workflow Category ---
    {
        "category": "Workflow",
        "template_key": "workflow_completed",
        "name": "Workflow Run Execution Completed",
        "channel": "in_app",
        "title": "Workflow Completed",
        "subject": "Workflow {{workflow_name}} Succeeded",
        "message": "Workflow '{{workflow_name}}' completed successfully in {{duration}}.",
        "is_active": True
    },
    {
        "category": "Workflow",
        "template_key": "workflow_failed",
        "name": "Workflow Run Execution Failure",
        "channel": "email",
        "title": "Workflow Failed",
        "subject": "Workflow Execution Failed: {{workflow_name}}",
        "message": "Hi {{user_name}},\n\nWorkflow '{{workflow_name}}' in workspace {{workspace_name}} failed to execute.\n\nError details: {{error_message}}\nTime: {{timestamp}}",
        "is_active": True
    },

    # --- CRM Category ---
    {
        "category": "CRM",
        "template_key": "lead_alert",
        "name": "New High-Value Lead Alert",
        "channel": "in_app",
        "title": "New Lead Alert",
        "subject": "New Lead Captured: {{lead_name}}",
        "message": "New lead '{{lead_name}}' ({{lead_email}}) captured for {{workspace_name}}. Lead Score: {{lead_score}}.",
        "is_active": True
    },

    # --- AI Category ---
    {
        "category": "AI",
        "template_key": "human_escalation",
        "name": "AI Human Escalation Triggered",
        "channel": "in_app",
        "title": "Human Escalation Needed",
        "subject": "AI Escalation: Customer Needs Support",
        "message": "AI Agent requires human intervention for conversation with {{customer_name}} in workspace {{workspace_name}}. Reason: {{escalation_reason}}.",
        "is_active": True
    }
]


class NotificationTemplateService:

    @staticmethod
    def render_text(template_text: Optional[str], context: Dict[str, Any]) -> Optional[str]:
        """
        Replaces {{placeholder}} variables safely in template_text using context dict.
        Missing variables default to empty string or default sample if not provided.
        """
        if not template_text:
            return template_text

        def replace_match(match):
            key = match.group(1).strip()
            val = context.get(key)
            if val is not None:
                return str(val)
            # If missing, check snake_case / Title variants or return empty string
            return str(context.get(key.lower(), ""))

        pattern = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")
        return pattern.sub(replace_match, template_text)

    @staticmethod
    def _get_cache_key(template_key: str, channel: str) -> str:
        return f"notif_tpl:{template_key}:{channel}"

    @classmethod
    def clear_cache(cls, template_key: Optional[str] = None, channel: Optional[str] = None):
        """Invalidate template cache entries immediately"""
        global _MEMORY_TEMPLATE_CACHE
        if template_key and channel:
            _MEMORY_TEMPLATE_CACHE.pop((template_key, channel), None)
            try:
                import redis
                if settings.REDIS_URL:
                    r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
                    r.delete(cls._get_cache_key(template_key, channel))
            except Exception:
                pass
        else:
            _MEMORY_TEMPLATE_CACHE.clear()
            try:
                import redis
                if settings.REDIS_URL:
                    r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
                    keys = r.keys("notif_tpl:*")
                    if keys:
                        r.delete(*keys)
            except Exception:
                pass

    @classmethod
    def get_template(
        cls,
        db: Session,
        template_key: str,
        channel: str = "in_app"
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve active template dictionary from Redis / Memory cache or Database.
        If not found in DB or inactive, returns default fallback if present.
        """
        cache_tuple = (template_key, channel)
        
        # 1. Check thread-safe memory cache
        if cache_tuple in _MEMORY_TEMPLATE_CACHE:
            cached_val = _MEMORY_TEMPLATE_CACHE[cache_tuple]
            if cached_val is not None:
                return cached_val

        # 2. Check Redis cache
        try:
            import redis
            if settings.REDIS_URL:
                r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
                cached_json = r.get(cls._get_cache_key(template_key, channel))
                if cached_json:
                    data = json.loads(cached_json)
                    _MEMORY_TEMPLATE_CACHE[cache_tuple] = data
                    return data
        except Exception:
            pass

        # 3. Query Database
        db_tpl = db.query(NotificationTemplate).filter(
            NotificationTemplate.template_key == template_key,
            NotificationTemplate.channel == channel,
            NotificationTemplate.is_active == True
        ).first()

        if db_tpl:
            data = {
                "id": str(db_tpl.id),
                "category": db_tpl.category,
                "template_key": db_tpl.template_key,
                "name": db_tpl.name,
                "title": db_tpl.title,
                "subject": db_tpl.subject,
                "message": db_tpl.message,
                "channel": db_tpl.channel,
                "is_active": db_tpl.is_active,
            }
            _MEMORY_TEMPLATE_CACHE[cache_tuple] = data
            try:
                import redis
                if settings.REDIS_URL:
                    r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
                    r.setex(cls._get_cache_key(template_key, channel), 3600, json.dumps(data))
            except Exception:
                pass
            return data

        # 4. Fallback to built-in default templates
        fallback = next(
            (t for t in DEFAULT_NOTIFICATION_TEMPLATES if t["template_key"] == template_key and t["channel"] == channel and t.get("is_active", True)),
            None
        )
        if not fallback:
            # Secondary check: search fallback matching key with any channel
            fallback = next(
                (t for t in DEFAULT_NOTIFICATION_TEMPLATES if t["template_key"] == template_key and t.get("is_active", True)),
                None
            )

        if fallback:
            _MEMORY_TEMPLATE_CACHE[cache_tuple] = fallback
            return fallback

        return None

    @classmethod
    def seed_default_templates(cls, db: Session, updated_by: str = "System Admin") -> int:
        """Seed DB with default templates if missing"""
        created_count = 0
        for item in DEFAULT_NOTIFICATION_TEMPLATES:
            existing = db.query(NotificationTemplate).filter(
                NotificationTemplate.template_key == item["template_key"],
                NotificationTemplate.channel == item["channel"]
            ).first()
            if not existing:
                new_tpl = NotificationTemplate(
                    category=item["category"],
                    template_key=item["template_key"],
                    name=item["name"],
                    title=item.get("title"),
                    subject=item.get("subject"),
                    message=item["message"],
                    channel=item["channel"],
                    is_active=item.get("is_active", True),
                    updated_by=updated_by
                )
                db.add(new_tpl)
                created_count += 1
        if created_count > 0:
            db.commit()
            cls.clear_cache()
        return created_count

    @classmethod
    def get_supported_template_keys(cls, db: Optional[Session] = None) -> Dict[str, List[str]]:
        """Return ONLY production-supported notification keys registered in NotificationRegistry."""
        return NotificationRegistry.get_supported_events()
