"""add payment.cancelled event template, rules, metadata, and payload schema

Revision ID: f9a0b1c2d3e4
Revises: e8f9a0b1c2d3, e2f3a4b5c6d7
Create Date: 2026-09-01 18:15:00.000000

"""
import uuid
import json
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f9a0b1c2d3e4'
down_revision = ('e8f9a0b1c2d3', 'e2f3a4b5c6d7')
branch_labels = None
depends_on = None

NEW_TEMPLATES = [
    {
        "category": "Payments & Credits",
        "template_key": "payment_cancelled",
        "name": "Payment Checkout Cancelled / Incomplete",
        "channel": "both",
        "title": "Subscription Upgrade Incomplete",
        "subject": "Did something go wrong with your Orbion Agents subscription?",
        "message": (
            "Hi {{user_name}},\n\n"
            "We noticed you started upgrading to {{plan_name}} but didn't finish the payment.\n\n"
            "Amount: {{amount}}\n"
            "Workspace: {{workspace_name}}\n\n"
            "If you encountered any issue or have questions about our plans, simply click below to resume your checkout or reach out to our team."
        ),
        "is_active": True
    }
]

NEW_RULES = [
    {
        "event_name": "payment.cancelled",
        "template_key": "payment_cancelled",
        "recipient_roles": ["workspace_owner", "billing_contact"],
        "channels": ["email", "in_app"],
        "delay_minutes": 0
    }
]

NEW_EVENT_METADATA = [
    {
        "event_name": "payment.cancelled",
        "template_key": "payment_cancelled",
        "name": "Payment Checkout Cancelled / Incomplete",
        "category": "Payments & Credits",
        "description": "Triggered when a user opens payment checkout modal and closes or cancels it without completing payment.",
        "allowed_channels": ["email", "in_app"],
        "action_route": "/user/admin/billing/payment",
        "action_label": "Resume Checkout",
        "supports_subject": True,
        "is_active": True
    }
]

NEW_PAYLOAD_SCHEMAS = [
    {
        "event_name": "payment.cancelled",
        "template_key": "payment_cancelled",
        "category": "Payments & Credits",
        "discovered_keys": ["action_label", "action_route", "amount", "email", "error_message", "plan_name", "user_name", "workspace_name"],
        "sample_payload": {
            "amount": "₹234.82 INR",
            "plan_name": "Starter Plan",
            "user_name": "Arun",
            "workspace_name": "Orbion Agents",
            "action_route": "/user/admin/billing/payment",
            "action_label": "Resume Checkout",
            "email": "user@orbionagents.com",
            "error_message": "Checkout window dismissed by user"
        }
    }
]


def upgrade():
    bind = op.get_bind()
    now_utc = datetime.now(timezone.utc)

    # 1. Insert or update Notification Templates
    for tpl in NEW_TEMPLATES:
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

    # 2. Insert or update Notification Rules
    for r in NEW_RULES:
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

    # 3. Insert or update Event Metadata
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
        else:
            bind.execute(
                sa.text("""
                    UPDATE event_metadata SET
                        name = :name,
                        category = :category,
                        description = :description,
                        allowed_channels = :allowed_channels,
                        action_route = :action_route,
                        action_label = :action_label,
                        supports_subject = :supports_subject,
                        is_active = :is_active,
                        updated_at = :now
                    WHERE template_key = :template_key OR event_name = :event_name
                """),
                {
                    "name": m["name"],
                    "category": m["category"],
                    "description": m["description"],
                    "allowed_channels": json.dumps(m["allowed_channels"]),
                    "action_route": m["action_route"],
                    "action_label": m["action_label"],
                    "supports_subject": m["supports_subject"],
                    "is_active": m["is_active"],
                    "template_key": m["template_key"],
                    "event_name": m["event_name"],
                    "now": now_utc
                }
            )

    # 4. Insert or update Event Payload Schemas
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


def downgrade():
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM notification_rules WHERE template_key = 'payment_cancelled' OR event_name = 'payment.cancelled'"))
    bind.execute(sa.text("DELETE FROM notification_templates WHERE template_key = 'payment_cancelled'"))
    bind.execute(sa.text("DELETE FROM event_metadata WHERE template_key = 'payment_cancelled' OR event_name = 'payment.cancelled'"))
    bind.execute(sa.text("DELETE FROM event_payload_schemas WHERE template_key = 'payment_cancelled' OR event_name = 'payment.cancelled'"))
