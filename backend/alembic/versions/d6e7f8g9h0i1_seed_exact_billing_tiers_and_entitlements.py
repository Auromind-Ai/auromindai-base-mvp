"""seed exact billing tiers for Free, Pro, Enterprise and remove solo plan

Revision ID: d6e7f8g9h0i1
Revises: c5d6e7f8g9h0
Create Date: 2026-08-21 18:30:00.000000=
"""
import uuid
import json
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd6e7f8g9h0i1'
down_revision = 'c5d6e7f8g9h0'
branch_labels = None
depends_on = None

PLANS_DATA = [
    {
        "name": "free",
        "display_name": "Free Starter",
        "price": 0.0,
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "display_order": 1,
        "is_featured": False,
        "description": "A controlled top-of-funnel acquisition tier.",
        "features": [
            "20,000 AI Credits / month",
            "₹50 WhatsApp Wallet (~45 messages)",
            "2 Flow Executions / month",
            "2 Active Automations",
            "5 Knowledge Base Documents",
            "100 MB Brain File Storage",
            "50 Leads & CRM",
            "10 Meetings / month",
            "1 Gmail Connection",
            "1 Team Member"
        ],
        "entitlements": {
            "included_ai_credits": 20000,
            "included_wcc_wallet": 50.00,
            "flow": 2,
            "automation_limit": 2,
            "knowledge_base_limit": 5,
            "storage_limit_mb": 100,
            "lead_limit": 50,
            "meeting_limit": 10,
            "gmail_limit": 1,
            "team_limit": 1,
            "allow_ai_topup": False,
            "allow_purchased_ai_usage": False,
            "allow_wcc_recharge": False,
            "allow_purchased_wcc_usage": False,
            "allow_flow_addon": False,
            "allow_purchased_flow_usage": False,
            "included_credit_reset_policy": "EXPIRE",
            "included_wallet_reset_policy": "EXPIRE",
            "feature_flags": {}
        }
    },
    {
        "name": "pro",
        "display_name": "Pro",
        "price": 199.0,
        "monthly_price": 199.0,
        "yearly_price": 999.0,
        "display_order": 2,
        "is_featured": True,
        "description": "Billed at ₹199 monthly or ₹999 annually (58% annual discount).",
        "features": [
            "250,000 AI Credits / month",
            "₹500 WhatsApp Wallet (~450 messages)",
            "10 Flow Executions / month",
            "50 Active Automations",
            "100 Knowledge Base Documents",
            "5 GB Brain File Storage",
            "100 Leads & CRM",
            "500 Meetings / month",
            "5 Gmail Connections",
            "10 Team Members",
            "AI Credit Top-ups Enabled",
            "WhatsApp Wallet Recharge Enabled",
            "Flow Pack Add-ons Enabled"
        ],
        "entitlements": {
            "included_ai_credits": 250000,
            "included_wcc_wallet": 500.00,
            "flow": 10,
            "automation_limit": 50,
            "knowledge_base_limit": 100,
            "storage_limit_mb": 5120,
            "lead_limit": 100,
            "meeting_limit": 500,
            "gmail_limit": 5,
            "team_limit": 10,
            "allow_ai_topup": True,
            "allow_purchased_ai_usage": True,
            "allow_wcc_recharge": True,
            "allow_purchased_wcc_usage": True,
            "allow_flow_addon": True,
            "allow_purchased_flow_usage": True,
            "included_credit_reset_policy": "EXPIRE",
            "included_wallet_reset_policy": "EXPIRE",
            "feature_flags": {}
        }
    },
    {
        "name": "enterprise",
        "display_name": "Enterprise",
        "price": 24999.0,
        "monthly_price": 24999.0,
        "yearly_price": 249990.0,
        "display_order": 3,
        "is_featured": False,
        "description": "For large-scale operations with dedicated infrastructure and unlimited limits.",
        "features": [
            "500,000 AI Credits / month",
            "₹500 WhatsApp Wallet",
            "Unlimited Flow Executions",
            "Unlimited Active Automations",
            "1,000 Knowledge Base Documents",
            "100 GB Brain File Storage",
            "Unlimited Leads & CRM",
            "Unlimited Meetings / month",
            "Unlimited Gmail Connections",
            "50 Team Members"
        ],
        "entitlements": {
            "included_ai_credits": 500000,
            "included_wcc_wallet": 500.00,
            "flow": -1,
            "automation_limit": -1,
            "knowledge_base_limit": 1000,
            "storage_limit_mb": 102400,
            "lead_limit": -1,
            "meeting_limit": -1,
            "gmail_limit": -1,
            "team_limit": 50,
            "allow_ai_topup": True,
            "allow_purchased_ai_usage": True,
            "allow_wcc_recharge": True,
            "allow_purchased_wcc_usage": True,
            "allow_flow_addon": True,
            "allow_purchased_flow_usage": True,
            "included_credit_reset_policy": "EXPIRE",
            "included_wallet_reset_policy": "EXPIRE",
            "feature_flags": {}
        }
    }
]


def upgrade():
    bind = op.get_bind()
    now_utc = datetime.now(timezone.utc)

    # 1. First, ensure 'pro' plan exists so we can migrate any 'solo' subscriptions
    pro_plan_id = None
    pro_row = bind.execute(sa.text("SELECT id FROM plans WHERE lower(name) = 'pro'")).fetchone()
    if pro_row:
        pro_plan_id = pro_row[0]
    else:
        pro_plan_id = uuid.uuid4()
        bind.execute(
            sa.text("""
                INSERT INTO plans (
                    id, name, display_name, price, monthly_price, yearly_price, currency, is_active, display_order, is_featured, created_at
                ) VALUES (
                    :id, 'pro', 'Pro', 199.0, 199.0, 999.0, 'INR', true, 2, true, :now
                )
            """),
            {"id": pro_plan_id, "now": now_utc}
        )

    # 2. Clean up 'solo' plan if it exists on the database
    solo_row = bind.execute(sa.text("SELECT id FROM plans WHERE lower(name) = 'solo'")).fetchone()
    if solo_row:
        solo_id = solo_row[0]
        # Re-link any subscriptions pointing to solo plan to pro plan
        bind.execute(
            sa.text("UPDATE subscriptions SET plan_id = :pro_id WHERE plan_id = :solo_id"),
            {"pro_id": pro_plan_id, "solo_id": solo_id}
        )
        # Delete solo entitlements
        bind.execute(sa.text("DELETE FROM plan_entitlements WHERE plan_id = :solo_id"), {"solo_id": solo_id})
        # Delete solo plan
        bind.execute(sa.text("DELETE FROM plans WHERE id = :solo_id"), {"solo_id": solo_id})

    # 3. Upsert Free, Pro, Enterprise plans and their entitlements
    for p in PLANS_DATA:
        plan_row = bind.execute(
            sa.text("SELECT id FROM plans WHERE lower(name) = :name"),
            {"name": p["name"]}
        ).fetchone()

        if not plan_row:
            plan_id = uuid.uuid4()
            bind.execute(
                sa.text("""
                    INSERT INTO plans (
                        id, name, display_name, price, monthly_price, yearly_price,
                        description, display_order, is_featured, currency, is_active, features, created_at
                    ) VALUES (
                        :id, :name, :display_name, :price, :monthly_price, :yearly_price,
                        :description, :display_order, :is_featured, 'INR', true, :features, :now
                    )
                """),
                {
                    "id": plan_id,
                    "name": p["name"],
                    "display_name": p["display_name"],
                    "price": p["price"],
                    "monthly_price": p["monthly_price"],
                    "yearly_price": p["yearly_price"],
                    "description": p["description"],
                    "display_order": p["display_order"],
                    "is_featured": p["is_featured"],
                    "features": json.dumps(p["features"]),
                    "now": now_utc
                }
            )
        else:
            plan_id = plan_row[0]
            bind.execute(
                sa.text("""
                    UPDATE plans SET
                        display_name = :display_name,
                        price = :price,
                        monthly_price = :monthly_price,
                        yearly_price = :yearly_price,
                        description = :description,
                        display_order = :display_order,
                        is_featured = :is_featured,
                        is_active = true,
                        features = :features
                    WHERE id = :id
                """),
                {
                    "id": plan_id,
                    "display_name": p["display_name"],
                    "price": p["price"],
                    "monthly_price": p["monthly_price"],
                    "yearly_price": p["yearly_price"],
                    "description": p["description"],
                    "display_order": p["display_order"],
                    "is_featured": p["is_featured"],
                    "features": json.dumps(p["features"])
                }
            )

        # Upsert PlanEntitlement
        ent = p["entitlements"]
        ent_row = bind.execute(
            sa.text("SELECT id FROM plan_entitlements WHERE plan_id = :plan_id"),
            {"plan_id": plan_id}
        ).fetchone()

        if not ent_row:
            bind.execute(
                sa.text("""
                    INSERT INTO plan_entitlements (
                        id, plan_id, included_ai_credits, included_wcc_wallet, storage_limit_mb,
                        team_limit, knowledge_base_limit, gmail_limit, lead_limit, meeting_limit,
                        automation_limit, flow, allow_ai_topup, allow_purchased_ai_usage,
                        allow_wcc_recharge, allow_purchased_wcc_usage, allow_flow_addon,
                        allow_purchased_flow_usage, included_credit_reset_policy,
                        included_wallet_reset_policy, feature_flags, created_at, updated_at
                    ) VALUES (
                        :id, :plan_id, :included_ai_credits, :included_wcc_wallet, :storage_limit_mb,
                        :team_limit, :knowledge_base_limit, :gmail_limit, :lead_limit, :meeting_limit,
                        :automation_limit, :flow, :allow_ai_topup, :allow_purchased_ai_usage,
                        :allow_wcc_recharge, :allow_purchased_wcc_usage, :allow_flow_addon,
                        :allow_purchased_flow_usage, :included_credit_reset_policy,
                        :included_wallet_reset_policy, :feature_flags, :now, :now
                    )
                """),
                {
                    "id": uuid.uuid4(),
                    "plan_id": plan_id,
                    "included_ai_credits": ent["included_ai_credits"],
                    "included_wcc_wallet": ent["included_wcc_wallet"],
                    "storage_limit_mb": ent["storage_limit_mb"],
                    "team_limit": ent["team_limit"],
                    "knowledge_base_limit": ent["knowledge_base_limit"],
                    "gmail_limit": ent["gmail_limit"],
                    "lead_limit": ent["lead_limit"],
                    "meeting_limit": ent["meeting_limit"],
                    "automation_limit": ent["automation_limit"],
                    "flow": ent["flow"],
                    "allow_ai_topup": ent["allow_ai_topup"],
                    "allow_purchased_ai_usage": ent["allow_purchased_ai_usage"],
                    "allow_wcc_recharge": ent["allow_wcc_recharge"],
                    "allow_purchased_wcc_usage": ent["allow_purchased_wcc_usage"],
                    "allow_flow_addon": ent["allow_flow_addon"],
                    "allow_purchased_flow_usage": ent["allow_purchased_flow_usage"],
                    "included_credit_reset_policy": ent["included_credit_reset_policy"],
                    "included_wallet_reset_policy": ent["included_wallet_reset_policy"],
                    "feature_flags": json.dumps(ent["feature_flags"]),
                    "now": now_utc
                }
            )
        else:
            bind.execute(
                sa.text("""
                    UPDATE plan_entitlements SET
                        included_ai_credits = :included_ai_credits,
                        included_wcc_wallet = :included_wcc_wallet,
                        storage_limit_mb = :storage_limit_mb,
                        team_limit = :team_limit,
                        knowledge_base_limit = :knowledge_base_limit,
                        gmail_limit = :gmail_limit,
                        lead_limit = :lead_limit,
                        meeting_limit = :meeting_limit,
                        automation_limit = :automation_limit,
                        flow = :flow,
                        allow_ai_topup = :allow_ai_topup,
                        allow_purchased_ai_usage = :allow_purchased_ai_usage,
                        allow_wcc_recharge = :allow_wcc_recharge,
                        allow_purchased_wcc_usage = :allow_purchased_wcc_usage,
                        allow_flow_addon = :allow_flow_addon,
                        allow_purchased_flow_usage = :allow_purchased_flow_usage,
                        included_credit_reset_policy = :included_credit_reset_policy,
                        included_wallet_reset_policy = :included_wallet_reset_policy,
                        feature_flags = :feature_flags,
                        updated_at = :now
                    WHERE plan_id = :plan_id
                """),
                {
                    "plan_id": plan_id,
                    "included_ai_credits": ent["included_ai_credits"],
                    "included_wcc_wallet": ent["included_wcc_wallet"],
                    "storage_limit_mb": ent["storage_limit_mb"],
                    "team_limit": ent["team_limit"],
                    "knowledge_base_limit": ent["knowledge_base_limit"],
                    "gmail_limit": ent["gmail_limit"],
                    "lead_limit": ent["lead_limit"],
                    "meeting_limit": ent["meeting_limit"],
                    "automation_limit": ent["automation_limit"],
                    "flow": ent["flow"],
                    "allow_ai_topup": ent["allow_ai_topup"],
                    "allow_purchased_ai_usage": ent["allow_purchased_ai_usage"],
                    "allow_wcc_recharge": ent["allow_wcc_recharge"],
                    "allow_purchased_wcc_usage": ent["allow_purchased_wcc_usage"],
                    "allow_flow_addon": ent["allow_flow_addon"],
                    "allow_purchased_flow_usage": ent["allow_purchased_flow_usage"],
                    "included_credit_reset_policy": ent["included_credit_reset_policy"],
                    "included_wallet_reset_policy": ent["included_wallet_reset_policy"],
                    "feature_flags": json.dumps(ent["feature_flags"]),
                    "now": now_utc
                }
            )


def downgrade():
    pass
