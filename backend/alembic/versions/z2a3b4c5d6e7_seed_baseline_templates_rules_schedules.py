"""seed baseline notification templates, rules, and schedules

Revision ID: z2a3b4c5d6e7
Revises: y1z2a3b4c5d6
Create Date: 2026-08-19 12:30:00.000000

"""
import uuid
import json
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'z2a3b4c5d6e7'
down_revision = 'y1z2a3b4c5d6'
branch_labels = None
depends_on = None

# ---------------------------------------------------------------------------
# Module-level data lists (importable by test helpers)
# ---------------------------------------------------------------------------

INITIAL_TEMPLATES = [
    # 1. User & Onboarding
    {
        "category": "User & Onboarding",
        "template_key": "welcome_signup",
        "name": "New User & Workspace Welcome",
        "channel": "both",
        "title": "Welcome to {{app_name}}!",
        "subject": "Welcome to {{app_name}} \u2014 Let's Get Your Workspace Set Up",
        "message": "Hi {{user_name}},\n\nWelcome to {{app_name}}! Your workspace '{{workspace_name}}' is active on the {{plan_name}} with {{credits}} included AI credits.\n\nNext Steps to Go Live:\n1. Connect your WhatsApp or communication channels\n2. Import or create your first lead\n3. Deploy your AI sales workflow\n\nClick below to get started.",
        "is_active": True
    },
    {
        "category": "User & Onboarding",
        "template_key": "email_verification_pending",
        "name": "Email Verification & OTP Code",
        "channel": "email",
        "title": "Verify Your Email Address",
        "subject": "Verify your email for {{app_name}} \u2014 Code: {{otp}}",
        "message": "Hi {{user_name}},\n\nThank you for signing up for {{app_name}}!\n\nYour verification code is: {{otp}}\n\nPlease enter this code or click the button below to verify your email address and activate your account.\n\nThis verification code and link will expire in {{expires_in}}.",
        "is_active": True
    },
    {
        "category": "User & Onboarding",
        "template_key": "email_verification_reminder_24h",
        "name": "Email Verification 24h Reminder",
        "channel": "email",
        "title": "Reminder: Verify Your Email Address",
        "subject": "Action Required: Complete your verification for {{app_name}}",
        "message": "Hi {{user_name}},\n\nWe noticed you haven't verified your email yet. Your verification code is {{otp}}.\n\nClick the button below to complete your verification and access your workspace. This verification link and code will expire in {{expires_in}}.",
        "is_active": True
    },
    {
        "category": "User & Onboarding",
        "template_key": "free_plan_activated",
        "name": "Free Plan Activated",
        "channel": "both",
        "title": "Your {{plan_name}} is Ready!",
        "subject": "Your {{workspace_name}} Free Plan is Active ({{credits}} AI Credits)",
        "message": "Hi {{user_name}},\n\nYour free plan for {{workspace_name}} is initialized with {{credits}} included AI credits.\n\nSetup Checklist:\n\u2022 Connect WhatsApp Business or Twilio\n\u2022 Import or capture your first lead\n\u2022 Create an automated AI workflow",
        "is_active": True
    },
    {
        "category": "User & Onboarding",
        "template_key": "onboarding_inactivity",
        "name": "Onboarding Inactivity Nudge",
        "channel": "both",
        "title": "Need Help Getting Started with {{workspace_name}}?",
        "subject": "Unlock your AI assistant on {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has been inactive for {{days_inactive}} days. {{suggested_action}}.\n\nSetting up takes less than 2 minutes and helps you start capturing leads automatically.",
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
        "message": "Hi {{user_name}},\n\nYour purchase of {{credits_added}} AI Credits (Amount: {{amount}}) for {{workspace_name}} was successful.\n\nCurrent Available Balance: {{current_balance}} Credits\nInvoice ID: {{invoice_id}}",
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
        "title": "AI Credits Exhausted \u2014 Operations Paused",
        "subject": "[Important] AI Credits Exhausted for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has exhausted all available AI credits. Automated AI responses and campaign outbound messages are temporarily paused until recharged.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "payment_failed",
        "name": "Payment Failure Warning (Immediate)",
        "channel": "both",
        "title": "Payment Failed \u2014 Action Required",
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
        "title": "\U0001F525 High Buying Intent: {{lead_name}}",
        "subject": "\U0001F525 High-Intent Lead Detected: {{lead_name}} (Score: {{lead_score}})",
        "message": "Hi {{user_name}},\n\nOur AI detected strong buying intent signals from {{lead_name}}.\n\nDetected Signals: {{intent_signals}}\nLead Score: {{lead_score}}\n\nImmediate engagement is recommended.",
        "is_active": True
    },
    {
        "category": "Lead Management",
        "template_key": "lead_converted",
        "name": "Lead Converted Success Notice",
        "channel": "both",
        "title": "\U0001F389 Deal Converted: {{lead_name}} ({{deal_value}})",
        "subject": "\U0001F389 Lead Converted: {{lead_name}} closed for {{deal_value}}!",
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
    # 3. Lead Management (Append these two at the end of Lead Management)
    {
        "category": "Lead Management",
        "template_key": "contact_inquiry_user_ack",
        "name": "Contact Inquiry Confirmation (User)",
        "channel": "both",
        "title": "We Received Your Request 🚀",
        "subject": "Thank you for reaching out, {{user_name}}! - Auromind",
        "message": "Hi {{user_name}},\n\nThank you for reaching out to us regarding our Enterprise & Custom solutions. We have safely received your requirement:\n\n\"{{requirement}}\"\n\nOur team is reviewing your requirements and will get back to you within 24 business hours.",
        "is_active": True
    },
    {
        "category": "Lead Management",
        "template_key": "contact_inquiry_sales_alert",
        "name": "New Enterprise Lead Alert (Sales)",
        "channel": "both",
        "title": "🔥 New Enterprise Lead Received",
        "subject": "🔥 New Enterprise Lead: {{user_name}} ({{company}})",
        "message": "A new enterprise inquiry has been submitted on the Pricing Page.\n\nLead Details:\n• Name: {{user_name}}\n• Email: {{email}}\n• Phone: {{phone}}\n• Company: {{company}}\n• Budget: {{budget}}\n\nRequirement Summary:\n{{requirement}}",
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
        "subject": "Daily Briefing for {{workspace_name}} \u2014 {{date}}",
        "message": "Good morning {{user_name}},\n\nHere is your daily summary for {{workspace_name}} on {{date}}:\n\n\u2022 New Leads Captured: {{new_leads}}\n\u2022 Deals Converted: {{conversions}}\n\u2022 Total Revenue: {{revenue}}\n\u2022 Unanswered Messages: {{unanswered_messages}}\n\u2022 Remaining AI Credits: {{credit_balance}}\n\nOpen your dashboard to review details.",
        "is_active": True
    },
    {
        "category": "Reports",
        "template_key": "weekly_performance_report",
        "name": "Weekly Performance & Funnel Report",
        "channel": "email",
        "title": "Weekly Report ({{week_range}})",
        "subject": "Weekly Performance Report for {{workspace_name}} ({{week_range}})",
        "message": "Hi {{user_name}},\n\nHere is your weekly performance breakdown for {{workspace_name}}:\n\n\u2022 Funnel Performance: {{funnel_stats}}\n\u2022 Top Sales Agents: {{top_agents}}\n\u2022 Active Automations: {{active_workflows}}\n\nClick below to explore full analytics.",
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

INITIAL_RULES = [
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
    {"event_name": "subscription.expiring_7d", "template_key": "subscription_expiring_7d", "recipient_roles": ["workspace_owner", "billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "subscription.expiring_3d", "template_key": "subscription_expiring_3d", "recipient_roles": ["workspace_owner", "billing_contact"], "channels": ["email", "in_app"], "delay_minutes": 0},

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

    # Security & Authentication
    {"event_name": "security.new_device_login", "template_key": "new_device_login", "recipient_roles": ["new_user"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "security.2fa_enabled", "template_key": "2fa_enabled", "recipient_roles": ["new_user"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "security.2fa_disabled", "template_key": "2fa_disabled", "recipient_roles": ["new_user"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "auth.otp_code", "template_key": "otp_code", "recipient_roles": ["new_user"], "channels": ["email"], "delay_minutes": 0},
]

INITIAL_SCHEDULES = [
    {
        "event_name": "report.daily_summary",
        "display_name": "Daily Dashboard Summary",
        "description": "Morning briefing email with leads, revenue, unanswered chats, and credit balance.",
        "schedule_type": "daily",
        "time_of_day": "08:00",
        "day_of_week": None,
        "interval_minutes": None,
        "default_timezone": "Asia/Kolkata",
        "is_active": True
    },
    {
        "event_name": "report.weekly_performance",
        "display_name": "Weekly Performance Report",
        "description": "Weekly funnel conversion rates, top sales agents, and automation statistics.",
        "schedule_type": "weekly",
        "time_of_day": "08:30",
        "day_of_week": "monday",
        "interval_minutes": None,
        "default_timezone": "Asia/Kolkata",
        "is_active": True
    },
    {
        "event_name": "onboarding.milestones",
        "display_name": "Onboarding & Payment Reminders",
        "description": "Scans onboarding inactivity (1-2d) and payment failure followups (24h/72h).",
        "schedule_type": "daily",
        "time_of_day": "09:00",
        "day_of_week": None,
        "interval_minutes": None,
        "default_timezone": "Asia/Kolkata",
        "is_active": True
    },
    {
        "event_name": "lead.inactive_scan",
        "display_name": "Inactive Lead Scanner",
        "description": "Scans dormant leads at 1, 3, and 7-day intervals and sends re-engagement follow-up tasks.",
        "schedule_type": "daily",
        "time_of_day": "10:00",
        "day_of_week": None,
        "interval_minutes": None,
        "default_timezone": "Asia/Kolkata",
        "is_active": True
    },
    {
        "event_name": "lead.sla_scan",
        "display_name": "Lead SLA Breach Monitor",
        "description": "Monitors unreplied incoming leads waiting more than 15 minutes.",
        "schedule_type": "interval_minutes",
        "time_of_day": None,
        "day_of_week": None,
        "interval_minutes": 1,
        "default_timezone": "Asia/Kolkata",
        "is_active": True
    }
]

# ---------------------------------------------------------------------------
# Table references for op.bulk_insert()
# ---------------------------------------------------------------------------

templates_table = sa.table(
    'notification_templates',
    sa.column('id', sa.String),
    sa.column('category', sa.String),
    sa.column('template_key', sa.String),
    sa.column('name', sa.String),
    sa.column('channel', sa.String),
    sa.column('title', sa.String),
    sa.column('subject', sa.String),
    sa.column('message', sa.Text),
    sa.column('is_active', sa.Boolean),
)

rules_table = sa.table(
    'notification_rules',
    sa.column('id', sa.String),
    sa.column('event_name', sa.String),
    sa.column('template_key', sa.String),
    sa.column('recipient_roles', sa.Text),
    sa.column('channels', sa.Text),
    sa.column('delay_minutes', sa.Integer),
)

schedules_table = sa.table(
    'notification_schedules',
    sa.column('id', sa.String),
    sa.column('event_name', sa.String),
    sa.column('display_name', sa.String),
    sa.column('description', sa.Text),
    sa.column('schedule_type', sa.String),
    sa.column('time_of_day', sa.String),
    sa.column('day_of_week', sa.String),
    sa.column('interval_minutes', sa.Integer),
    sa.column('default_timezone', sa.String),
    sa.column('is_active', sa.Boolean),
)


def upgrade() -> None:
    conn = op.get_bind()

    # --- Seed notification templates ---
    existing_templates = set(
        conn.execute(
            sa.select(templates_table.c.template_key, templates_table.c.channel)
        ).fetchall()
    )
    template_rows = [
        {
            "id": str(uuid.uuid4()),
            "category": t["category"],
            "template_key": t["template_key"],
            "name": t["name"],
            "channel": t["channel"],
            "title": t["title"],
            "subject": t["subject"],
            "message": t["message"],
            "is_active": t["is_active"],
        }
        for t in INITIAL_TEMPLATES
        if (t["template_key"], t["channel"]) not in existing_templates
    ]
    if template_rows:
        op.bulk_insert(templates_table, template_rows)

    # --- Seed notification rules ---
    existing_rules = set(
        conn.execute(
            sa.select(rules_table.c.event_name, rules_table.c.template_key)
        ).fetchall()
    )
    rule_rows = [
        {
            "id": str(uuid.uuid4()),
            "event_name": r["event_name"],
            "template_key": r["template_key"],
            "recipient_roles": json.dumps(r["recipient_roles"]),
            "channels": json.dumps(r["channels"]),
            "delay_minutes": r["delay_minutes"],
        }
        for r in INITIAL_RULES
        if (r["event_name"], r["template_key"]) not in existing_rules
    ]
    if rule_rows:
        op.bulk_insert(rules_table, rule_rows)

    # --- Seed notification schedules ---
    existing_schedules = set(
        row[0]
        for row in conn.execute(
            sa.select(schedules_table.c.event_name)
        ).fetchall()
    )
    schedule_rows = [
        {
            "id": str(uuid.uuid4()),
            "event_name": s["event_name"],
            "display_name": s["display_name"],
            "description": s["description"],
            "schedule_type": s["schedule_type"],
            "time_of_day": s["time_of_day"],
            "day_of_week": s["day_of_week"],
            "interval_minutes": s["interval_minutes"],
            "default_timezone": s["default_timezone"],
            "is_active": s["is_active"],
        }
        for s in INITIAL_SCHEDULES
        if s["event_name"] not in existing_schedules
    ]
    if schedule_rows:
        op.bulk_insert(schedules_table, schedule_rows)


def downgrade() -> None:
    # --- Remove seeded templates by template_key ---
    template_keys = [t["template_key"] for t in INITIAL_TEMPLATES]
    op.execute(
        templates_table.delete().where(
            templates_table.c.template_key.in_(template_keys)
        )
    )

    # --- Remove seeded rules by event_name ---
    rule_event_names = [r["event_name"] for r in INITIAL_RULES]
    op.execute(
        rules_table.delete().where(
            rules_table.c.event_name.in_(rule_event_names)
        )
    )

    # --- Remove seeded schedules by event_name ---
    schedule_event_names = [s["event_name"] for s in INITIAL_SCHEDULES]
    op.execute(
        schedules_table.delete().where(
            schedules_table.c.event_name.in_(schedule_event_names)
        )
    )
