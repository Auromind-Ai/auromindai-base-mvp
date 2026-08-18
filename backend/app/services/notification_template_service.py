import re
import json
import logging
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session

from app.models.notification_template import NotificationTemplate
from app.models.notification_rule import NotificationRule
from app.core.config import settings

logger = logging.getLogger("app")

# Thread-safe in-memory cache fallback for templates: key = (template_key, channel) -> dict
_MEMORY_TEMPLATE_CACHE: Dict[Tuple[str, str], Optional[Dict[str, Any]]] = {}

SUPPORTED_NOTIFICATION_EVENTS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "User & Onboarding": {
        "welcome_signup": {
            "name": "New User & Workspace Welcome",
            "description": "Sent immediately to workspace owner upon registration with onboarding checklist.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "workspace_name", "plan_name", "credits", "action_route", "whatsapp_setup_url"],
            "action_route": "/dashboard",
            "action_label": "Go to Dashboard"
        },
        "email_verification_pending": {
            "name": "Email Verification Pending",
            "description": "Sent immediately to new user with verification link.",
            "allowed_channels": ["email"],
            "supports_subject": True,
            "placeholders": ["user_name", "email", "verification_url"],
            "action_route": "/verify-email",
            "action_label": "Verify Email"
        },
        "email_verification_reminder_24h": {
            "name": "24-Hour Verification Reminder",
            "description": "Sent 24 hours after signup if email is still unverified.",
            "allowed_channels": ["email"],
            "supports_subject": True,
            "placeholders": ["user_name", "email", "verification_url"],
            "action_route": "/verify-email",
            "action_label": "Complete Verification"
        },
        "free_plan_activated": {
            "name": "Free Plan Activated",
            "description": "Sent immediately to workspace owner when Free plan is initialized with setup checklist and dynamic credits.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "workspace_name", "plan_name", "credits", "checklist_url"],
            "action_route": "/settings/channels",
            "action_label": "Connect First Channel"
        },
        "onboarding_inactivity": {
            "name": "Onboarding Inactivity Nudge",
            "description": "Sent after 1-2 days of inactivity to encourage connecting a channel or creating a workflow.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "workspace_name", "setup_guide_url", "action_url"],
            "action_route": "/automation/workflows",
            "action_label": "Create Your First Workflow"
        }
    },
    "Payments & Credits": {
        "payment_success": {
            "name": "Subscription Payment Confirmation",
            "description": "Sent immediately on successful subscription invoice payment with receipt details.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "amount", "plan_name", "invoice_id", "invoice_url", "renewal_date", "workspace_name"],
            "action_route": "/billing",
            "action_label": "View Invoices & Billing"
        },
        "credit_purchase_success": {
            "name": "Credit Purchase Confirmation",
            "description": "Sent immediately on successful AI credit recharge with new balance.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "credits_added", "current_balance", "amount", "invoice_id", "invoice_url", "workspace_name"],
            "action_route": "/billing/usage",
            "action_label": "View Credit Balance"
        },
        "credits_low_20": {
            "name": "Credits Low (20% Balance Remaining)",
            "description": "Sent when AI token credits drop to 20% remaining balance.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "resource_name", "remaining_balance", "used_amount", "recharge_url", "workspace_name"],
            "action_route": "/billing/recharge",
            "action_label": "Recharge AI Credits"
        },
        "credits_low_10": {
            "name": "Credits Low (10% Balance Remaining)",
            "description": "Sent when AI token credits drop to 10% remaining balance.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "resource_name", "remaining_balance", "used_amount", "recharge_url", "workspace_name"],
            "action_route": "/billing/recharge",
            "action_label": "Recharge AI Credits"
        },
        "credits_exhausted": {
            "name": "Credits Exhausted (0% Balance)",
            "description": "Sent immediately when credits reach 0 with list of affected features.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "resource_name", "affected_features", "recharge_url", "workspace_name"],
            "action_route": "/billing/recharge",
            "action_label": "Recharge to Resume Services"
        },
        "payment_failed": {
            "name": "Payment Failure Warning (Immediate)",
            "description": "Sent immediately when a payment attempt fails with retry link and service cutoff date.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "amount", "error_message", "retry_url", "service_impact_date", "workspace_name"],
            "action_route": "/billing",
            "action_label": "Update Payment Method"
        },
        "payment_failed_reminder_24h": {
            "name": "Payment Failed 24h Reminder",
            "description": "Follow-up reminder 24 hours after payment failure.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "amount", "retry_url", "service_impact_date", "workspace_name"],
            "action_route": "/billing",
            "action_label": "Retry Payment"
        },
        "payment_failed_reminder_72h": {
            "name": "Payment Failed 72h Final Warning",
            "description": "Final warning 72 hours after payment failure before service suspension.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "amount", "retry_url", "service_cutoff_date", "workspace_name"],
            "action_route": "/billing",
            "action_label": "Pay Now to Prevent Interruption"
        },
        "subscription_expiring_7d": {
            "name": "7-Day Subscription Expiry Notice",
            "description": "Sent 7 days before subscription expiration.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["expiry_date", "action_url", "workspace_name"],
            "action_route": "/billing",
            "action_label": "Renew Subscription"
        },
        "subscription_expiring_3d": {
            "name": "3-Day Urgent Subscription Expiry Notice",
            "description": "Sent 3 days before subscription expiration.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["expiry_date", "action_url", "workspace_name"],
            "action_route": "/billing",
            "action_label": "Renew Subscription"
        }
    },
    "Lead Management": {
        "lead_created": {
            "name": "New Lead Created Alert",
            "description": "Sent immediately to assigned sales agent when a new lead is captured.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "lead_name", "lead_phone", "lead_email", "lead_source", "lead_score", "lead_url", "workspace_name"],
            "action_route": "/crm/leads",
            "action_label": "Open Lead in CRM"
        },
        "lead_assigned": {
            "name": "Lead Assigned / Reassigned",
            "description": "Sent immediately to newly assigned sales agent with follow-up task details.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "lead_name", "lead_phone", "lead_url", "assigned_by", "workspace_name"],
            "action_route": "/crm/leads",
            "action_label": "View Assigned Lead"
        },
        "lead_sla_breached": {
            "name": "Lead No First Reply (SLA Alert)",
            "description": "Sent to assigned agent and manager if incoming lead has no reply within 10-30 minutes.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "lead_name", "waiting_time_mins", "lead_url", "workspace_name"],
            "action_route": "/inbox",
            "action_label": "Reply to Lead Now"
        },
        "lead_message_received": {
            "name": "Lead Sent New Message",
            "description": "Sent immediately to assigned agent when lead sends an incoming chat/message.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "lead_name", "message_snippet", "conversation_url", "workspace_name"],
            "action_route": "/inbox",
            "action_label": "Open Conversation"
        },
        "lead_high_intent": {
            "name": "High-Intent Lead Detected",
            "description": "Sent immediately to agent and managers when high buying intent (pricing/demo/purchase) is detected.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "lead_name", "intent_signals", "lead_score", "conversation_url", "workspace_name"],
            "action_route": "/inbox",
            "action_label": "Engage High-Intent Lead"
        },
        "lead_converted": {
            "name": "Lead Converted Success Notice",
            "description": "Sent to workspace owner and managers with conversion summary (source, agent, deal value).",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "lead_name", "deal_value", "source", "assigned_agent_name", "product_name", "workspace_name"],
            "action_route": "/crm/leads",
            "action_label": "View Conversion Details"
        },
        "lead_inactive_reminder": {
            "name": "Dormant Lead Inactivity Reminder",
            "description": "Sent to assigned agent after 1, 3, or 7 days of lead inactivity for re-engagement.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "lead_name", "days_inactive", "suggested_action", "lead_url", "workspace_name"],
            "action_route": "/crm/leads",
            "action_label": "Re-engage Lead"
        }
    },
    "Broadcast & Workflow": {
        "broadcast_completed": {
            "name": "Broadcast Campaign Completed",
            "description": "Sent to campaign creator/admin on completion with delivery and engagement metrics.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "broadcast_name", "total_sent", "delivered", "read", "failed", "report_url", "workspace_name"],
            "action_route": "/broadcasts",
            "action_label": "View Broadcast Report"
        },
        "workflow_failed": {
            "name": "Workflow Run Execution Failure",
            "description": "Sent immediately to technical contact/admin when an automated workflow fails.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "workflow_name", "node_name", "error_message", "retry_url", "workspace_name"],
            "action_route": "/automation/workflows",
            "action_label": "Review Workflow Error"
        }
    },
    "Reports": {
        "daily_dashboard_summary": {
            "name": "Daily Dashboard Summary (Morning Brief)",
            "description": "Sent every morning to workspace owner/manager with key performance metrics.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "date", "new_leads", "conversions", "revenue", "unanswered_messages", "credit_balance", "dashboard_url", "workspace_name"],
            "action_route": "/dashboard",
            "action_label": "Open Daily Dashboard"
        },
        "weekly_performance_report": {
            "name": "Weekly Performance & Funnel Report",
            "description": "Sent weekly to owner/manager with funnel stats, agent metrics, and workflow performance.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "week_range", "funnel_stats", "top_agents", "active_workflows", "report_url", "workspace_name"],
            "action_route": "/analytics",
            "action_label": "View Analytics Report"
        }
    },
    "Security": {
        "new_device_login": {
            "name": "New Device Login Security Alert",
            "description": "Sent when a login occurs from an unrecognized device, browser, or IP location.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "login_time", "ip_address", "device", "browser", "location"],
            "action_route": "/settings/security",
            "action_label": "Security Settings"
        },
        "2fa_enabled": {
            "name": "2FA Two-Factor Authentication Enabled",
            "description": "Sent when 2FA TOTP protection is turned on for an account.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "login_time"],
            "action_route": "/settings/security",
            "action_label": "Security Settings"
        },
        "2fa_disabled": {
            "name": "2FA Two-Factor Authentication Disabled",
            "description": "Sent when 2FA TOTP protection is turned off.",
            "allowed_channels": ["email", "in_app"],
            "supports_subject": True,
            "placeholders": ["user_name", "login_time"],
            "action_route": "/settings/security",
            "action_label": "Security Settings"
        },
        "otp_code": {
            "name": "OTP Verification Code Email",
            "description": "Sent for passwordless login or 2FA verification.",
            "allowed_channels": ["email"],
            "supports_subject": True,
            "placeholders": ["user_name", "otp", "auth_type"],
            "action_route": "/login",
            "action_label": "Login"
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

    @classmethod
    def get_allowed_channels(cls, template_key: str) -> List[str]:
        meta = cls.get_metadata(template_key)
        if meta and "allowed_channels" in meta:
            return meta["allowed_channels"]
        return ["email", "in_app"]


DEFAULT_NOTIFICATION_TEMPLATES = [
    # 1. User & Onboarding
    {
        "category": "User & Onboarding",
        "template_key": "welcome_signup",
        "name": "New User & Workspace Welcome",
        "channel": "both",
        "title": "Welcome to {{app_name}}!",
        "subject": "Welcome to {{app_name}} — Let's Get Your Workspace Set Up",
        "message": "Hi {{user_name}},\n\nWelcome to {{app_name}}! Your workspace '{{workspace_name}}' is active on the {{plan_name}} with {{credits}} included AI credits.\n\nNext Steps to Go Live:\n1. Connect your WhatsApp or communication channels\n2. Import or create your first lead\n3. Deploy your AI sales workflow\n\nClick below to get started.",
        "is_active": True
    },
    {
        "category": "User & Onboarding",
        "template_key": "email_verification_pending",
        "name": "Email Verification Link",
        "channel": "email",
        "title": "Verify Your Email Address",
        "subject": "Verify your email for {{app_name}}",
        "message": "Hi {{user_name}},\n\nThank you for signing up for {{app_name}}! Please verify your email address to activate your account and start building.\n\nThis verification link will expire in {{expires_in}}.",
        "is_active": True
    },
    {
        "category": "User & Onboarding",
        "template_key": "email_verification_reminder_24h",
        "name": "Email Verification 24h Reminder",
        "channel": "email",
        "title": "Reminder: Verify Your Email Address",
        "subject": "Action Required: Complete your verification for {{app_name}}",
        "message": "Hi {{user_name}},\n\nWe noticed you haven't verified your email yet. Verify now to secure your workspace and access all features.",
        "is_active": True
    },
    {
        "category": "User & Onboarding",
        "template_key": "free_plan_activated",
        "name": "Free Plan Activated",
        "channel": "both",
        "title": "Your {{plan_name}} is Ready!",
        "subject": "Your {{workspace_name}} Free Plan is Active ({{credits}} AI Credits)",
        "message": "Hi {{user_name}},\n\nYour free plan for {{workspace_name}} is initialized with {{credits}} included AI credits.\n\nSetup Checklist:\n• Connect WhatsApp Business or Twilio\n• Import or capture your first lead\n• Create an automated AI workflow",
        "is_active": True
    },
    {
        "category": "User & Onboarding",
        "template_key": "onboarding_inactivity",
        "name": "Onboarding Inactivity Nudge",
        "channel": "both",
        "title": "Need Help Getting Started with {{workspace_name}}?",
        "subject": "Unlock your AI assistant on {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nWe noticed you haven't connected a channel or created a workflow yet. Setting up takes less than 2 minutes and helps you start capturing leads automatically.",
        "is_active": True
    },

    # 2. Payments & Credits
    {
        "category": "Payments & Credits",
        "template_key": "payment_success",
        "name": "Subscription Payment Confirmation",
        "channel": "both",
        "title": "Payment Confirmed",
        "subject": "Payment Receipt for {{workspace_name}} (Invoice #{{invoice_id}})",
        "message": "Hi {{user_name}},\n\nThank you for your payment of {{amount}} for {{workspace_name}}.\n\nPlan: {{plan_name}}\nInvoice ID: {{invoice_id}}\nRenewal Date: {{renewal_date}}\n\nYour receipt is available at the link below.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "credit_purchase_success",
        "name": "Credit Purchase Confirmation",
        "channel": "both",
        "title": "AI Credits Added Successfully",
        "subject": "Credit Recharge Confirmed: {{credits_added}} Credits Added",
        "message": "Hi {{user_name}},\n\nYour purchase of {{credits_added}} AI Credits (Amount: {{amount}}) for {{workspace_name}} was successful.\n\nCurrent Total Balance: {{current_balance}} Credits\nInvoice ID: {{invoice_id}}",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "credits_low_20",
        "name": "Credits Low (20% Balance Remaining)",
        "channel": "both",
        "title": "Low Credit Warning (20% Remaining)",
        "subject": "Notice: 20% AI Credits Remaining for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has 20% remaining balance ({{remaining_balance}} credits). Recharge now to prevent AI agent pauses.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "credits_low_10",
        "name": "Credits Low (10% Balance Remaining)",
        "channel": "both",
        "title": "Urgent: 10% AI Credits Remaining",
        "subject": "[Urgent] Only 10% AI Credits Remaining for {{workspace_name}}",
        "message": "Warning: {{workspace_name}} has only 10% AI credits left ({{remaining_balance}} credits). Please recharge immediately.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "credits_exhausted",
        "name": "Credits Exhausted (0% Balance)",
        "channel": "both",
        "title": "AI Credits Exhausted — Operations Paused",
        "subject": "[Important] AI Credits Exhausted for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has exhausted all available AI credits. Automated AI responses and campaign outbound messages are temporarily paused until recharged.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "payment_failed",
        "name": "Payment Failure Warning (Immediate)",
        "channel": "both",
        "title": "Payment Failed — Action Required",
        "subject": "[Action Required] Payment Failure for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nWe were unable to process your payment of {{amount}} for {{workspace_name}}.\n\nReason: {{error_message}}\nService Impact Date: {{service_impact_date}}\n\nPlease update your payment details or retry payment to maintain uninterrupted service.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "payment_failed_reminder_24h",
        "name": "Payment Failed 24h Reminder",
        "channel": "both",
        "title": "Reminder: Outstanding Payment for {{workspace_name}}",
        "subject": "Reminder: Update billing information for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour invoice of {{amount}} remains unpaid. Please retry payment to avoid service suspension on {{service_impact_date}}.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "payment_failed_reminder_72h",
        "name": "Payment Failed 72h Final Warning",
        "channel": "both",
        "title": "Final Notice: Service Cutoff Approaching",
        "subject": "Final Notice: Immediate action required for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nThis is the final notice regarding your unpaid invoice ({{amount}}). Service will be suspended on {{service_cutoff_date}} if payment is not completed.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "subscription_expiring_7d",
        "name": "7-Day Subscription Expiry Notice",
        "channel": "both",
        "title": "Subscription Expiring Soon",
        "subject": "Notice: Your {{workspace_name}} Subscription Expires in 7 Days",
        "message": "Hi {{user_name}},\n\nYour subscription for {{workspace_name}} is set to expire on {{expiry_date}} (in 7 days).\n\nPlease renew your plan at the link below.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "subscription_expiring_3d",
        "name": "3-Day Urgent Subscription Expiry Notice",
        "channel": "both",
        "title": "Subscription Expiring in 3 Days",
        "subject": "Urgent: {{workspace_name}} Subscription Expires in 3 Days!",
        "message": "Hi {{user_name}},\n\nYour subscription for {{workspace_name}} will expire in 3 days on {{expiry_date}}.\n\nPlease renew immediately to prevent service disruption.",
        "is_active": True
    },

    # 3. Lead Management
    {
        "category": "Lead Management",
        "template_key": "lead_created",
        "name": "New Lead Created Alert",
        "channel": "both",
        "title": "New Lead Captured: {{lead_name}}",
        "subject": "New Lead Captured: {{lead_name}} ({{lead_source}})",
        "message": "Hi {{user_name}},\n\nA new lead has been captured for {{workspace_name}}.\n\nLead Name: {{lead_name}}\nPhone: {{lead_phone}}\nSource: {{lead_source}}\nInitial Score: {{lead_score}}",
        "is_active": True
    },
    {
        "category": "Lead Management",
        "template_key": "lead_assigned",
        "name": "Lead Assigned / Reassigned",
        "channel": "both",
        "title": "Lead Assigned to You: {{lead_name}}",
        "subject": "Lead Assigned: {{lead_name}} is now in your queue",
        "message": "Hi {{user_name}},\n\nYou have been assigned as the primary agent for {{lead_name}} ({{lead_phone}}).\n\nAssigned By: {{assigned_by}}\n\nPlease review their requirements and initiate follow-up.",
        "is_active": True
    },
    {
        "category": "Lead Management",
        "template_key": "lead_sla_breached",
        "name": "Lead No First Reply (SLA Alert)",
        "channel": "both",
        "title": "SLA Warning: Unreplied Lead ({{waiting_time_mins}}m)",
        "subject": "[SLA Alert] Lead {{lead_name}} awaiting reply for {{waiting_time_mins}} mins",
        "message": "Hi {{user_name}},\n\nLead '{{lead_name}}' has been waiting for {{waiting_time_mins}} minutes without a first response. Prompt replies increase conversion rates by over 70%.",
        "is_active": True
    },
    {
        "category": "Lead Management",
        "template_key": "lead_message_received",
        "name": "Lead Sent New Message",
        "channel": "both",
        "title": "New Message from {{lead_name}}",
        "subject": "New Message from {{lead_name}}: \"{{message_snippet}}\"",
        "message": "Hi {{user_name}},\n\n{{lead_name}} sent a new message in {{workspace_name}}:\n\n\"{{message_snippet}}\"\n\nClick below to open the conversation.",
        "is_active": True
    },
    {
        "category": "Lead Management",
        "template_key": "lead_high_intent",
        "name": "High-Intent Lead Detected",
        "channel": "both",
        "title": "🔥 High Buying Intent: {{lead_name}}",
        "subject": "🔥 High-Intent Lead Detected: {{lead_name}} (Score: {{lead_score}})",
        "message": "Hi {{user_name}},\n\nOur AI detected strong buying intent signals from {{lead_name}}.\n\nDetected Signals: {{intent_signals}}\nLead Score: {{lead_score}}\n\nImmediate engagement is recommended.",
        "is_active": True
    },
    {
        "category": "Lead Management",
        "template_key": "lead_converted",
        "name": "Lead Converted Success Notice",
        "channel": "both",
        "title": "🎉 Deal Converted: {{lead_name}} ({{deal_value}})",
        "subject": "🎉 Lead Converted: {{lead_name}} closed for {{deal_value}}!",
        "message": "Congratulations team!\n\nLead '{{lead_name}}' has been successfully converted in {{workspace_name}}.\n\nDeal Value: {{deal_value}}\nProduct: {{product_name}}\nAssigned Agent: {{assigned_agent_name}}\nSource: {{source}}",
        "is_active": True
    },
    {
        "category": "Lead Management",
        "template_key": "lead_inactive_reminder",
        "name": "Dormant Lead Inactivity Reminder",
        "channel": "both",
        "title": "Re-engagement Reminder: {{lead_name}} ({{days_inactive}}d Inactive)",
        "subject": "Follow-up Reminder: {{lead_name}} has been inactive for {{days_inactive}} days",
        "message": "Hi {{user_name}},\n\nLead '{{lead_name}}' has had no activity for {{days_inactive}} days.\n\nSuggested Action: {{suggested_action}}\n\nClick below to send a follow-up message.",
        "is_active": True
    },

    # 4. Broadcast & Workflow
    {
        "category": "Broadcast & Workflow",
        "template_key": "broadcast_completed",
        "name": "Broadcast Campaign Completed",
        "channel": "both",
        "title": "Broadcast Campaign Finished: {{broadcast_name}}",
        "subject": "Broadcast Completed: {{broadcast_name}} ({{delivered}}/{{total_sent}} delivered)",
        "message": "Hi {{user_name}},\n\nYour broadcast '{{broadcast_name}}' has finished sending.\n\nTotal Sent: {{total_sent}}\nDelivered: {{delivered}}\nRead: {{read}}\nFailed: {{failed}}\n\nFull metrics report available below.",
        "is_active": True
    },
    {
        "category": "Broadcast & Workflow",
        "template_key": "workflow_failed",
        "name": "Workflow Run Execution Failure",
        "channel": "both",
        "title": "Workflow Execution Failed",
        "subject": "[Alert] Workflow Failure: {{workflow_name}} in {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nWorkflow '{{workflow_name}}' failed during execution at node '{{node_name}}'.\n\nError: {{error_message}}\n\nReview the workflow execution trace and retry using the link below.",
        "is_active": True
    },

    # 5. Reports
    {
        "category": "Reports",
        "template_key": "daily_dashboard_summary",
        "name": "Daily Dashboard Summary (Morning Brief)",
        "channel": "email",
        "title": "Daily Briefing: {{date}}",
        "subject": "Daily Briefing for {{workspace_name}} — {{date}}",
        "message": "Good morning {{user_name}},\n\nHere is your daily summary for {{workspace_name}} on {{date}}:\n\n• New Leads Captured: {{new_leads}}\n• Deals Converted: {{conversions}}\n• Total Revenue: {{revenue}}\n• Unanswered Messages: {{unanswered_messages}}\n• Remaining AI Credits: {{credit_balance}}\n\nOpen your dashboard to review details.",
        "is_active": True
    },
    {
        "category": "Reports",
        "template_key": "weekly_performance_report",
        "name": "Weekly Performance & Funnel Report",
        "channel": "email",
        "title": "Weekly Report ({{week_range}})",
        "subject": "Weekly Performance Report for {{workspace_name}} ({{week_range}})",
        "message": "Hi {{user_name}},\n\nHere is your weekly performance breakdown for {{workspace_name}}:\n\n• Funnel Performance: {{funnel_stats}}\n• Top Sales Agents: {{top_agents}}\n• Active Automations: {{active_workflows}}\n\nClick below to explore full analytics.",
        "is_active": True
    },

    # 6. Security
    {
        "category": "Security",
        "template_key": "new_device_login",
        "name": "New Device Login Security Alert",
        "channel": "both",
        "title": "Security Alert: New Device Login",
        "subject": "[Security Alert] New Login from Unrecognized Device",
        "message": "Hi {{user_name}},\n\nWe detected a login to your account from a new device or browser ({{device}}).\n\nIP Address: {{ip_address}}\nLocation: {{location}}\nTime: {{login_time}}\n\nIf this was not you, please reset your password immediately.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "2fa_enabled",
        "name": "2FA Enabled Notification",
        "channel": "both",
        "title": "Two-Factor Authentication Enabled",
        "subject": "2FA Enabled for Your Account",
        "message": "Hi {{user_name}},\n\nTwo-Factor Authentication (2FA) has been successfully enabled for your account. Your account is now more secure.",
        "is_active": True
    },
    {
        "category": "Security",
        "template_key": "2fa_disabled",
        "name": "2FA Disabled Warning",
        "channel": "both",
        "title": "Security Warning: 2FA Disabled",
        "subject": "[Security Warning] Two-Factor Authentication Disabled",
        "message": "Hi {{user_name}},\n\nTwo-Factor Authentication (2FA) was disabled for your account at {{login_time}}.",
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
    }
]


# Default Notification Rules connecting Events -> Templates -> Recipient Roles
DEFAULT_NOTIFICATION_RULES = [
    # User & Onboarding
    {"event_name": "user.signup", "template_key": "welcome_signup", "recipient_roles": ["workspace_owner", "new_user"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "user.verification_pending", "template_key": "email_verification_pending", "recipient_roles": ["new_user"], "channels": ["email"], "delay_minutes": 0},
    {"event_name": "user.verification_reminder_24h", "template_key": "email_verification_reminder_24h", "recipient_roles": ["new_user"], "channels": ["email"], "delay_minutes": 1440},
    {"event_name": "plan.free_activated", "template_key": "free_plan_activated", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "onboarding.inactivity_reminder", "template_key": "onboarding_inactivity", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 1440},

    # Payments & Credits
    {"event_name": "payment.succeeded", "template_key": "payment_success", "recipient_roles": ["workspace_owner", "billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "credits.purchased", "template_key": "credit_purchase_success", "recipient_roles": ["workspace_owner", "billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "credits.low_20", "template_key": "credits_low_20", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "credits.low_10", "template_key": "credits_low_10", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "credits.exhausted", "template_key": "credits_exhausted", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "payment.failed", "template_key": "payment_failed", "recipient_roles": ["billing_contact", "workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "payment.failed_reminder_24h", "template_key": "payment_failed_reminder_24h", "recipient_roles": ["billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 1440},
    {"event_name": "payment.failed_reminder_72h", "template_key": "payment_failed_reminder_72h", "recipient_roles": ["billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 4320},

    # Lead Management
    {"event_name": "lead.created", "template_key": "lead_created", "recipient_roles": ["assigned_agent"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "lead.assigned", "template_key": "lead_assigned", "recipient_roles": ["assigned_agent"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "lead.sla_breached", "template_key": "lead_sla_breached", "recipient_roles": ["assigned_agent", "managers"], "channels": ["email", "in_app"], "delay_minutes": 15},
    {"event_name": "lead.message_received", "template_key": "lead_message_received", "recipient_roles": ["assigned_agent"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "lead.high_intent", "template_key": "lead_high_intent", "recipient_roles": ["assigned_agent", "managers"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "lead.converted", "template_key": "lead_converted", "recipient_roles": ["workspace_owner", "managers"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "lead.inactive_reminder", "template_key": "lead_inactive_reminder", "recipient_roles": ["assigned_agent"], "channels": ["email", "in_app"], "delay_minutes": 1440},

    # Broadcast & Workflow
    {"event_name": "broadcast.completed", "template_key": "broadcast_completed", "recipient_roles": ["creator", "workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "workflow.failed", "template_key": "workflow_failed", "recipient_roles": ["technical_contact", "workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},

    # Reports
    {"event_name": "report.daily_summary", "template_key": "daily_dashboard_summary", "recipient_roles": ["workspace_owner", "managers"], "channels": ["email"], "delay_minutes": 0},
    {"event_name": "report.weekly_performance", "template_key": "weekly_performance_report", "recipient_roles": ["workspace_owner", "managers"], "channels": ["email"], "delay_minutes": 0},
]


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
        app_name: str = "Auromind AI"
    ) -> str:
        """
        Renders a modern, responsive HTML email layout with header branding,
        card container, styled CTA button, deep links, and compliant footer.
        """
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

        # 4. Fallback to built-in default templates
        fallback = next(
            (t for t in DEFAULT_NOTIFICATION_TEMPLATES if t["template_key"] == template_key and t.get("is_active", True)),
            None
        )

        if fallback:
            _MEMORY_TEMPLATE_CACHE[cache_key] = fallback
            return fallback

        return None

    @classmethod
    def seed_default_templates(cls, db: Session, updated_by: str = "System Admin") -> int:
        created_count = 0
        for item in DEFAULT_NOTIFICATION_TEMPLATES:
            existing = db.query(NotificationTemplate).filter(
                NotificationTemplate.template_key == item["template_key"]
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
            else:
                # Update subject / title if missing in older seed
                if not existing.subject and item.get("subject"):
                    existing.subject = item.get("subject")
                if not existing.title and item.get("title"):
                    existing.title = item.get("title")

        if created_count > 0:
            db.commit()
            cls.clear_cache()
        return created_count

    @classmethod
    def seed_default_rules(cls, db: Session) -> int:
        """Seed default notification rules into notification_rules table."""
        created_count = 0
        for rule_def in DEFAULT_NOTIFICATION_RULES:
            existing = db.query(NotificationRule).filter(
                NotificationRule.event_name == rule_def["event_name"],
                NotificationRule.template_key == rule_def["template_key"]
            ).first()
            if not existing:
                new_rule = NotificationRule(
                    event_name=rule_def["event_name"],
                    template_key=rule_def["template_key"],
                    recipient_roles=rule_def["recipient_roles"],
                    channels=rule_def.get("channels", ["email"]),
                    delay_minutes=rule_def.get("delay_minutes", 0),
                    is_active=True
                )
                db.add(new_rule)
                created_count += 1
        if created_count > 0:
            db.commit()
        return created_count

    @classmethod
    def get_supported_template_keys(cls, db: Optional[Session] = None) -> Dict[str, List[str]]:
        return NotificationRegistry.get_supported_events()
