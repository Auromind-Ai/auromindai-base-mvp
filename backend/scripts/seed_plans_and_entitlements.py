import os
import sys
import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_plans")

# Database session resolver (works in Docker or local dev via port 5435)
def get_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        # Check if local docker port 5435 is accessible, else default
        db_url = "postgresql://postgres:Arunjack007%40@localhost:5435/auromindai"

    try:
        engine = create_engine(db_url)
        engine.connect()
    except Exception as e:
        logger.warning(f"Could not connect via {db_url}: {e}. Retrying on localhost:5435...")
        db_url = "postgresql://postgres:Arunjack007%40@localhost:5435/auromindai"
        engine = create_engine(db_url)

    Session = sessionmaker(bind=engine)
    return Session()


CANONICAL_PLANS = [
    {
        "key": "free",
        "name": "free",
        "display_name": "Free Forever",
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "description": "Forever free sandbox testing to build, test, and validate WhatsApp AI agent flows with no phone approval needed.",
        "display_order": 1,
        "is_featured": False,
        "is_active": True,
        "currency": "INR",
        "token_limit": 50000,
        "features": [
            "1 WhatsApp sandbox testing bot",
            "1 Team user seat included",
            "50 Contact leads & storage",
            "Single sandbox shared inbox",
            "Basic viewer CRM & pipeline",
            "Basic quick reply automations",
            "Standard Meta system templates",
            "50 Free AI test credits included",
            "Community & documentation support",
        ],
        "entitlements": {
            "included_ai_credits": 50,
            "included_wcc_wallet": Decimal("0.00"),
            "storage_limit_mb": 100,
            "team_limit": 1,
            "knowledge_base_limit": 5,
            "gmail_limit": 0,
            "lead_limit": 50,
            "meeting_limit": 5,
            "automation_limit": 20,
            "flow": 2,
            "allow_ai_topup": False,
            "allow_purchased_ai_usage": False,
            "allow_wcc_recharge": False,
            "allow_purchased_wcc_usage": False,
            "allow_flow_addon": False,
            "allow_purchased_flow_usage": False,
            "included_credit_reset_policy": "EXPIRE",
            "included_wallet_reset_policy": "EXPIRE",
            "feature_flags": {
                "has_rag": True,
                "has_leads": True,
                "has_gmail": False,
                "lead_enrichment": False,
                "lead_scoring": False,
                "monthly_conversations": 1000,
                "monthly_automation_triggers": 20,
                "crm_pipeline_tier": "basic_viewer",
                "flow_limit": 2,
                "allowed_channels": ["whatsapp"],
                "assistant_limit": 1,
                "tool_limit": 5,
                "template_limit": 5,
                "broadcast_tier": "none",
            },
        },
    },
    {
        "key": "creator",
        "name": "creator",
        "display_name": "Creator",
        "monthly_price": 999.0,
        "yearly_price": 11388.0,  # ₹949/mo
        "description": "Instagram sellers & social monetization with automated DMs, comments, and story replies.",
        "display_order": 2,
        "is_featured": False,
        "is_active": True,
        "currency": "INR",
        "token_limit": 15000000,
        "features": [
            "Instagram DM shared inbox (no WA / Twilio)",
            "2 user seats · 1 workspace",
            "1,000 Social Leads with enrichment",
            "Contact list view CRM",
            "DM & comment automated triggers",
            "Story mention auto-replies",
            "Manual 100/day broadcasts",
            "Brain Knowledge Base enabled",
            "Standard Creator quota · Email support",
        ],
        "entitlements": {
            "included_ai_credits": 15000,
            "included_wcc_wallet": Decimal("0.00"),
            "storage_limit_mb": 1024,
            "team_limit": 2,
            "knowledge_base_limit": 10,
            "gmail_limit": 1,
            "lead_limit": 1000,
            "meeting_limit": 20,
            "automation_limit": 1000,
            "flow": 100,
            "allow_ai_topup": True,
            "allow_purchased_ai_usage": True,
            "allow_wcc_recharge": False,
            "allow_purchased_wcc_usage": False,
            "allow_flow_addon": True,
            "allow_purchased_flow_usage": True,
            "included_credit_reset_policy": "EXPIRE",
            "included_wallet_reset_policy": "EXPIRE",
            "feature_flags": {
                "has_rag": True,
                "has_leads": True,
                "has_gmail": True,
                "lead_enrichment": True,
                "lead_scoring": False,
                "monthly_conversations": 10000,
                "monthly_automation_triggers": 1000,
                "crm_pipeline_tier": "contact_list",
                "flow_limit": 100,
                "allowed_channels": ["instagram"],
                "assistant_limit": 2,
                "tool_limit": 15,
                "template_limit": 10,
                "broadcast_tier": "manual_100_day",
            },
        },
    },
    {
        "key": "starter",
        "name": "starter",
        "display_name": "Starter",
        "monthly_price": 1299.0,
        "yearly_price": 14808.0,  # ₹1,234/mo
        "description": "Dedicated to small teams launching official WhatsApp bots with multi-agent inboxes and CRM.",
        "display_order": 3,
        "is_featured": False,
        "is_active": True,
        "currency": "INR",
        "token_limit": 25000000,
        "features": [
            "Dedicated WhatsApp Inbox (no Instagram / Twilio)",
            "3 User seats included",
            "2,500 Social & Manual Leads",
            "Single-stage board CRM",
            "AI Reply workflow automation",
            "Up to 15 Meta-approved templates",
            "Standard speed batch broadcasts",
            "Brain Knowledge Base enabled",
            "Pay-as-you-go wallet · Email support",
        ],
        "entitlements": {
            "included_ai_credits": 25000,
            "included_wcc_wallet": Decimal("0.00"),
            "storage_limit_mb": 2048,
            "team_limit": 3,
            "knowledge_base_limit": 25,
            "gmail_limit": 2,
            "lead_limit": 2500,
            "meeting_limit": 50,
            "automation_limit": 1000,
            "flow": 500,
            "allow_ai_topup": True,
            "allow_purchased_ai_usage": True,
            "allow_wcc_recharge": True,
            "allow_purchased_wcc_usage": True,
            "allow_flow_addon": True,
            "allow_purchased_flow_usage": True,
            "included_credit_reset_policy": "EXPIRE",
            "included_wallet_reset_policy": "EXPIRE",
            "feature_flags": {
                "has_rag": True,
                "has_leads": True,
                "has_gmail": True,
                "lead_enrichment": False,
                "lead_scoring": False,
                "monthly_conversations": 10000,
                "monthly_automation_triggers": 1000,
                "crm_pipeline_tier": "single_stage_board",
                "flow_limit": 500,
                "allowed_channels": ["whatsapp"],
                "assistant_limit": 2,
                "tool_limit": 30,
                "template_limit": 15,
                "broadcast_tier": "standard_batch",
            },
        },
    },
    {
        "key": "growth",
        "name": "growth",
        "display_name": "Growth",
        "monthly_price": 2499.0,
        "yearly_price": 28488.0,  # ₹2,374/mo
        "description": "Connects WhatsApp + Instagram with multi-stage CRM pipelines, bulk broadcasts, and Brain docs training.",
        "display_order": 4,
        "is_featured": False,
        "is_active": True,
        "currency": "INR",
        "token_limit": 100000000,
        "features": [
            "WhatsApp + Instagram Omnichannel Inbox",
            "5 User seats included",
            "10,000 Social & Manual Leads",
            "Advance Filtration CRM pipelines",
            "Multi-ADS conditional workflows",
            "Up to 50 Meta-approved templates",
            "High-volume scheduler broadcasts",
            "Brain training on 10 Docs / URLs",
            "₹500/mo AI credits · Priority chat support",
        ],
        "entitlements": {
            "included_ai_credits": 100000,
            "included_wcc_wallet": Decimal("500.00"),
            "storage_limit_mb": 5120,
            "team_limit": 5,
            "knowledge_base_limit": 50,
            "gmail_limit": 5,
            "lead_limit": 10000,
            "meeting_limit": 200,
            "automation_limit": 5000,
            "flow": 2000,
            "allow_ai_topup": True,
            "allow_purchased_ai_usage": True,
            "allow_wcc_recharge": True,
            "allow_purchased_wcc_usage": True,
            "allow_flow_addon": True,
            "allow_purchased_flow_usage": True,
            "included_credit_reset_policy": "EXPIRE",
            "included_wallet_reset_policy": "EXPIRE",
            "feature_flags": {
                "has_rag": True,
                "has_leads": True,
                "has_gmail": True,
                "lead_enrichment": True,
                "lead_scoring": False,
                "monthly_conversations": 100000,
                "monthly_automation_triggers": 5000,
                "crm_pipeline_tier": "advance_filtration",
                "flow_limit": 2000,
                "allowed_channels": ["whatsapp", "instagram"],
                "assistant_limit": 3,
                "tool_limit": 30,
                "template_limit": 50,
                "broadcast_tier": "high_volume_scheduler",
            },
        },
    },
    {
        "key": "business",
        "name": "business",
        "display_name": "Business",
        "monthly_price": 4999.0,
        "yearly_price": 56988.0,  # ₹4,749/mo
        "description": "Unrestricted access: unlimited Brain sync, 10 autonomous agents in AI Workspace, and ₹1,500 credits.",
        "display_order": 5,
        "is_featured": True,
        "is_active": True,
        "currency": "INR",
        "token_limit": 250000000,
        "features": [
            "OMNI INBOX (WhatsApp + Instagram + Twilio SMS/Voice)",
            "15 Included team seats (+Addon)",
            "35,000 Social & Manual leads",
            "Advance Filtration CRM with lead scoring",
            "Full event-driven AI flows",
            "Unlimited Meta-approved templates",
            "Priority queue throughput broadcasting",
            "Unlimited Sync & Vector DB Brain",
            "₹1,500/mo AI credits · Direct call rep",
        ],
        "entitlements": {
            "included_ai_credits": 250000,
            "included_wcc_wallet": Decimal("1500.00"),
            "storage_limit_mb": 20480,
            "team_limit": 15,
            "knowledge_base_limit": 200,
            "gmail_limit": 15,
            "lead_limit": 35000,
            "meeting_limit": 1000,
            "automation_limit": 10000,
            "flow": 10000,
            "allow_ai_topup": True,
            "allow_purchased_ai_usage": True,
            "allow_wcc_recharge": True,
            "allow_purchased_wcc_usage": True,
            "allow_flow_addon": True,
            "allow_purchased_flow_usage": True,
            "included_credit_reset_policy": "EXPIRE",
            "included_wallet_reset_policy": "EXPIRE",
            "feature_flags": {
                "has_rag": True,
                "has_leads": True,
                "has_gmail": True,
                "lead_enrichment": True,
                "lead_scoring": True,
                "monthly_conversations": 1000000,
                "monthly_automation_triggers": 10000,
                "crm_pipeline_tier": "lead_scoring",
                "flow_limit": 10000,
                "allowed_channels": ["whatsapp", "instagram", "twilio"],
                "assistant_limit": 6,
                "tool_limit": 60,
                "template_limit": -1,
                "drip_limit": 10,
                "broadcast_tier": "priority_queue",
            },
        },
    },
    {
        "key": "enterprise",
        "name": "enterprise",
        "display_name": "Enterprise",
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "description": "Dedicated TPS quotas, dedicated fine-tuned models, on-prem vector databases, and enterprise SLAs.",
        "display_order": 6,
        "is_featured": False,
        "is_active": True,
        "currency": "INR",
        "token_limit": 1000000000,
        "features": [
            "Enterprise omnichannel hub (WhatsApp, Instagram, Twilio)",
            "Unlimited custom seats & role scoping",
            "Unlimited custom lead storage",
            "Fully customizable CRM pipeline stages",
            "Custom webhook automations & pipelines",
            "Managed Meta template submissions",
            "Dedicated high-TPS broadcasting queue",
            "Private Vector & Live ERP integration",
            "24/7 SLA & dedicated engineer support",
        ],
        "entitlements": {
            "included_ai_credits": 500000,
            "included_wcc_wallet": Decimal("2500.00"),
            "storage_limit_mb": 102400,
            "team_limit": -1,
            "knowledge_base_limit": -1,
            "gmail_limit": -1,
            "lead_limit": -1,
            "meeting_limit": -1,
            "automation_limit": -1,
            "flow": -1,
            "allow_ai_topup": True,
            "allow_purchased_ai_usage": True,
            "allow_wcc_recharge": True,
            "allow_purchased_wcc_usage": True,
            "allow_flow_addon": True,
            "allow_purchased_flow_usage": True,
            "included_credit_reset_policy": "ROLLOVER",
            "included_wallet_reset_policy": "ROLLOVER",
            "feature_flags": {
                "has_rag": True,
                "has_leads": True,
                "has_gmail": True,
                "lead_enrichment": True,
                "lead_scoring": True,
                "monthly_conversations": -1,
                "monthly_automation_triggers": -1,
                "crm_pipeline_tier": "custom_stages",
                "flow_limit": -1,
                "allowed_channels": ["whatsapp", "instagram", "twilio"],
                "assistant_limit": -1,
                "tool_limit": -1,
                "template_limit": -1,
                "drip_limit": -1,
                "broadcast_tier": "dedicated_high_tps",
            },
        },
    },
]


def seed_plans_and_entitlements():
    from app.models.plan import Plan
    from app.models.plan_entitlement import PlanEntitlement

    db = get_session()
    try:
        logger.info("Starting Plan & Entitlement synchronization...")

        # 1. Deactivate legacy 'pro' plan from public catalog (keep for existing active subscriptions)
        pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
        if pro_plan:
            pro_plan.is_active = False
            pro_plan.display_order = 99
            logger.info("Deactivated legacy 'pro' plan from public catalog (order=99, is_active=False).")

        # 2. Upsert each Canonical Plan
        for plan_spec in CANONICAL_PLANS:
            plan_key = plan_spec["key"]
            ent_spec = plan_spec["entitlements"]

            plan = db.query(Plan).filter(Plan.name == plan_key).first()
            if not plan:
                plan = Plan(
                    id=uuid.uuid4(),
                    name=plan_key,
                    display_name=plan_spec["display_name"],
                    price=plan_spec["monthly_price"],
                    monthly_price=plan_spec["monthly_price"],
                    yearly_price=plan_spec["yearly_price"],
                    description=plan_spec["description"],
                    features=plan_spec["features"],
                    display_order=plan_spec["display_order"],
                    is_featured=plan_spec["is_featured"],
                    is_active=plan_spec["is_active"],
                    currency=plan_spec["currency"],
                    token_limit=plan_spec["token_limit"],
                )
                db.add(plan)
                db.flush()
                logger.info(f"Created new plan: {plan_key} ({plan.display_name})")
            else:
                # Update fields to canonical specification
                plan.display_name = plan_spec["display_name"]
                plan.price = plan_spec["monthly_price"]
                plan.monthly_price = plan_spec["monthly_price"]
                plan.yearly_price = plan_spec["yearly_price"]
                plan.description = plan_spec["description"]
                plan.features = plan_spec["features"]
                plan.display_order = plan_spec["display_order"]
                plan.is_featured = plan_spec["is_featured"]
                plan.is_active = plan_spec["is_active"]
                plan.currency = plan_spec["currency"]
                plan.token_limit = plan_spec["token_limit"]
                logger.info(f"Updated existing plan: {plan_key} ({plan.display_name})")

            # 3. Upsert PlanEntitlement
            entitlement = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan.id).first()
            if not entitlement:
                entitlement = PlanEntitlement(
                    id=uuid.uuid4(),
                    plan_id=plan.id,
                    included_ai_credits=ent_spec["included_ai_credits"],
                    included_wcc_wallet=ent_spec["included_wcc_wallet"],
                    storage_limit_mb=ent_spec["storage_limit_mb"],
                    team_limit=ent_spec["team_limit"],
                    knowledge_base_limit=ent_spec["knowledge_base_limit"],
                    gmail_limit=ent_spec["gmail_limit"],
                    lead_limit=ent_spec["lead_limit"],
                    meeting_limit=ent_spec["meeting_limit"],
                    automation_limit=ent_spec["automation_limit"],
                    flow=ent_spec["flow"],
                    allow_ai_topup=ent_spec["allow_ai_topup"],
                    allow_purchased_ai_usage=ent_spec["allow_purchased_ai_usage"],
                    allow_wcc_recharge=ent_spec["allow_wcc_recharge"],
                    allow_purchased_wcc_usage=ent_spec["allow_purchased_wcc_usage"],
                    allow_flow_addon=ent_spec["allow_flow_addon"],
                    allow_purchased_flow_usage=ent_spec["allow_purchased_flow_usage"],
                    included_credit_reset_policy=ent_spec["included_credit_reset_policy"],
                    included_wallet_reset_policy=ent_spec["included_wallet_reset_policy"],
                    feature_flags=ent_spec["feature_flags"],
                )
                db.add(entitlement)
                logger.info(f"Created entitlements for plan: {plan_key}")
            else:
                entitlement.included_ai_credits = ent_spec["included_ai_credits"]
                entitlement.included_wcc_wallet = ent_spec["included_wcc_wallet"]
                entitlement.storage_limit_mb = ent_spec["storage_limit_mb"]
                entitlement.team_limit = ent_spec["team_limit"]
                entitlement.knowledge_base_limit = ent_spec["knowledge_base_limit"]
                entitlement.gmail_limit = ent_spec["gmail_limit"]
                entitlement.lead_limit = ent_spec["lead_limit"]
                entitlement.meeting_limit = ent_spec["meeting_limit"]
                entitlement.automation_limit = ent_spec["automation_limit"]
                entitlement.flow = ent_spec["flow"]
                entitlement.allow_ai_topup = ent_spec["allow_ai_topup"]
                entitlement.allow_purchased_ai_usage = ent_spec["allow_purchased_ai_usage"]
                entitlement.allow_wcc_recharge = ent_spec["allow_wcc_recharge"]
                entitlement.allow_purchased_wcc_usage = ent_spec["allow_purchased_wcc_usage"]
                entitlement.allow_flow_addon = ent_spec["allow_flow_addon"]
                entitlement.allow_purchased_flow_usage = ent_spec["allow_purchased_flow_usage"]
                entitlement.included_credit_reset_policy = ent_spec["included_credit_reset_policy"]
                entitlement.included_wallet_reset_policy = ent_spec["included_wallet_reset_policy"]
                entitlement.feature_flags = ent_spec["feature_flags"]
                logger.info(f"Updated entitlements for plan: {plan_key}")

        db.commit()
        logger.info("Successfully committed all plans and entitlements!")

        # 4. Invalidate platform settings cache
        try:
            from app.services.platform_settings_service import clear_settings_cache
            clear_settings_cache()
            logger.info("Settings cache cleared.")
        except Exception as e:
            logger.warning(f"Could not clear settings cache: {e}")

        # 5. Print verification table
        print("\n================== VERIFIED DATABASE PLANS ==================")
        plans = db.query(Plan).order_by(Plan.display_order.asc()).all()
        for p in plans:
            ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == p.id).first()
            status = "ACTIVE" if p.is_active else "INACTIVE"
            print(f"[{p.display_order}] {p.name.upper():<12} | {p.display_name:<16} | ₹{p.monthly_price:>6}/mo | ₹{p.yearly_price:>7}/yr | {status}")
            if ent:
                print(f"     └─ Credits: {ent.included_ai_credits} | Team: {ent.team_limit} | Leads: {ent.lead_limit} | Flow: {ent.flow} | KB: {ent.knowledge_base_limit} | Channels: {ent.feature_flags.get('allowed_channels')}")
        print("=============================================================\n")

    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}", exc_info=True)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_plans_and_entitlements()
