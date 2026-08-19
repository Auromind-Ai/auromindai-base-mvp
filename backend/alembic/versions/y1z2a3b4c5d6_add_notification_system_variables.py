"""add notification_system_variables table and baseline payload schemas

Revision ID: y1z2a3b4c5d6
Revises: x0y1z2a3b4c5
Create Date: 2026-08-19 12:00:00.000000

"""
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'y1z2a3b4c5d6'
down_revision = 'x0y1z2a3b4c5'
branch_labels = None
depends_on = None

INITIAL_SYSTEM_VARIABLES = [
    {
        "key": "user_name",
        "sample_value": "Jack",
        "description": "Recipient first or full name"
    },
    {
        "key": "workspace_name",
        "sample_value": "Demo Workspace",
        "description": "Active workspace tenant name"
    },
    {
        "key": "app_name",
        "sample_value": "Orbion Agents",
        "description": "Application platform brand name"
    },
    {
        "key": "email",
        "sample_value": "jack@example.com",
        "description": "Recipient email address"
    },
    {
        "key": "frontend_url",
        "sample_value": "http://localhost:3000",
        "description": "Frontend root URL"
    },
    {
        "key": "action_url",
        "sample_value": "http://localhost:3000/user/admin/dashboard",
        "description": "Call-to-action button destination URL (dynamically generated at runtime from action_route)"
    },
    {
        "key": "action_label",
        "sample_value": "Open Application",
        "description": "Call-to-action button text"
    },
    {
        "key": "action_route",
        "sample_value": "/dashboard",
        "description": "Canonical route path"
    }
]

INITIAL_BASELINE_PAYLOAD_SCHEMAS = [
    # User & Onboarding
    {
        "event_name": "user.signup",
        "template_key": "welcome_signup",
        "category": "User & Onboarding",
        "discovered_keys": ["credits", "plan_name"],
        "sample_payload": {"credits": "100", "plan_name": "Pro Growth Plan"}
    },
    {
        "event_name": "user.verification_pending",
        "template_key": "email_verification_pending",
        "category": "User & Onboarding",
        "discovered_keys": ["expires_in", "otp"],
        "sample_payload": {"expires_in": "10 minutes", "otp": "489201"}
    },
    {
        "event_name": "user.verification_reminder_24h",
        "template_key": "email_verification_reminder_24h",
        "category": "User & Onboarding",
        "discovered_keys": ["expires_in", "otp"],
        "sample_payload": {"expires_in": "24 hours", "otp": "489201"}
    },
    {
        "event_name": "plan.free_activated",
        "template_key": "free_plan_activated",
        "category": "User & Onboarding",
        "discovered_keys": ["credits", "plan_name"],
        "sample_payload": {"credits": "50", "plan_name": "Free Starter"}
    },
    {
        "event_name": "onboarding.inactivity_reminder",
        "template_key": "onboarding_inactivity",
        "category": "User & Onboarding",
        "discovered_keys": ["days_inactive", "suggested_action"],
        "sample_payload": {"days_inactive": "3", "suggested_action": "Connect your first channel or create an AI workflow"}
    },
    # Payments & Credits
    {
        "event_name": "payment.succeeded",
        "template_key": "payment_success",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "invoice_id", "plan_name", "renewal_date"],
        "sample_payload": {"amount": "₹4,999", "invoice_id": "INV-2026-0818", "plan_name": "Pro Growth Plan", "renewal_date": "September 18, 2026"}
    },
    {
        "event_name": "credits.purchased",
        "template_key": "credit_purchase_success",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "credits_added", "current_balance", "invoice_id"],
        "sample_payload": {"amount": "₹1,999", "credits_added": "500", "current_balance": "650", "invoice_id": "INV-2026-0819"}
    },
    {
        "event_name": "credits.low_20",
        "template_key": "credits_low_20",
        "category": "Payments & Credits",
        "discovered_keys": ["remaining_balance"],
        "sample_payload": {"remaining_balance": "100"}
    },
    {
        "event_name": "credits.low_10",
        "template_key": "credits_low_10",
        "category": "Payments & Credits",
        "discovered_keys": ["remaining_balance"],
        "sample_payload": {"remaining_balance": "50"}
    },
    {
        "event_name": "credits.exhausted",
        "template_key": "credits_exhausted",
        "category": "Payments & Credits",
        "discovered_keys": [],
        "sample_payload": {}
    },
    {
        "event_name": "payment.failed",
        "template_key": "payment_failed",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "error_message", "service_impact_date"],
        "sample_payload": {"amount": "₹4,999", "error_message": "Insufficient Card Funds", "service_impact_date": "August 22, 2026"}
    },
    {
        "event_name": "payment.failed_reminder_24h",
        "template_key": "payment_failed_reminder_24h",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "service_impact_date"],
        "sample_payload": {"amount": "₹4,999", "service_impact_date": "August 22, 2026"}
    },
    {
        "event_name": "payment.failed_reminder_72h",
        "template_key": "payment_failed_reminder_72h",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "service_cutoff_date"],
        "sample_payload": {"amount": "₹4,999", "service_cutoff_date": "August 24, 2026"}
    },
    {
        "event_name": "subscription.expiring_7d",
        "template_key": "subscription_expiring_7d",
        "category": "Payments & Credits",
        "discovered_keys": ["expiry_date"],
        "sample_payload": {"expiry_date": "August 26, 2026"}
    },
    {
        "event_name": "subscription.expiring_3d",
        "template_key": "subscription_expiring_3d",
        "category": "Payments & Credits",
        "discovered_keys": ["expiry_date"],
        "sample_payload": {"expiry_date": "August 22, 2026"}
    },
    # Lead Management
    {
        "event_name": "lead.created",
        "template_key": "lead_created",
        "category": "Lead Management",
        "discovered_keys": ["lead_name", "lead_phone", "lead_score", "lead_source"],
        "sample_payload": {"lead_name": "Acme Corp", "lead_phone": "+91 98765 43210", "lead_score": "75", "lead_source": "Website Widget"}
    },
    {
        "event_name": "lead.assigned",
        "template_key": "lead_assigned",
        "category": "Lead Management",
        "discovered_keys": ["assigned_by", "lead_name", "lead_phone"],
        "sample_payload": {"assigned_by": "System Admin", "lead_name": "Acme Corp", "lead_phone": "+91 98765 43210"}
    },
    {
        "event_name": "lead.sla_breached",
        "template_key": "lead_sla_breached",
        "category": "Lead Management",
        "discovered_keys": ["lead_name", "waiting_time_mins"],
        "sample_payload": {"lead_name": "Acme Corp", "waiting_time_mins": "25"}
    },
    {
        "event_name": "lead.message_received",
        "template_key": "lead_message_received",
        "category": "Lead Management",
        "discovered_keys": ["lead_name", "message_snippet"],
        "sample_payload": {"lead_name": "Acme Corp", "message_snippet": "Can you provide custom enterprise pricing?"}
    },
    {
        "event_name": "lead.high_intent",
        "template_key": "lead_high_intent",
        "category": "Lead Management",
        "discovered_keys": ["intent_signals", "lead_name", "lead_score"],
        "sample_payload": {"intent_signals": "Requested demo and pricing page visit", "lead_name": "Acme Corp", "lead_score": "92"}
    },
    {
        "event_name": "lead.converted",
        "template_key": "lead_converted",
        "category": "Lead Management",
        "discovered_keys": ["assigned_agent_name", "deal_value", "lead_name", "product_name", "source"],
        "sample_payload": {"assigned_agent_name": "Sarah Jenkins", "deal_value": "₹1,50,000", "lead_name": "Acme Corp", "product_name": "Enterprise Bot", "source": "Inbound Chat"}
    },
    {
        "event_name": "lead.inactive_reminder",
        "template_key": "lead_inactive_reminder",
        "category": "Lead Management",
        "discovered_keys": ["days_inactive", "lead_name", "suggested_action"],
        "sample_payload": {"days_inactive": "5", "lead_name": "Acme Corp", "suggested_action": "Send re-engagement discount offer"}
    },
    # Broadcast & Workflow
    {
        "event_name": "broadcast.completed",
        "template_key": "broadcast_completed",
        "category": "Broadcast & Workflow",
        "discovered_keys": ["broadcast_name", "delivered", "failed", "read", "total_sent"],
        "sample_payload": {"broadcast_name": "Diwali Offer Campaign", "delivered": "980", "failed": "20", "read": "740", "total_sent": "1000"}
    },
    {
        "event_name": "workflow.failed",
        "template_key": "workflow_failed",
        "category": "Broadcast & Workflow",
        "discovered_keys": ["error_message", "node_name", "workflow_name"],
        "sample_payload": {"error_message": "HTTP 500 API Gateway Timeout", "node_name": "Send WhatsApp Message Node", "workflow_name": "Lead Qualification Flow"}
    },
    # Reports
    {
        "event_name": "report.daily_summary",
        "template_key": "daily_dashboard_summary",
        "category": "Reports",
        "discovered_keys": ["conversions", "credit_balance", "date", "new_leads", "revenue", "unanswered_messages"],
        "sample_payload": {"conversions": "12", "credit_balance": "850", "date": "August 19, 2026", "new_leads": "48", "revenue": "₹58,000", "unanswered_messages": "3"}
    },
    {
        "event_name": "report.weekly_performance",
        "template_key": "weekly_performance_report",
        "category": "Reports",
        "discovered_keys": ["active_workflows", "funnel_stats", "top_agents", "week_range"],
        "sample_payload": {"active_workflows": "8", "funnel_stats": "320 Visitors -> 45 Leads -> 12 Converted (26.6%)", "top_agents": "Sarah Jenkins (7 deals), Jack (5 deals)", "week_range": "Aug 12 - Aug 18, 2026"}
    },
    # Security
    {
        "event_name": "security.new_device_login",
        "template_key": "new_device_login",
        "category": "Security",
        "discovered_keys": ["device", "ip_address", "location", "login_time"],
        "sample_payload": {"device": "Chrome on macOS", "ip_address": "192.168.1.100", "location": "San Francisco, US", "login_time": "Aug 19, 2026, 11:30 AM UTC"}
    },
    {
        "event_name": "security.2fa_enabled",
        "template_key": "2fa_enabled",
        "category": "Security",
        "discovered_keys": [],
        "sample_payload": {}
    },
    {
        "event_name": "security.2fa_disabled",
        "template_key": "2fa_disabled",
        "category": "Security",
        "discovered_keys": ["login_time"],
        "sample_payload": {"login_time": "Aug 19, 2026, 11:35 AM UTC"}
    },
    {
        "event_name": "auth.otp_code",
        "template_key": "otp_code",
        "category": "Security",
        "discovered_keys": ["auth_type", "otp"],
        "sample_payload": {"auth_type": "Login", "otp": "489201"}
    }
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Create notification_system_variables table
    if 'notification_system_variables' not in existing_tables:
        sys_var_table = op.create_table(
            'notification_system_variables',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
            sa.Column('key', sa.String(length=100), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('sample_value', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('key', name='uq_notification_system_variables_key')
        )
        op.create_index('ix_notification_system_variables_key', 'notification_system_variables', ['key'])

        # Seed system variables
        rows_to_insert = [
            {
                "id": uuid.uuid4(),
                "key": r["key"],
                "description": r["description"],
                "sample_value": r["sample_value"],
                "is_active": True
            }
            for r in INITIAL_SYSTEM_VARIABLES
        ]
        op.bulk_insert(sys_var_table, rows_to_insert)

    # 2. Seed baseline event_payload_schemas if table exists
    if 'event_payload_schemas' in existing_tables:
        payload_schema_table = sa.table(
            'event_payload_schemas',
            sa.column('id', postgresql.UUID(as_uuid=True)),
            sa.column('event_name', sa.String),
            sa.column('template_key', sa.String),
            sa.column('category', sa.String),
            sa.column('discovered_keys', sa.JSON),
            sa.column('sample_payload', sa.JSON),
            sa.column('last_seen_at', sa.DateTime(timezone=True))
        )
        
        from datetime import datetime, timezone
        now_utc = datetime.now(timezone.utc)

        schema_rows = [
            {
                "id": uuid.uuid4(),
                "event_name": r["event_name"],
                "template_key": r["template_key"],
                "category": r["category"],
                "discovered_keys": r["discovered_keys"],
                "sample_payload": r["sample_payload"],
                "last_seen_at": now_utc
            }
            for r in INITIAL_BASELINE_PAYLOAD_SCHEMAS
        ]
        op.bulk_insert(payload_schema_table, schema_rows)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'notification_system_variables' in existing_tables:
        op.drop_table('notification_system_variables')
