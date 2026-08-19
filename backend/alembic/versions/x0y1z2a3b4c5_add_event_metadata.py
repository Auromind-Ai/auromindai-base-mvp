
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'x0y1z2a3b4c5'
down_revision = 'w9x0y1z2a3b4'
branch_labels = None
depends_on = None

INITIAL_METADATA_ROWS = [
    {
        "event_name": "user.signup",
        "template_key": "welcome_signup",
        "category": "User & Onboarding",
        "name": "New User & Workspace Welcome",
        "description": "Sent immediately to workspace owner upon registration with onboarding checklist.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/dashboard",
        "action_label": "Go to Dashboard",
        "supports_subject": True
    },
    {
        "event_name": "user.verification_pending",
        "template_key": "email_verification_pending",
        "category": "User & Onboarding",
        "name": "Email Verification & OTP Code",
        "description": "Sent immediately to new user with verification OTP and link.",
        "allowed_channels": ["email"],
        "action_route": "/verify-otp",
        "action_label": "Verify Email",
        "supports_subject": True
    },
    {
        "event_name": "user.verification_reminder_24h",
        "template_key": "email_verification_reminder_24h",
        "category": "User & Onboarding",
        "name": "24-Hour Verification Reminder",
        "description": "Sent 24 hours after signup if email is still unverified.",
        "allowed_channels": ["email"],
        "action_route": "/verify-otp",
        "action_label": "Complete Verification",
        "supports_subject": True
    },
    {
        "event_name": "plan.free_activated",
        "template_key": "free_plan_activated",
        "category": "User & Onboarding",
        "name": "Free Plan Activated",
        "description": "Sent immediately to workspace owner when Free plan is initialized with setup checklist and dynamic credits.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/settings/channels",
        "action_label": "Connect First Channel",
        "supports_subject": True
    },
    {
        "event_name": "onboarding.inactivity_reminder",
        "template_key": "onboarding_inactivity",
        "category": "User & Onboarding",
        "name": "Onboarding Inactivity Nudge",
        "description": "Sent after 1-2 days of inactivity to encourage connecting a channel or creating a workflow.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/automation/workflows",
        "action_label": "Create Your First Workflow",
        "supports_subject": True
    },
    {
        "event_name": "payment.succeeded",
        "template_key": "payment_success",
        "category": "Payments & Credits",
        "name": "Subscription Payment Confirmation",
        "description": "Sent immediately on successful subscription invoice payment with receipt details.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "View Invoices & Billing",
        "supports_subject": True
    },
    {
        "event_name": "credits.purchased",
        "template_key": "credit_purchase_success",
        "category": "Payments & Credits",
        "name": "Credit Purchase Confirmation",
        "description": "Sent immediately on successful AI credit recharge with new balance.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing/usage",
        "action_label": "View Credit Balance",
        "supports_subject": True
    },
    {
        "event_name": "credits.low_20",
        "template_key": "credits_low_20",
        "category": "Payments & Credits",
        "name": "Credits Low (20% Balance Remaining)",
        "description": "Sent when AI token credits drop to 20% remaining balance.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing/recharge",
        "action_label": "Recharge AI Credits",
        "supports_subject": True
    },
    {
        "event_name": "credits.low_10",
        "template_key": "credits_low_10",
        "category": "Payments & Credits",
        "name": "Credits Low (10% Balance Remaining)",
        "description": "Sent when AI token credits drop to 10% remaining balance.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing/recharge",
        "action_label": "Recharge AI Credits",
        "supports_subject": True
    },
    {
        "event_name": "credits.exhausted",
        "template_key": "credits_exhausted",
        "category": "Payments & Credits",
        "name": "Credits Exhausted (0% Balance)",
        "description": "Sent immediately when credits reach 0 with list of affected features.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing/recharge",
        "action_label": "Recharge to Resume Services",
        "supports_subject": True
    },
    {
        "event_name": "payment.failed",
        "template_key": "payment_failed",
        "category": "Payments & Credits",
        "name": "Payment Failure Warning (Immediate)",
        "description": "Sent immediately when a payment attempt fails with retry link and service cutoff date.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Update Payment Method",
        "supports_subject": True
    },
    {
        "event_name": "payment.failed_reminder_24h",
        "template_key": "payment_failed_reminder_24h",
        "category": "Payments & Credits",
        "name": "Payment Failed 24h Reminder",
        "description": "Follow-up reminder 24 hours after payment failure.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Retry Payment",
        "supports_subject": True
    },
    {
        "event_name": "payment.failed_reminder_72h",
        "template_key": "payment_failed_reminder_72h",
        "category": "Payments & Credits",
        "name": "Payment Failed 72h Final Warning",
        "description": "Final warning 72 hours after payment failure before service suspension.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Pay Now to Prevent Interruption",
        "supports_subject": True
    },
    {
        "event_name": "subscription.expiring_7d",
        "template_key": "subscription_expiring_7d",
        "category": "Payments & Credits",
        "name": "7-Day Subscription Expiry Notice",
        "description": "Sent 7 days before subscription expiration.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Renew Subscription",
        "supports_subject": True
    },
    {
        "event_name": "subscription.expiring_3d",
        "template_key": "subscription_expiring_3d",
        "category": "Payments & Credits",
        "name": "3-Day Urgent Subscription Expiry Notice",
        "description": "Sent 3 days before subscription expiration.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Renew Subscription",
        "supports_subject": True
    },
    {
        "event_name": "lead.created",
        "template_key": "lead_created",
        "category": "Lead Management",
        "name": "New Lead Created Alert",
        "description": "Sent immediately to assigned sales agent when a new lead is captured.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/crm/leads",
        "action_label": "Open Lead in CRM",
        "supports_subject": True
    },
    {
        "event_name": "lead.assigned",
        "template_key": "lead_assigned",
        "category": "Lead Management",
        "name": "Lead Assigned / Reassigned",
        "description": "Sent immediately to newly assigned sales agent with follow-up task details.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/crm/leads",
        "action_label": "View Assigned Lead",
        "supports_subject": True
    },
    {
        "event_name": "lead.sla_breached",
        "template_key": "lead_sla_breached",
        "category": "Lead Management",
        "name": "Lead No First Reply (SLA Alert)",
        "description": "Sent to assigned agent and manager if incoming lead has no reply within 10-30 minutes.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/inbox",
        "action_label": "Reply to Lead Now",
        "supports_subject": True
    },
    {
        "event_name": "lead.message_received",
        "template_key": "lead_message_received",
        "category": "Lead Management",
        "name": "Lead Sent New Message",
        "description": "Sent immediately to assigned agent when lead sends an incoming chat/message.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/inbox",
        "action_label": "Open Conversation",
        "supports_subject": True
    },
    {
        "event_name": "lead.high_intent",
        "template_key": "lead_high_intent",
        "category": "Lead Management",
        "name": "High-Intent Lead Detected",
        "description": "Sent immediately to agent and managers when high buying intent (pricing/demo/purchase) is detected.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/inbox",
        "action_label": "Engage High-Intent Lead",
        "supports_subject": True
    },
    {
        "event_name": "lead.converted",
        "template_key": "lead_converted",
        "category": "Lead Management",
        "name": "Lead Converted Success Notice",
        "description": "Sent to workspace owner and managers with conversion summary (source, agent, deal value).",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/crm/leads",
        "action_label": "View Conversion Details",
        "supports_subject": True
    },
    {
        "event_name": "lead.inactive_reminder",
        "template_key": "lead_inactive_reminder",
        "category": "Lead Management",
        "name": "Dormant Lead Inactivity Reminder",
        "description": "Sent to assigned agent after 1, 3, or 7 days of lead inactivity for re-engagement.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/crm/leads",
        "action_label": "Re-engage Lead",
        "supports_subject": True
    },
    {
        "event_name": "broadcast.completed",
        "template_key": "broadcast_completed",
        "category": "Broadcast & Workflow",
        "name": "Broadcast Campaign Completed",
        "description": "Sent to campaign creator/admin on completion with delivery and engagement metrics.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/broadcasts",
        "action_label": "View Broadcast Report",
        "supports_subject": True
    },
    {
        "event_name": "workflow.failed",
        "template_key": "workflow_failed",
        "category": "Broadcast & Workflow",
        "name": "Workflow Run Execution Failure",
        "description": "Sent immediately to technical contact/admin when an automated workflow fails.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/automation/workflows",
        "action_label": "Review Workflow Error",
        "supports_subject": True
    },
    {
        "event_name": "report.daily_summary",
        "template_key": "daily_dashboard_summary",
        "category": "Reports",
        "name": "Daily Dashboard Summary (Morning Brief)",
        "description": "Sent every morning to workspace owner/manager with key performance metrics.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/dashboard",
        "action_label": "Open Daily Dashboard",
        "supports_subject": True
    },
    {
        "event_name": "report.weekly_performance",
        "template_key": "weekly_performance_report",
        "category": "Reports",
        "name": "Weekly Performance & Funnel Report",
        "description": "Sent weekly to owner/manager with funnel stats, agent metrics, and workflow performance.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/analytics",
        "action_label": "View Analytics Report",
        "supports_subject": True
    },
    {
        "event_name": "security.new_device_login",
        "template_key": "new_device_login",
        "category": "Security",
        "name": "New Device Login Security Alert",
        "description": "Sent when a login occurs from an unrecognized device, browser, or IP location.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/settings/security",
        "action_label": "Security Settings",
        "supports_subject": True
    },
    {
        "event_name": "security.2fa_enabled",
        "template_key": "2fa_enabled",
        "category": "Security",
        "name": "2FA Two-Factor Authentication Enabled",
        "description": "Sent when 2FA TOTP protection is turned on for an account.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/settings/security",
        "action_label": "Security Settings",
        "supports_subject": True
    },
    {
        "event_name": "security.2fa_disabled",
        "template_key": "2fa_disabled",
        "category": "Security",
        "name": "2FA Two-Factor Authentication Disabled",
        "description": "Sent when 2FA TOTP protection is turned off.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/settings/security",
        "action_label": "Security Settings",
        "supports_subject": True
    },
    {
        "event_name": "auth.otp_code",
        "template_key": "otp_code",
        "category": "Security",
        "name": "OTP Verification Code Email",
        "description": "Sent for passwordless login or 2FA verification.",
        "allowed_channels": ["email"],
        "action_route": "/login",
        "action_label": "Login",
        "supports_subject": True
    }
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'event_metadata' not in existing_tables:
        event_metadata_table = op.create_table(
            'event_metadata',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column('event_name', sa.String(length=100), nullable=False),
            sa.Column('template_key', sa.String(length=100), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('category', sa.String(length=100), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('allowed_channels', sa.JSON(), nullable=False, server_default='[]'),
            sa.Column('action_route', sa.String(length=255), nullable=True),
            sa.Column('action_label', sa.String(length=255), nullable=True),
            sa.Column('supports_subject', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('event_name', name='uq_event_metadata_event_name'),
            sa.UniqueConstraint('template_key', name='uq_event_metadata_template_key')
        )
        op.create_index('ix_event_metadata_event_name', 'event_metadata', ['event_name'])
        op.create_index('ix_event_metadata_template_key', 'event_metadata', ['template_key'])
        op.create_index('ix_event_metadata_category', 'event_metadata', ['category'])

        # Seed initial metadata rows
        rows_to_insert = []
        for r in INITIAL_METADATA_ROWS:
            rows_to_insert.append({
                "id": uuid.uuid4(),
                "event_name": r["event_name"],
                "template_key": r["template_key"],
                "name": r["name"],
                "category": r["category"],
                "description": r["description"],
                "allowed_channels": r["allowed_channels"],
                "action_route": r.get("action_route", "/dashboard"),
                "action_label": r.get("action_label", "Open Application"),
                "supports_subject": r.get("supports_subject", True),
                "is_active": True
            })
        
        op.bulk_insert(event_metadata_table, rows_to_insert)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'event_metadata' in existing_tables:
        op.drop_table('event_metadata')