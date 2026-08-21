"""seed resource purchase success templates and rules for AI, WCC, and Flow packs

Revision ID: c5d6e7f8g9h0
Revises: b4c5d6e7f8g9
Create Date: 2026-08-21 18:25:00.000000

"""
import uuid
import json
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c5d6e7f8g9h0'
down_revision = 'b4c5d6e7f8g9'
branch_labels = None
depends_on = None

NEW_PURCHASE_TEMPLATES = [
    {
        "category": "Payments & Credits",
        "template_key": "ai_credits_purchase_success",
        "name": "AI Credits Purchase Confirmation",
        "channel": "both",
        "title": "AI Credits Added Successfully",
        "subject": "AI Credits Confirmed: {{credits_added}} Credits Added",
        "message": "Hi {{user_name}},\n\nYour purchase of {{credits_added}} AI Credits (Amount: {{amount}}) for {{workspace_name}} was successful.\n\nCurrent Available Balance: {{current_balance}} AI Credits\nInvoice ID: {{invoice_id}}",
        "is_active": True
    },
    {
        "category": "Payments & Credits",
        "template_key": "wcc_wallet_recharge_success",
        "name": "WhatsApp Wallet Recharge Confirmation",
        "channel": "both",
        "title": "WhatsApp Wallet Recharged Successfully",
        "subject": "WhatsApp Recharge Confirmed: {{amount_added}} Added",
        "message": "Hi {{user_name}},\n\nYour WhatsApp Wallet recharge of {{amount_added}} (Amount: {{amount}}) for {{workspace_name}} was successful.\n\nCurrent Available Balance: {{current_balance}}\nInvoice ID: {{invoice_id}}",
        "is_active": True
    },
    {
        "category": "Broadcast & Workflow",
        "template_key": "flow_pack_purchase_success",
        "name": "Flow Pack Purchase Confirmation",
        "channel": "both",
        "title": "Flow Packs Added Successfully",
        "subject": "Flow Pack Confirmed: {{flows_added}} Flows Added",
        "message": "Hi {{user_name}},\n\nYour purchase of {{flows_added}} Flow Executions (Amount: {{amount}}) for {{workspace_name}} was successful.\n\nCurrent Available Balance: {{current_balance}}\nTotal Monthly Quota: {{total_quota}}\nInvoice ID: {{invoice_id}}",
        "is_active": True
    }
]

NEW_PURCHASE_RULES = [
    {
        "event_name": "ai_credits.purchased",
        "template_key": "ai_credits_purchase_success",
        "recipient_roles": ["workspace_owner", "billing_contact"],
        "channels": ["email", "in_app"],
        "delay_minutes": 0
    },
    {
        "event_name": "wcc_wallet.recharged",
        "template_key": "wcc_wallet_recharge_success",
        "recipient_roles": ["workspace_owner", "billing_contact"],
        "channels": ["email", "in_app"],
        "delay_minutes": 0
    },
    {
        "event_name": "flow_pack.purchased",
        "template_key": "flow_pack_purchase_success",
        "recipient_roles": ["workspace_owner", "billing_contact"],
        "channels": ["email", "in_app"],
        "delay_minutes": 0
    }
]

NEW_EVENT_METADATA = [
    {
        "event_name": "ai_credits.purchased",
        "template_key": "ai_credits_purchase_success",
        "name": "AI Credits Purchase Confirmation",
        "category": "Payments & Credits",
        "description": "Event contract for AI Credits Purchase Confirmation",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "View Invoices",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "wcc_wallet.recharged",
        "template_key": "wcc_wallet_recharge_success",
        "name": "WhatsApp Wallet Recharge Confirmation",
        "category": "Payments & Credits",
        "description": "Event contract for WhatsApp Wallet Recharge Confirmation",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "View Invoices",
        "supports_subject": True,
        "is_active": True
    },
    {
        "event_name": "flow_pack.purchased",
        "template_key": "flow_pack_purchase_success",
        "name": "Flow Pack Purchase Confirmation",
        "category": "Broadcast & Workflow",
        "description": "Event contract for Flow Pack Purchase Confirmation",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/billing",
        "action_label": "View Invoices",
        "supports_subject": True,
        "is_active": True
    }
]

NEW_PAYLOAD_SCHEMAS = [
    {
        "event_name": "ai_credits.purchased",
        "template_key": "ai_credits_purchase_success",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "credits_added", "current_balance", "invoice_id", "invoice_url"],
        "sample_payload": {
            "amount": "₹1,999.00 INR (incl. GST)",
            "credits_added": "50,000",
            "current_balance": "65,000",
            "invoice_id": "INV-2026-0819",
            "invoice_url": "/billing"
        }
    },
    {
        "event_name": "wcc_wallet.recharged",
        "template_key": "wcc_wallet_recharge_success",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "amount_added", "current_balance", "invoice_id", "invoice_url"],
        "sample_payload": {
            "amount": "₹590.00 INR (incl. GST)",
            "amount_added": "₹500.00",
            "current_balance": "₹750.00",
            "invoice_id": "INV-2026-0820",
            "invoice_url": "/billing"
        }
    },
    {
        "event_name": "flow_pack.purchased",
        "template_key": "flow_pack_purchase_success",
        "category": "Broadcast & Workflow",
        "discovered_keys": ["amount", "current_balance", "flows_added", "invoice_id", "invoice_url", "total_quota"],
        "sample_payload": {
            "amount": "₹1,060.82 INR (incl. GST)",
            "flows_added": "5",
            "current_balance": "15 Flow Executions",
            "total_quota": "15 Flow Executions",
            "invoice_id": "INV-2026-0821",
            "invoice_url": "/billing"
        }
    }
]


def upgrade():
    bind = op.get_bind()
    now_utc = datetime.now(timezone.utc)

    # 1. Clean legacy duplicate templates and rules
    legacy_keys = ["credit_purchase_success", "credits_low_20", "credits_low_10", "credits_exhausted"]
    for k in legacy_keys:
        bind.execute(sa.text(f"DELETE FROM notification_rules WHERE template_key = '{k}'"))
        bind.execute(sa.text(f"DELETE FROM notification_templates WHERE template_key = '{k}'"))
        bind.execute(sa.text(f"DELETE FROM event_metadata WHERE template_key = '{k}'"))
        bind.execute(sa.text(f"DELETE FROM event_payload_schemas WHERE template_key = '{k}'"))

    # 2. Insert or update Notification Templates
    for tpl in NEW_PURCHASE_TEMPLATES:
        exists = bind.execute(
            sa.text("SELECT id FROM notification_templates WHERE template_key = :k AND channel = :c"),
            {"k": tpl["template_key"], "c": tpl["channel"]}
        ).fetchone()

        if not exists:
            bind.execute(
                sa.text("""
                    INSERT INTO notification_templates (
                        id, category, template_key, name, channel, title, subject, message, is_active, created_at, updated_at
                    ) VALUES (
                        :id, :category, :template_key, :name, :channel, :title, :subject, :message, :is_active, :now, :now
                    )
                """),
                {
                    "id": str(uuid.uuid4()),
                    "category": tpl["category"],
                    "template_key": tpl["template_key"],
                    "name": tpl["name"],
                    "channel": tpl["channel"],
                    "title": tpl["title"],
                    "subject": tpl["subject"],
                    "message": tpl["message"],
                    "is_active": tpl["is_active"],
                    "now": now_utc
                }
            )
        else:
            bind.execute(
                sa.text("""
                    UPDATE notification_templates SET
                        name = :name,
                        title = :title,
                        subject = :subject,
                        message = :message,
                        category = :category,
                        is_active = :is_active,
                        updated_at = :now
                    WHERE template_key = :template_key AND channel = :channel
                """),
                {
                    "name": tpl["name"],
                    "title": tpl["title"],
                    "subject": tpl["subject"],
                    "message": tpl["message"],
                    "category": tpl["category"],
                    "is_active": tpl["is_active"],
                    "template_key": tpl["template_key"],
                    "channel": tpl["channel"],
                    "now": now_utc
                }
            )

    # 3. Insert or update Notification Rules
    for r in NEW_PURCHASE_RULES:
        exists = bind.execute(
            sa.text("SELECT id FROM notification_rules WHERE event_name = :e AND template_key = :k"),
            {"e": r["event_name"], "k": r["template_key"]}
        ).fetchone()

        if not exists:
            bind.execute(
                sa.text("""
                    INSERT INTO notification_rules (
                        id, event_name, template_key, recipient_roles, channels, delay_minutes, is_active, created_at, updated_at
                    ) VALUES (
                        :id, :event_name, :template_key, :recipient_roles, :channels, :delay_minutes, true, :now, :now
                    )
                """),
                {
                    "id": str(uuid.uuid4()),
                    "event_name": r["event_name"],
                    "template_key": r["template_key"],
                    "recipient_roles": json.dumps(r["recipient_roles"]),
                    "channels": json.dumps(r["channels"]),
                    "delay_minutes": r["delay_minutes"],
                    "now": now_utc
                }
            )

    # 4. Insert or update Event Metadata
    for m in NEW_EVENT_METADATA:
        exists = bind.execute(
            sa.text("SELECT id FROM event_metadata WHERE template_key = :k OR event_name = :e"),
            {"k": m["template_key"], "e": m["event_name"]}
        ).fetchone()

        if not exists:
            bind.execute(
                sa.text("""
                    INSERT INTO event_metadata (
                        id, event_name, template_key, name, category, description, allowed_channels, action_route, action_label, supports_subject, is_active, created_at, updated_at
                    ) VALUES (
                        :id, :event_name, :template_key, :name, :category, :description, :allowed_channels, :action_route, :action_label, :supports_subject, :is_active, :now, :now
                    )
                """),
                {
                    "id": str(uuid.uuid4()),
                    "event_name": m["event_name"],
                    "template_key": m["template_key"],
                    "name": m["name"],
                    "category": m["category"],
                    "description": m["description"],
                    "allowed_channels": json.dumps(m["allowed_channels"]),
                    "action_route": m["action_route"],
                    "action_label": m["action_label"],
                    "supports_subject": m["supports_subject"],
                    "is_active": m["is_active"],
                    "now": now_utc
                }
            )

    # 5. Insert or update Event Payload Schemas
    for s in NEW_PAYLOAD_SCHEMAS:
        exists = bind.execute(
            sa.text("SELECT id FROM event_payload_schemas WHERE template_key = :k OR event_name = :e"),
            {"k": s["template_key"], "e": s["event_name"]}
        ).fetchone()

        if not exists:
            bind.execute(
                sa.text("""
                    INSERT INTO event_payload_schemas (
                        id, event_name, template_key, category, discovered_keys, sample_payload, last_seen_at
                    ) VALUES (
                        :id, :event_name, :template_key, :category, :discovered_keys, :sample_payload, :now
                    )
                """),
                {
                    "id": str(uuid.uuid4()),
                    "event_name": s["event_name"],
                    "template_key": s["template_key"],
                    "category": s["category"],
                    "discovered_keys": json.dumps(s["discovered_keys"]),
                    "sample_payload": json.dumps(s["sample_payload"]),
                    "now": now_utc
                }
            )
        else:
            bind.execute(
                sa.text("""
                    UPDATE event_payload_schemas SET
                        discovered_keys = :discovered_keys,
                        sample_payload = :sample_payload,
                        category = :category,
                        last_seen_at = :now
                    WHERE template_key = :template_key OR event_name = :event_name
                """),
                {
                    "discovered_keys": json.dumps(s["discovered_keys"]),
                    "sample_payload": json.dumps(s["sample_payload"]),
                    "category": s["category"],
                    "template_key": s["template_key"],
                    "event_name": s["event_name"],
                    "now": now_utc
                }
            )

    # 6. Migrate and clean solo plan
    try:
        pro_plan_row = bind.execute(sa.text("SELECT id FROM plans WHERE lower(name) = 'pro'")).fetchone()
        solo_plan_row = bind.execute(sa.text("SELECT id FROM plans WHERE lower(name) = 'solo'")).fetchone()
        if pro_plan_row and solo_plan_row:
            bind.execute(
                sa.text("UPDATE subscriptions SET plan_id = :pro_id WHERE plan_id = :solo_id"),
                {"pro_id": pro_plan_row[0], "solo_id": solo_plan_row[0]}
            )
            bind.execute(sa.text("DELETE FROM plan_entitlements WHERE plan_id = :solo_id"), {"solo_id": solo_plan_row[0]})
            bind.execute(sa.text("DELETE FROM plans WHERE id = :solo_id"), {"solo_id": solo_plan_row[0]})
    except Exception:
        pass


def downgrade():
    pass
