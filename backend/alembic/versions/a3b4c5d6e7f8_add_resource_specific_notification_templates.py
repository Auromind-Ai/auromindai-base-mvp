"""add resource-specific notification templates for AI, WCC, and Flow

Revision ID: a3b4c5d6e7f8
Revises: z2a3b4c5d6e7
Create Date: 2026-08-20 16:15:00.000000

"""
import uuid
import json
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a3b4c5d6e7f8'
down_revision = 'z2a3b4c5d6e7'
branch_labels = None
depends_on = None

NEW_TEMPLATES = [
    # 1. AI Credits (Canonical templates with non-generic titles)
    {
        "category": "Payments & Credits",
        "template_key": "ai_credits_low_20",
        "name": "AI Credits Low (20% Balance Remaining)",
        "channel": "both",
        "title": "AI Credits Low (20% Remaining)",
        "subject": "Notice: 20% AI Credits Remaining for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has 20% remaining balance ({{remaining_balance}} credits). Recharge now to prevent AI agent pauses.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "ai_credits_low_10",
        "name": "AI Credits Low (10% Balance Remaining)",
        "channel": "both",
        "title": "Urgent: AI Credits Low (10% Remaining)",
        "subject": "[Urgent] Only 10% AI Credits Remaining for {{workspace_name}}",
        "message": "Warning: {{workspace_name}} has only 10% AI credits left ({{remaining_balance}} credits). Please recharge immediately.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "ai_credits_exhausted",
        "name": "AI Credits Exhausted (0% Balance)",
        "channel": "both",
        "title": "AI Credits Exhausted — Operations Paused",
        "subject": "[Important] AI Credits Exhausted for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has exhausted all available AI credits. Automated AI responses and campaign outbound messages are temporarily paused until recharged.",
        "is_active": True
    },

    # 2. WhatsApp / WCC Wallet
    {
        "category": "Payments & Credits",
        "template_key": "wcc_wallet_low_20",
        "name": "WhatsApp Wallet Low (20% Balance Remaining)",
        "channel": "both",
        "title": "WhatsApp Wallet Low (20% Remaining)",
        "subject": "Notice: 20% WhatsApp Wallet Balance Remaining for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has 20% remaining WhatsApp balance ({{remaining_balance}}). Recharge now to prevent message delivery pauses.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "wcc_wallet_low_10",
        "name": "WhatsApp Wallet Low (10% Balance Remaining)",
        "channel": "both",
        "title": "Urgent: WhatsApp Wallet Low (10% Remaining)",
        "subject": "[Urgent] Only 10% WhatsApp Wallet Balance Remaining for {{workspace_name}}",
        "message": "Warning: {{workspace_name}} has only 10% WhatsApp wallet balance left ({{remaining_balance}}). Please recharge immediately to prevent message delivery failures.",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "wcc_wallet_exhausted",
        "name": "WhatsApp Wallet Exhausted",
        "channel": "both",
        "title": "WhatsApp Wallet Exhausted — Outbound Messages Paused",
        "subject": "[Important] WhatsApp Wallet Exhausted for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has exhausted its WhatsApp wallet balance. Automated outbound WhatsApp messages and template delivery are temporarily paused until recharged.",
        "is_active": True
    },

    # 3. Flow Executions
    {
        "category": "Broadcast & Workflow",
        "template_key": "flow_executions_low_20",
        "name": "Flow Executions Low (20% Remaining)",
        "channel": "both",
        "title": "Flow Executions Low (20% Remaining)",
        "subject": "Notice: 20% Flow Executions Remaining for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has 20% remaining flow executions ({{remaining_quota}} of {{total_quota}} executions left). Upgrade or purchase a flow pack to keep automations running.",
        "is_active": True
    },
    {
        "category": "Broadcast & Workflow",
        "template_key": "flow_executions_low_10",
        "name": "Flow Executions Low (10% Remaining)",
        "channel": "both",
        "title": "Urgent: Flow Executions Low (10% Remaining)",
        "subject": "[Urgent] Only 10% Flow Executions Remaining for {{workspace_name}}",
        "message": "Warning: {{workspace_name}} has only 10% flow executions left ({{remaining_quota}} of {{total_quota}} executions left). Please purchase additional flow packs or upgrade your plan.",
        "is_active": True
    },
    {
        "category": "Broadcast & Workflow",
        "template_key": "flow_executions_exhausted",
        "name": "Flow Executions Exhausted",
        "channel": "both",
        "title": "Flow Executions Exhausted — Automations Paused",
        "subject": "[Important] Monthly Flow Executions Limit Reached for {{workspace_name}}",
        "message": "Hi {{user_name}},\n\nYour workspace {{workspace_name}} has exhausted its monthly flow execution quota ({{used_quota}}/{{total_quota}} executions used). Automation flow triggers are paused until quota resets or a flow pack is purchased.",
        "is_active": True
    },
]

NEW_RULES = [
    # AI Credits Canonical Rules
    {"event_name": "ai_credits.low_20", "template_key": "ai_credits_low_20", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "ai_credits.low_10", "template_key": "ai_credits_low_10", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "ai_credits.exhausted", "template_key": "ai_credits_exhausted", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},

    # WhatsApp / WCC Wallet Canonical Rules
    {"event_name": "wcc_wallet.low_20", "template_key": "wcc_wallet_low_20", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "wcc_wallet.low_10", "template_key": "wcc_wallet_low_10", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "wcc_wallet.exhausted", "template_key": "wcc_wallet_exhausted", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},

    # Flow Executions Canonical Rules
    {"event_name": "flow_executions.low_20", "template_key": "flow_executions_low_20", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "flow_executions.low_10", "template_key": "flow_executions_low_10", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
    {"event_name": "flow_executions.exhausted", "template_key": "flow_executions_exhausted", "recipient_roles": ["workspace_owner"], "channels": ["email", "in_app"], "delay_minutes": 0},
]

NEW_EVENT_METADATA = [
    {
        "event_name": "ai_credits.low_20",
        "template_key": "ai_credits_low_20",
        "name": "AI Credits Low 20%",
        "category": "Payments & Credits",
        "description": "Triggered when AI token balance drops to 20% remaining.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing/recharge",
        "action_label": "Recharge AI Credits",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "ai_credits.low_10",
        "template_key": "ai_credits_low_10",
        "name": "AI Credits Low 10%",
        "category": "Payments & Credits",
        "description": "Triggered when AI token balance drops to 10% remaining.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing/recharge",
        "action_label": "Recharge AI Credits",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "ai_credits.exhausted",
        "template_key": "ai_credits_exhausted",
        "name": "AI Credits Exhausted",
        "category": "Payments & Credits",
        "description": "Triggered when AI tokens are completely exhausted.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing/recharge",
        "action_label": "Recharge AI Credits",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "wcc_wallet.low_20",
        "template_key": "wcc_wallet_low_20",
        "name": "WhatsApp Wallet Low 20%",
        "category": "Payments & Credits",
        "description": "Triggered when WhatsApp wallet balance drops to 20% of included quota.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Recharge WhatsApp Wallet",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "wcc_wallet.low_10",
        "template_key": "wcc_wallet_low_10",
        "name": "WhatsApp Wallet Low 10%",
        "category": "Payments & Credits",
        "description": "Triggered when WhatsApp wallet balance drops to 10% of included quota.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Recharge WhatsApp Wallet",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "wcc_wallet.exhausted",
        "template_key": "wcc_wallet_exhausted",
        "name": "WhatsApp Wallet Exhausted",
        "category": "Payments & Credits",
        "description": "Triggered when WhatsApp wallet balance reaches zero.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Recharge WhatsApp Wallet",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "flow_executions.low_20",
        "template_key": "flow_executions_low_20",
        "name": "Flow Executions Low 20%",
        "category": "Broadcast & Workflow",
        "description": "Triggered when monthly flow executions have 20% remaining.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Buy Flow Packs / Upgrade",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "flow_executions.low_10",
        "template_key": "flow_executions_low_10",
        "name": "Flow Executions Low 10%",
        "category": "Broadcast & Workflow",
        "description": "Triggered when monthly flow executions have 10% remaining.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Buy Flow Packs / Upgrade",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "flow_executions.exhausted",
        "template_key": "flow_executions_exhausted",
        "name": "Flow Executions Exhausted",
        "category": "Broadcast & Workflow",
        "description": "Triggered when monthly flow executions quota is exhausted.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "Buy Flow Packs / Upgrade",
        "supports_subject": True,
        "is_active": True
    },
]


def upgrade():
    conn = op.get_bind()

    # 1. Update existing legacy templates to avoid generic "Credits Low" titles
    conn.execute(sa.text("""
        UPDATE notification_templates
        SET name = 'AI Credits Low (20% Balance Remaining)',
            title = 'AI Credits Low (20% Remaining)'
        WHERE template_key = 'credits_low_20';

        UPDATE notification_templates
        SET name = 'AI Credits Low (10% Balance Remaining)',
            title = 'Urgent: AI Credits Low (10% Remaining)'
        WHERE template_key = 'credits_low_10';

        UPDATE notification_templates
        SET name = 'AI Credits Exhausted (0% Balance)',
            title = 'AI Credits Exhausted — Operations Paused'
        WHERE template_key = 'credits_exhausted';
    """))

    # 2. Insert new templates
    for tpl in NEW_TEMPLATES:
        existing = conn.execute(sa.text(
            "SELECT id FROM notification_templates WHERE template_key = :k AND channel = :c"
        ), {"k": tpl["template_key"], "c": tpl["channel"]}).fetchone()

        if not existing:
            conn.execute(sa.text("""
                INSERT INTO notification_templates (id, category, template_key, name, channel, title, subject, message, is_active, created_at, updated_at)
                VALUES (:id, :category, :template_key, :name, :channel, :title, :subject, :message, :is_active, now(), now())
            """), {
                "id": str(uuid.uuid4()),
                "category": tpl["category"],
                "template_key": tpl["template_key"],
                "name": tpl["name"],
                "channel": tpl["channel"],
                "title": tpl["title"],
                "subject": tpl["subject"],
                "message": tpl["message"],
                "is_active": tpl["is_active"]
            })

    # 3. Insert new rules
    for rule in NEW_RULES:
        existing = conn.execute(sa.text(
            "SELECT id FROM notification_rules WHERE event_name = :e AND template_key = :k"
        ), {"e": rule["event_name"], "k": rule["template_key"]}).fetchone()

        if not existing:
            conn.execute(sa.text("""
                INSERT INTO notification_rules (id, event_name, template_key, recipient_roles, channels, conditions, delay_minutes, dedup_window_seconds, is_active, created_at, updated_at)
                VALUES (:id, :event_name, :template_key, :recipient_roles, :channels, :conditions, :delay_minutes, :dedup_window_seconds, :is_active, now(), now())
            """), {
                "id": str(uuid.uuid4()),
                "event_name": rule["event_name"],
                "template_key": rule["template_key"],
                "recipient_roles": json.dumps(rule["recipient_roles"]),
                "channels": json.dumps(rule["channels"]),
                "conditions": json.dumps({}),
                "delay_minutes": rule["delay_minutes"],
                "dedup_window_seconds": 86400,
                "is_active": True
            })

    # 4. Insert new event metadata
    for meta in NEW_EVENT_METADATA:
        existing = conn.execute(sa.text(
            "SELECT id FROM event_metadata WHERE event_name = :e"
        ), {"e": meta["event_name"]}).fetchone()

        if not existing:
            conn.execute(sa.text("""
                INSERT INTO event_metadata (id, event_name, template_key, name, category, description, allowed_channels, action_route, action_label, supports_subject, is_active, created_at, updated_at)
                VALUES (:id, :event_name, :template_key, :name, :category, :description, :allowed_channels, :action_route, :action_label, :supports_subject, :is_active, now(), now())
            """), {
                "id": str(uuid.uuid4()),
                "event_name": meta["event_name"],
                "template_key": meta["template_key"],
                "name": meta["name"],
                "category": meta["category"],
                "description": meta["description"],
                "allowed_channels": json.dumps(meta["allowed_channels"]),
                "action_route": meta["action_route"],
                "action_label": meta["action_label"],
                "supports_subject": meta["supports_subject"],
                "is_active": meta["is_active"]
            })


def downgrade():
    conn = op.get_bind()
    for tpl in NEW_TEMPLATES:
        conn.execute(sa.text("DELETE FROM notification_templates WHERE template_key = :k"), {"k": tpl["template_key"]})
    for rule in NEW_RULES:
        conn.execute(sa.text("DELETE FROM notification_rules WHERE event_name = :e"), {"e": rule["event_name"]})
    for meta in NEW_EVENT_METADATA:
        conn.execute(sa.text("DELETE FROM event_metadata WHERE event_name = :e"), {"e": meta["event_name"]})
