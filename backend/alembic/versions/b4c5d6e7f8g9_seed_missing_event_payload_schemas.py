"""seed missing event_payload_schemas and clean legacy duplicate templates

Revision ID: b4c5d6e7f8g9
Revises: a3b4c5d6e7f8, m1n2o3p4q5r6
Create Date: 2026-08-21 15:15:00.000000

"""
import uuid
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b4c5d6e7f8g9'
down_revision = ('a3b4c5d6e7f8', 'm1n2o3p4q5r6')
branch_labels = None
depends_on = None

RESOURCE_SPECIFIC_PAYLOAD_SCHEMAS = [
    # 1. AI Credits (Separate from WhatsApp & Flow)
    {
        "event_name": "ai_credits.low_20",
        "template_key": "ai_credits_low_20",
        "category": "Payments & Credits",
        "discovered_keys": ["remaining_balance", "resource_name", "used_amount", "recharge_url"],
        "sample_payload": {
            "resource_name": "AI Credits",
            "remaining_balance": "10,000",
            "used_amount": "40,000",
            "recharge_url": "/billing/recharge"
        }
    },
    {
        "event_name": "ai_credits.low_10",
        "template_key": "ai_credits_low_10",
        "category": "Payments & Credits",
        "discovered_keys": ["remaining_balance", "resource_name", "used_amount", "recharge_url"],
        "sample_payload": {
            "resource_name": "AI Credits",
            "remaining_balance": "5,000",
            "used_amount": "45,000",
            "recharge_url": "/billing/recharge"
        }
    },
    {
        "event_name": "ai_credits.exhausted",
        "template_key": "ai_credits_exhausted",
        "category": "Payments & Credits",
        "discovered_keys": ["affected_features", "remaining_balance", "resource_name", "used_amount", "recharge_url"],
        "sample_payload": {
            "resource_name": "AI Credits",
            "remaining_balance": "0",
            "used_amount": "50,000",
            "affected_features": "AI chat responses, automated bot messages, and outbound campaigns",
            "recharge_url": "/billing/recharge"
        }
    },

    # 2. WhatsApp / WCC Wallet (Separate from AI Credits & Flow)
    {
        "event_name": "wcc_wallet.low_20",
        "template_key": "wcc_wallet_low_20",
        "category": "Payments & Credits",
        "discovered_keys": ["current_balance", "remaining_balance", "resource_name", "recharge_url"],
        "sample_payload": {
            "resource_name": "WhatsApp Wallet",
            "remaining_balance": "₹100.00",
            "current_balance": "₹100.00",
            "recharge_url": "/billing"
        }
    },
    {
        "event_name": "wcc_wallet.low_10",
        "template_key": "wcc_wallet_low_10",
        "category": "Payments & Credits",
        "discovered_keys": ["current_balance", "remaining_balance", "resource_name", "recharge_url"],
        "sample_payload": {
            "resource_name": "WhatsApp Wallet",
            "remaining_balance": "₹50.00",
            "current_balance": "₹50.00",
            "recharge_url": "/billing"
        }
    },
    {
        "event_name": "wcc_wallet.exhausted",
        "template_key": "wcc_wallet_exhausted",
        "category": "Payments & Credits",
        "discovered_keys": ["affected_features", "current_balance", "remaining_balance", "resource_name", "recharge_url"],
        "sample_payload": {
            "resource_name": "WhatsApp Wallet",
            "remaining_balance": "₹0.00",
            "current_balance": "₹0.00",
            "affected_features": "Outbound WhatsApp messaging, template delivery, and bot notifications",
            "recharge_url": "/billing"
        }
    },

    # 3. Flow Executions (Separate from AI Credits & WhatsApp)
    {
        "event_name": "flow_executions.low_20",
        "template_key": "flow_executions_low_20",
        "category": "Broadcast & Workflow",
        "discovered_keys": ["remaining_quota", "resource_name", "total_quota", "used_quota"],
        "sample_payload": {
            "resource_name": "Flow Executions",
            "remaining_quota": "20",
            "total_quota": "100",
            "used_quota": "80"
        }
    },
    {
        "event_name": "flow_executions.low_10",
        "template_key": "flow_executions_low_10",
        "category": "Broadcast & Workflow",
        "discovered_keys": ["remaining_quota", "resource_name", "total_quota", "used_quota"],
        "sample_payload": {
            "resource_name": "Flow Executions",
            "remaining_quota": "10",
            "total_quota": "100",
            "used_quota": "90"
        }
    },
    {
        "event_name": "flow_executions.exhausted",
        "template_key": "flow_executions_exhausted",
        "category": "Broadcast & Workflow",
        "discovered_keys": ["affected_features", "remaining_quota", "resource_name", "total_quota", "used_quota"],
        "sample_payload": {
            "resource_name": "Flow Executions",
            "remaining_quota": "0",
            "total_quota": "100",
            "used_quota": "100",
            "affected_features": "Automated workflow execution and triggered bot actions"
        }
    },

    # 4. Subscription Expiry
    {
        "event_name": "subscription.expiring_7d",
        "template_key": "subscription_expiring_7d",
        "category": "Payments & Credits",
        "discovered_keys": ["expiry_date"],
        "sample_payload": {"expiry_date": "August 28, 2026"}
    },
    {
        "event_name": "subscription.expiring_3d",
        "template_key": "subscription_expiring_3d",
        "category": "Payments & Credits",
        "discovered_keys": ["expiry_date", "is_critical"],
        "sample_payload": {"expiry_date": "August 24, 2026", "is_critical": True}
    },

    # 5. Payments & Invoices
    {
        "event_name": "payment.succeeded",
        "template_key": "payment_success",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "invoice_id", "plan_name", "renewal_date"],
        "sample_payload": {
            "amount": "₹4,999",
            "invoice_id": "INV-2026-0818",
            "plan_name": "Pro Growth Plan",
            "renewal_date": "September 18, 2026"
        }
    },
    {
        "event_name": "credits.purchased",
        "template_key": "credit_purchase_success",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "credits_added", "current_balance", "invoice_id", "invoice_url"],
        "sample_payload": {
            "amount": "₹1,999",
            "credits_added": "500",
            "current_balance": "650",
            "invoice_id": "INV-2026-0819",
            "invoice_url": "/billing"
        }
    },
    {
        "event_name": "payment.failed",
        "template_key": "payment_failed",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "error_message", "is_critical", "service_impact_date"],
        "sample_payload": {
            "amount": "₹4,999",
            "error_message": "Card declined — Insufficient funds",
            "service_impact_date": "August 24, 2026",
            "is_critical": True
        }
    },
    {
        "event_name": "payment.failed_reminder_24h",
        "template_key": "payment_failed_reminder_24h",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "service_impact_date"],
        "sample_payload": {"amount": "₹4,999", "service_impact_date": "August 25, 2026"}
    },
    {
        "event_name": "payment.failed_reminder_72h",
        "template_key": "payment_failed_reminder_72h",
        "category": "Payments & Credits",
        "discovered_keys": ["amount", "service_cutoff_date"],
        "sample_payload": {"amount": "₹4,999", "service_cutoff_date": "August 27, 2026"}
    }
]


def upgrade() -> None:
    conn = op.get_bind()
    now_utc = datetime.now(timezone.utc)

    # 1. Clean up legacy duplicate templates (credits_low_20, credits_low_10, credits_exhausted)
    # These were replaced by ai_credits_low_20, ai_credits_low_10, ai_credits_exhausted
    conn.execute(sa.text("""
        DELETE FROM notification_rules WHERE template_key IN ('credits_low_20', 'credits_low_10', 'credits_exhausted');
        DELETE FROM notification_templates WHERE template_key IN ('credits_low_20', 'credits_low_10', 'credits_exhausted');
    """))

    # 2. Upsert payload schemas for all resource-specific events & templates
    import json
    for r in RESOURCE_SPECIFIC_PAYLOAD_SCHEMAS:
        existing = conn.execute(sa.text("""
            SELECT id, discovered_keys, sample_payload FROM event_payload_schemas 
            WHERE event_name = :e OR template_key = :t
        """), {"e": r["event_name"], "t": r["template_key"]}).fetchone()

        if existing:
            # Merge keys and samples
            existing_id = existing[0]
            existing_keys = set(existing[1] or []) if isinstance(existing[1], list) else set(json.loads(existing[1] or "[]"))
            existing_samples = dict(existing[2] or {}) if isinstance(existing[2], dict) else dict(json.loads(existing[2] or "{}"))
            
            existing_keys.update(r["discovered_keys"])
            existing_samples.update(r["sample_payload"])
            
            conn.execute(sa.text("""
                UPDATE event_payload_schemas
                SET discovered_keys = :keys,
                    sample_payload = :samples,
                    last_seen_at = :now,
                    category = :cat
                WHERE id = :id
            """), {
                "id": existing_id,
                "keys": json.dumps(sorted(list(existing_keys))),
                "samples": json.dumps(existing_samples),
                "now": now_utc,
                "cat": r["category"]
            })
        else:
            conn.execute(sa.text("""
                INSERT INTO event_payload_schemas (id, event_name, template_key, category, discovered_keys, sample_payload, last_seen_at)
                VALUES (:id, :event_name, :template_key, :category, :keys, :samples, :now)
            """), {
                "id": str(uuid.uuid4()),
                "event_name": r["event_name"],
                "template_key": r["template_key"],
                "category": r["category"],
                "keys": json.dumps(r["discovered_keys"]),
                "samples": json.dumps(r["sample_payload"]),
                "now": now_utc
            })


def downgrade() -> None:
    pass
