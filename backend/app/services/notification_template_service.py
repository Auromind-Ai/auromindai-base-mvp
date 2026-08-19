import re
import json
import logging
from typing import Optional, Dict, Any, Tuple, List, Set
from sqlalchemy.orm import Session

from app.models.notification_template import NotificationTemplate
from app.models.notification_rule import NotificationRule
from app.core.config import settings

logger = logging.getLogger("app")

# Thread-safe in-memory cache fallback for templates: key = (template_key, channel) -> dict
_MEMORY_TEMPLATE_CACHE: Dict[Tuple[str, str], Optional[Dict[str, Any]]] = {}

class NotificationRegistry:

    @classmethod
    def get_supported_events(cls, db: Optional[Session] = None) -> Dict[str, Dict[str, Dict[str, Any]]]:
        from app.services.notifications.event_registry_service import EventRegistryService
        contracts = EventRegistryService.get_all_merged_contracts(db=db)
        grouped: Dict[str, Dict[str, Dict[str, Any]]] = {}
        for c in contracts.values():
            cat = c.get("category", "General")
            if cat not in grouped:
                grouped[cat] = {}
            grouped[cat][c["template_key"]] = {
                "name": c.get("name"),
                "description": c.get("description"),
                "allowed_channels": c.get("allowed_channels", ["email", "in_app"]),
                "supports_subject": c.get("supports_subject", True),
                "placeholders": [v["key"] for v in c.get("variables", [])],
                "action_route": c.get("action_route"),
                "action_label": c.get("action_label")
            }
        return grouped

    @classmethod
    def is_supported(cls, template_key: str, db: Optional[Session] = None) -> bool:
        from app.services.notifications.event_registry_service import EventRegistryService
        contracts = EventRegistryService.get_all_merged_contracts(db=db)
        return template_key in contracts

    @classmethod
    def get_metadata(cls, template_key: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        from app.services.notifications.event_registry_service import EventRegistryService
        contract = EventRegistryService.get_merged_contract(template_key, db=db)
        if contract:
            return {
                "event_name": contract.get("event_name"),
                "name": contract.get("name"),
                "description": contract.get("description"),
                "allowed_channels": contract.get("allowed_channels", ["email", "in_app"]),
                "supports_subject": contract.get("supports_subject", True),
                "action_route": contract.get("action_route", "/dashboard"),
                "action_label": contract.get("action_label", "Open Application")
            }
        return None

    @classmethod
    def get_category_for_key(cls, template_key: str, db: Optional[Session] = None) -> Optional[str]:
        from app.services.notifications.event_registry_service import EventRegistryService
        contract = EventRegistryService.get_merged_contract(template_key, db=db)
        if contract and "category" in contract:
            return contract["category"]
        return "General"

    @classmethod
    def get_allowed_channels(cls, template_key: str, db: Optional[Session] = None) -> List[str]:
        meta = cls.get_metadata(template_key, db=db)
        if meta and "allowed_channels" in meta:
            return meta["allowed_channels"]
        return ["email", "in_app"]

    @classmethod
    def get_contract(cls, template_key_or_event: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        from app.services.notifications.event_registry_service import EventRegistryService
        return EventRegistryService.get_merged_contract(template_key_or_event, db=db)

    @classmethod
    def get_all_contracts(cls, db: Optional[Session] = None) -> Dict[str, Dict[str, Any]]:
        from app.services.notifications.event_registry_service import EventRegistryService
        return EventRegistryService.get_all_merged_contracts(db=db)

    @classmethod
    def get_allowed_placeholder_keys(cls, template_key_or_event: str, db: Optional[Session] = None) -> Set[str]:
        from app.services.notifications.event_registry_service import EventRegistryService
        return EventRegistryService.get_allowed_placeholder_keys(template_key_or_event, db=db)

    @classmethod
    def get_sample_context(cls, template_key_or_event: str, db: Optional[Session] = None) -> Dict[str, Any]:
        from app.services.notifications.event_registry_service import EventRegistryService
        return EventRegistryService.get_sample_context(template_key_or_event, db=db)

    @classmethod
    def extract_placeholders(cls, text: Optional[str]) -> Set[str]:
        if not text:
            return set()
        return set(re.findall(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", text))

    @classmethod
    def validate_template_placeholders(
        cls,
        template_key: str,
        title: Optional[str] = None,
        subject: Optional[str] = None,
        message: Optional[str] = None
    ) -> None:
        allowed = cls.get_allowed_placeholder_keys(template_key)
        used_keys = cls.extract_placeholders(title) | cls.extract_placeholders(subject) | cls.extract_placeholders(message)
        invalid_keys = used_keys - allowed

        if invalid_keys:
            invalid_str = ", ".join([f"{{{{{k}}}}}" for k in sorted(invalid_keys)])
            allowed_str = ", ".join([f"{{{{{k}}}}}" for k in sorted(allowed)])
            raise ValueError(
                f"Invalid placeholder(s) {invalid_str} for template '{template_key}'. "
                f"Allowed placeholders in event payload contract: {allowed_str}."
            )





class NotificationTemplateService:

    @staticmethod
    def render_text(template_text: Optional[str], context: Dict[str, Any]) -> Optional[str]:
        if not template_text:
            return template_text

        def replace_match(match):
            key = match.group(1).strip()
            val = context.get(key)
            if val is not None:
                return str(val)
            return str(context.get(key.lower(), ""))

        pattern = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")
        return pattern.sub(replace_match, template_text)

    @classmethod
    def render_html_email(
        cls,
        title: str,
        message: str,
        context: Dict[str, Any],
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        app_name: str = "Orbion Agents"
    ) -> str:
        
        app_display_name = context.get("app_name") or app_name
        workspace_display = context.get("workspace_name") or "Your Workspace"
        rendered_title = cls.render_text(title, context) or "Notification"
        rendered_msg = cls.render_text(message, context) or ""

        # Convert line breaks to HTML paragraphs
        formatted_paragraphs = "".join(
            f'<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 15px;">{line.strip()}</p>'
            for line in rendered_msg.split("\n\n") if line.strip()
        )
        if not formatted_paragraphs:
            formatted_paragraphs = f'<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 15px;">{rendered_msg.replace(chr(10), "<br/>")}</p>'

        btn_html = ""
        final_action_url = action_url or context.get("action_url")
        final_action_label = action_label or context.get("action_label") or "Open Application"

        if final_action_url:
            btn_html = f"""
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
                <tr>
                    <td align="center" style="border-radius: 8px; background-color: #4F46E5;">
                        <a href="{final_action_url}" target="_blank" style="font-size: 15px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            {final_action_label} &rarr;
                        </a>
                    </td>
                </tr>
            </table>
            """

        frontend_url = context.get("frontend_url") or "https://auromind.ai"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{rendered_title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <!-- Brand Header -->
                    <tr>
                        <td style="padding: 24px 32px; background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <span style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">{app_display_name}</span>
                                    </td>
                                    <td align="right">
                                        <span style="font-size: 13px; color: #94A3B8; background-color: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px;">{workspace_display}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Content Card -->
                    <tr>
                        <td style="padding: 32px 32px 24px 32px;">
                            <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                                {rendered_title}
                            </h1>
                            <div style="color: #334155; font-size: 15px;">
                                {formatted_paragraphs}
                            </div>
                            {btn_html}
                        </td>
                    </tr>

                    <!-- Footer Section -->
                    <tr>
                        <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-size: 12px; color: #64748B; line-height: 1.5;">
                                        This automated message was sent by <strong>{app_display_name}</strong> for <strong>{workspace_display}</strong>.<br/>
                                        Manage notification preferences in your <a href="{frontend_url}/settings/notifications" style="color: #4F46E5; text-decoration: none;">Account Settings</a>.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    @staticmethod
    def _get_cache_key(template_key: str) -> str:
        return f"notif_tpl:{template_key}"

    @classmethod
    def clear_cache(cls, template_key: Optional[str] = None, channel: Optional[str] = None):
        global _MEMORY_TEMPLATE_CACHE
        if template_key:
            keys_to_remove = [k for k in _MEMORY_TEMPLATE_CACHE.keys() if k[0] == template_key or k == template_key]
            for k in keys_to_remove:
                _MEMORY_TEMPLATE_CACHE.pop(k, None)
            try:
                import redis
                if settings.REDIS_URL:
                    r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
                    r.delete(cls._get_cache_key(template_key))
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
        channel: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        cache_key = (template_key, "master")

        # 1. Memory cache
        if cache_key in _MEMORY_TEMPLATE_CACHE:
            cached_val = _MEMORY_TEMPLATE_CACHE[cache_key]
            if cached_val is not None:
                return cached_val

        # 2. Redis cache
        try:
            import redis
            if settings.REDIS_URL:
                r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
                cached_json = r.get(cls._get_cache_key(template_key))
                if cached_json:
                    data = json.loads(cached_json)
                    _MEMORY_TEMPLATE_CACHE[cache_key] = data
                    return data
        except Exception:
            pass

        # 3. Database query
        db_tpl = db.query(NotificationTemplate).filter(
            NotificationTemplate.template_key == template_key,
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
            _MEMORY_TEMPLATE_CACHE[cache_key] = data
            try:
                import redis
                if settings.REDIS_URL:
                    r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
                    r.setex(cls._get_cache_key(template_key), 3600, json.dumps(data))
            except Exception:
                pass
            return data

        return None

    @classmethod
    def get_supported_template_keys(cls, db: Optional[Session] = None) -> Dict[str, List[str]]:
        return NotificationRegistry.get_supported_events()
