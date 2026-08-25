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

        if not db_tpl:
            cls.seed_default_templates(db)
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
    def seed_default_templates(cls, db: Session) -> int:
        """
        Idempotently seeds default notification templates and rules into the database.
        - Existing templates/rules are never overwritten, preserving user/admin customizations.
        - Missing templates/rules are inserted with baseline defaults.
        """
        import uuid
        from app.models.notification_template import NotificationTemplate
        from app.models.notification_rule import NotificationRule

        baseline_templates = [
            # User & Onboarding
            {"category": "User & Onboarding", "template_key": "welcome_signup", "name": "New User & Workspace Welcome", "channel": "both", "title": "Welcome to {{app_name}}!", "subject": "Welcome to {{app_name}} — Let's Get Your Workspace Set Up", "message": "Hi {{user_name}},\n\nWelcome to {{app_name}}! Your workspace '{{workspace_name}}' is active on the {{plan_name}} with {{credits}} included AI credits.\n\nNext Steps to Go Live:\n1. Connect your WhatsApp or communication channels\n2. Import or create your first lead\n3. Deploy your AI sales workflow\n\nClick below to get started.", "is_active": True},
            {"category": "User & Onboarding", "template_key": "email_verification_pending", "name": "Email Verification & OTP Code", "channel": "email", "title": "Verify Your Email Address", "subject": "Verify your email for {{app_name}} — Code: {{otp}}", "message": "Hi {{user_name}},\n\nThank you for signing up for {{app_name}}!\n\nYour verification code is: {{otp}}\n\nPlease enter this code or click the button below to verify your email address and activate your account.\n\nThis verification code and link will expire in {{expires_in}}.", "is_active": True},
            {"category": "User & Onboarding", "template_key": "email_verification_reminder_24h", "name": "Email Verification 24h Reminder", "channel": "email", "title": "Reminder: Verify Your Email Address", "subject": "Action Required: Complete your verification for {{app_name}}", "message": "Hi {{user_name}},\n\nWe noticed you haven't verified your email yet. Your verification code is {{otp}}.\n\nClick the button below to complete your verification and access your workspace. This verification link and code will expire in {{expires_in}}.", "is_active": True},
            {"category": "User & Onboarding", "template_key": "free_plan_activated", "name": "Free Plan Activated", "channel": "both", "title": "Your {{plan_name}} is Ready!", "subject": "Your {{workspace_name}} Free Plan is Active ({{credits}} AI Credits)", "message": "Hi {{user_name}},\n\nYour free plan for {{workspace_name}} is initialized with {{credits}} included AI credits.\n\nSetup Checklist:\n• Connect WhatsApp Business or Twilio\n• Import or capture your first lead\n• Create an automated AI workflow", "is_active": True},
            {"category": "User & Onboarding", "template_key": "onboarding_inactivity", "name": "Onboarding Inactivity Nudge", "channel": "both", "title": "Need Help Getting Started with {{workspace_name}}?", "subject": "Unlock your AI assistant on {{workspace_name}}", "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has been inactive for {{days_inactive}} days. {{suggested_action}}.\n\nSetting up takes less than 2 minutes and helps you start capturing leads automatically.", "is_active": True},

            # Payments & Credits
            {"category": "Payments & Credits", "template_key": "payment_success", "name": "Subscription Payment Confirmation", "channel": "both", "title": "Payment Confirmed", "subject": "Payment Receipt for {{workspace_name}} (Invoice #{{invoice_id}})", "message": "Hi {{user_name}},\n\nThank you for your payment of {{amount}} for {{workspace_name}}.\n\nPlan: {{plan_name}}\nInvoice ID: {{invoice_id}}\nRenewal Date: {{renewal_date}}\n\nYour receipt is available at the link below.", "is_active": True},
            {"category": "Payments & Credits", "template_key": "credit_purchase_success", "name": "Credit Purchase Confirmation", "channel": "both", "title": "AI Credits Added Successfully", "subject": "Credit Recharge Confirmed: {{credits_added}} Credits Added", "message": "Hi {{user_name}},\n\nYour purchase of {{credits_added}} AI Credits (Amount: {{amount}}) for {{workspace_name}} was successful.\n\nCurrent Available Balance: {{current_balance}} Credits\nInvoice ID: {{invoice_id}}", "is_active": True},
            {"category": "Payments & Credits", "template_key": "credits_low_20", "name": "Credits Low (20% Balance Remaining)", "channel": "both", "title": "Low Credit Warning (20% Remaining)", "subject": "Notice: 20% AI Credits Remaining for {{workspace_name}}", "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has 20% remaining balance ({{remaining_balance}} credits). Recharge now to prevent AI agent pauses.", "is_active": True},
            {"category": "Payments & Credits", "template_key": "credits_low_10", "name": "Credits Low (10% Balance Remaining)", "channel": "both", "title": "Urgent: 10% AI Credits Remaining", "subject": "[Urgent] Only 10% AI Credits Remaining for {{workspace_name}}", "message": "Warning: {{workspace_name}} has only 10% AI credits left ({{remaining_balance}} credits). Please recharge immediately.", "is_active": True},
            {"category": "Payments & Credits", "template_key": "credits_exhausted", "name": "Credits Exhausted (0% Balance)", "channel": "both", "title": "AI Credits Exhausted — Operations Paused", "subject": "[Important] AI Credits Exhausted for {{workspace_name}}", "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has exhausted all available AI credits. Automated AI responses and campaign outbound messages are temporarily paused until recharged.", "is_active": True},
            {"category": "Payments & Credits", "template_key": "payment_failed", "name": "Payment Failure Warning (Immediate)", "channel": "both", "title": "Payment Failed — Action Required", "subject": "[Action Required] Payment Failure for {{workspace_name}}", "message": "Hi {{user_name}},\n\nWe were unable to process your payment of {{amount}} for {{workspace_name}}.\n\nReason: {{error_message}}\nService Impact Date: {{service_impact_date}}\n\nPlease update your payment details or retry payment to maintain uninterrupted service.", "is_active": True},
            {"category": "Payments & Credits", "template_key": "payment_failed_reminder_24h", "name": "Payment Failed 24h Reminder", "channel": "both", "title": "Reminder: Outstanding Payment for {{workspace_name}}", "subject": "Reminder: Update billing information for {{workspace_name}}", "message": "Hi {{user_name}},\n\nYour invoice of {{amount}} remains unpaid. Please retry payment to avoid service suspension on {{service_impact_date}}.", "is_active": True},
            {"category": "Payments & Credits", "template_key": "payment_failed_reminder_72h", "name": "Payment Failed 72h Final Warning", "channel": "both", "title": "Final Notice: Service Cutoff Approaching", "subject": "Final Notice: Immediate action required for {{workspace_name}}", "message": "Hi {{user_name}},\n\nThis is the final notice regarding your unpaid invoice ({{amount}}). Service will be suspended on {{service_cutoff_date}} if payment is not completed.", "is_active": True},
            {"category": "Payments & Credits", "template_key": "subscription_expiring_7d", "name": "7-Day Subscription Expiry Notice", "channel": "both", "title": "Subscription Expiring Soon", "subject": "Notice: Your {{workspace_name}} Subscription Expires in 7 Days", "message": "Hi {{user_name}},\n\nYour subscription for {{workspace_name}} is set to expire on {{expiry_date}} (in 7 days).\n\nPlease renew your plan at the link below.", "is_active": True},
            {"category": "Payments & Credits", "template_key": "subscription_expiring_3d", "name": "3-Day Urgent Subscription Expiry Notice", "channel": "both", "title": "Subscription Expiring in 3 Days", "subject": "Urgent: {{workspace_name}} Subscription Expires in 3 Days!", "message": "Hi {{user_name}},\n\nYour subscription for {{workspace_name}} will expire in 3 days on {{expiry_date}}.\n\nPlease renew immediately to prevent service disruption.", "is_active": True},

            # Lead Management
            {"category": "Lead Management", "template_key": "lead_created", "name": "New Lead Captured", "channel": "both", "title": "New Lead Captured: {{lead_name}}", "subject": "New Lead: {{lead_name}} (Score: {{lead_score}})", "message": "Hi {{user_name}},\n\nA new lead has been captured for {{workspace_name}}:\n\nName: {{lead_name}}\nEmail: {{lead_email}}\nPhone: {{lead_phone}}\nChannel: {{channel}}\nInitial Score: {{lead_score}}\n\nOpen your CRM inbox to view the conversation.", "is_active": True},
            {"category": "Lead Management", "template_key": "lead_assigned", "name": "Lead Assigned to Team Member", "channel": "both", "title": "Lead Assigned to You", "subject": "New Lead Assigned: {{lead_name}}", "message": "Hi {{user_name}},\n\nLead '{{lead_name}}' has been assigned to you in {{workspace_name}}.\n\nLead Score: {{lead_score}}\nChannel: {{channel}}\n\nPlease follow up within your team's target SLA.", "is_active": True},
            {"category": "Lead Management", "template_key": "lead_sla_breached", "name": "Lead Response SLA Breached", "channel": "both", "title": "SLA Warning: Unanswered Lead", "subject": "[SLA Alert] Unanswered Lead {{lead_name}} in {{workspace_name}}", "message": "Warning: Lead '{{lead_name}}' has been waiting for {{wait_minutes}} minutes without a response from assigned agent {{agent_name}}.\n\nTarget SLA: {{sla_threshold}} minutes\n\nPlease review and respond immediately.", "is_active": True},
            {"category": "Lead Management", "template_key": "lead_message_received", "name": "Inbound Message from Lead", "channel": "both", "title": "New Message from {{lead_name}}", "subject": "Message from {{lead_name}} on {{channel}}", "message": "Hi {{user_name}},\n\n{{lead_name}} sent a new message in {{workspace_name}}:\n\n\"{{message_preview}}\"\n\nClick below to respond in your unified inbox.", "is_active": True},
            {"category": "Lead Management", "template_key": "lead_high_intent", "name": "High-Intent Hot Lead Detected", "channel": "both", "title": "High-Intent Lead Detected! (Score: {{lead_score}})", "subject": "Hot Lead Alert: {{lead_name}} reached score {{lead_score}}", "message": "Hi {{user_name}},\n\nLead '{{lead_name}}' has been scored as high-intent (Score: {{lead_score}}/100) based on positive engagement patterns:\n\nKey Triggers: {{intent_signals}}\n\nWe recommend reaching out via direct call or priority WhatsApp response.", "is_active": True},
            {"category": "Lead Management", "template_key": "lead_converted", "name": "Lead Converted / Deal Closed", "channel": "both", "title": "Lead Converted Successfully!", "subject": "Deal Won: {{lead_name}} in {{workspace_name}}", "message": "Congratulations {{user_name}}!\n\nLead '{{lead_name}}' was marked as converted.\n\nDeal Value: {{deal_value}}\nAssigned Agent: {{agent_name}}", "is_active": True},
            {"category": "Lead Management", "template_key": "lead_inactive_reminder", "name": "Inactive Lead Follow-Up Nudge", "channel": "both", "title": "Follow-Up Reminder: {{lead_name}}", "subject": "Reminder: Follow up with {{lead_name}} (Inactive {{days_idle}} days)", "message": "Hi {{user_name}},\n\nLead '{{lead_name}}' has had no interaction for {{days_idle}} days.\n\nLast Status: {{lead_status}}\n\nSend a re-engagement message to keep the opportunity warm.", "is_active": True},

            # Broadcast & Workflow
            {"category": "Broadcast & Workflow", "template_key": "broadcast_completed", "name": "Outbound Broadcast Completed", "channel": "both", "title": "Broadcast Campaign Completed", "subject": "Campaign Finished: {{broadcast_name}} ({{delivered_count}} delivered)", "message": "Hi {{user_name}},\n\nYour outbound broadcast campaign '{{broadcast_name}}' has completed.\n\nPerformance Summary:\n• Total Targeted: {{total_targeted}}\n• Successfully Delivered: {{delivered_count}}\n• Failed / Bounced: {{failed_count}}\n• Read Receipts: {{read_count}}\n\nView the detailed delivery analytics below.", "is_active": True},
            {"category": "Broadcast & Workflow", "template_key": "workflow_failed", "name": "Automation Workflow Execution Failed", "channel": "both", "title": "Automation Workflow Failed: {{workflow_name}}", "subject": "[Alert] Workflow '{{workflow_name}}' encountered an error", "message": "Hi {{user_name}},\n\nAn automation flow in {{workspace_name}} failed to execute:\n\nWorkflow: {{workflow_name}}\nError: {{error_reason}}\nFailed Step: {{step_name}}\nExecution ID: {{execution_id}}\n\nPlease check your workflow configuration to resolve the issue.", "is_active": True},

            # Reports
            {"category": "Reports", "template_key": "daily_dashboard_summary", "name": "Daily Performance Summary", "channel": "email", "title": "Daily Workspace Digest", "subject": "Daily Digest: {{workspace_name}} Summary for {{report_date}}", "message": "Hi {{user_name}},\n\nHere is your daily activity summary for {{workspace_name}}:\n\n• New Leads Captured: {{new_leads}}\n• Total Messages Processed: {{total_messages}}\n• AI Credits Consumed: {{credits_used}}\n• Conversions: {{conversions}}\n\nLog in to your admin dashboard to view real-time charts.", "is_active": True},
            {"category": "Reports", "template_key": "weekly_performance_report", "name": "Weekly Business Performance Report", "channel": "email", "title": "Weekly Performance Report", "subject": "Weekly Report: {{workspace_name}} ({{date_range}})", "message": "Hi {{user_name}},\n\nYour weekly performance analytics report for {{workspace_name}} is ready.\n\nWeek Highlights:\n• Total Leads: {{weekly_leads}} ({{lead_growth_pct}}% vs prev week)\n• Conversion Rate: {{conversion_rate}}%\n• Avg First Response Time: {{avg_response_time}} min\n• AI Automation Efficiency: {{ai_handled_pct}}% automated", "is_active": True},

            # Security
            {"category": "Security", "template_key": "new_device_login", "name": "New Device / IP Sign-In", "channel": "both", "title": "New Sign-In Detected", "subject": "Security Alert: New login to {{app_name}} for {{email}}", "message": "Hi {{user_name}},\n\nWe detected a sign-in to your {{app_name}} account from a new device or location:\n\nDevice: {{device}}\nLocation: {{location}}\nIP Address: {{ip_address}}\nTime: {{login_time}}\n\nIf this was you, you can ignore this alert. If you do not recognize this activity, change your password immediately.", "is_active": True},
            {"category": "Security", "template_key": "2fa_enabled", "name": "Two-Factor Authentication Enabled", "channel": "both", "title": "2FA Successfully Configured", "subject": "Security Update: Two-Factor Authentication Enabled", "message": "Hi {{user_name}},\n\nTwo-factor authentication (2FA) was successfully enabled for your account at {{login_time}}.\n\nYour account is now protected with an additional layer of security.", "is_active": True},
            {"category": "Security", "template_key": "otp_code", "name": "Security OTP Code", "channel": "email", "title": "Verification Code", "subject": "Your {{auth_type}} Verification Code", "message": "Hi {{user_name}},\n\nYour verification code is {{otp}}. It will expire in 5 minutes.\n\nIf you did not request this, please ignore this message.", "is_active": True}
        ]

        baseline_rules = [
            {"event_name": "user.signup", "template_key": "welcome_signup", "recipient_roles": ["workspace_owner", "new_user"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "user.verification_pending", "template_key": "email_verification_pending", "recipient_roles": ["new_user"], "channels": ["email"], "delay_minutes": 0},
            {"event_name": "user.verification_reminder_24h", "template_key": "email_verification_reminder_24h", "recipient_roles": ["new_user"], "channels": ["email"], "delay_minutes": 1440},
            {"event_name": "plan.free_activated", "template_key": "free_plan_activated", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "onboarding.inactivity_reminder", "template_key": "onboarding_inactivity", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 1440},

            {"event_name": "payment.succeeded", "template_key": "payment_success", "recipient_roles": ["workspace_owner", "billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "credits.purchased", "template_key": "credit_purchase_success", "recipient_roles": ["workspace_owner", "billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "credits.low_20", "template_key": "credits_low_20", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "credits.low_10", "template_key": "credits_low_10", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "credits.exhausted", "template_key": "credits_exhausted", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "payment.failed", "template_key": "payment_failed", "recipient_roles": ["billing_contact", "workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "payment.failed_reminder_24h", "template_key": "payment_failed_reminder_24h", "recipient_roles": ["billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 1440},
            {"event_name": "payment.failed_reminder_72h", "template_key": "payment_failed_reminder_72h", "recipient_roles": ["billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 4320},
            {"event_name": "subscription.expiring_7d", "template_key": "subscription_expiring_7d", "recipient_roles": ["workspace_owner", "billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "subscription.expiring_3d", "template_key": "subscription_expiring_3d", "recipient_roles": ["workspace_owner", "billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 0},

            {"event_name": "lead.created", "template_key": "lead_created", "recipient_roles": ["assigned_agent"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "lead.assigned", "template_key": "lead_assigned", "recipient_roles": ["assigned_agent"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "lead.sla_breached", "template_key": "lead_sla_breached", "recipient_roles": ["assigned_agent", "managers"], "channels": ["email", "in_app"], "delay_minutes": 15},
            {"event_name": "lead.message_received", "template_key": "lead_message_received", "recipient_roles": ["assigned_agent"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "lead.high_intent", "template_key": "lead_high_intent", "recipient_roles": ["assigned_agent", "managers"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "lead.converted", "template_key": "lead_converted", "recipient_roles": ["workspace_owner", "managers"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "lead.inactive_reminder", "template_key": "lead_inactive_reminder", "recipient_roles": ["assigned_agent"], "channels": ["email", "in_app"], "delay_minutes": 1440},

            {"event_name": "broadcast.completed", "template_key": "broadcast_completed", "recipient_roles": ["creator", "workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
            {"event_name": "workflow.failed", "template_key": "workflow_failed", "recipient_roles": ["technical_contact", "workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},

            # Reports
            {"event_name": "report.daily_summary", "template_key": "daily_dashboard_summary", "recipient_roles": ["workspace_owner", "managers"], "channels": ["email"], "delay_minutes": 0},
            {"event_name": "report.weekly_performance", "template_key": "weekly_performance_report", "recipient_roles": ["workspace_owner", "managers"], "channels": ["email"], "delay_minutes": 0}
        ]

        inserted_count = 0
        for tpl in baseline_templates:
            existing = db.query(NotificationTemplate).filter(
                NotificationTemplate.template_key == tpl["template_key"]
            ).first()
            if not existing:
                new_tpl = NotificationTemplate(
                    id=uuid.uuid4(),
                    category=tpl["category"],
                    template_key=tpl["template_key"],
                    name=tpl["name"],
                    title=tpl["title"],
                    subject=tpl["subject"],
                    message=tpl["message"],
                    channel=tpl.get("channel", "both"),
                    is_active=tpl.get("is_active", True)
                )
                db.add(new_tpl)
                inserted_count += 1

        for rule in baseline_rules:
            existing_rule = db.query(NotificationRule).filter(
                NotificationRule.event_name == rule["event_name"],
                NotificationRule.template_key == rule["template_key"]
            ).first()
            if not existing_rule:
                new_rule = NotificationRule(
                    id=uuid.uuid4(),
                    event_name=rule["event_name"],
                    template_key=rule["template_key"],
                    recipient_roles=rule["recipient_roles"],
                    channels=rule.get("channels", ["email", "in_app"]),
                    delay_minutes=rule.get("delay_minutes", 0),
                    is_active=True
                )
                db.add(new_rule)

        if inserted_count > 0:
            try:
                db.commit()
            except Exception:
                db.rollback()
        return inserted_count

    @classmethod
    def seed_default_rules(cls, db: Session) -> int:
        """Compatibility alias for seeding baseline rules."""
        return cls.seed_default_templates(db)

    @classmethod
    def get_supported_template_keys(cls, db: Optional[Session] = None) -> Dict[str, List[str]]:
        return NotificationRegistry.get_supported_events()
