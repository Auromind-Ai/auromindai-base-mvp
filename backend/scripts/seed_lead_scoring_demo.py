#!/usr/bin/env python3
"""
Script: seed_lead_scoring_demo.py
Description: Seeds realistic demo leads, conversations, customer messages,
             and custom lead scoring rules to test and showcase the Lead Scoring
             & AI Qualification feature in the CRM UI.

Usage:
    # Seed into first available workspace:
    python scripts/seed_lead_scoring_demo.py

    # Seed into a specific workspace:
    python scripts/seed_lead_scoring_demo.py --workspace-id <workspace_uuid>
"""

import os
import sys
import argparse
import uuid
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Fix DATABASE_URL for host Windows execution if needed before importing settings
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(backend_dir, ".env"))
except ImportError:
    pass

if "@db:5432" in os.environ.get("DATABASE_URL", ""):
    os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].replace("@db:5432", "@localhost:5435")
elif "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:Arunjack007%40@localhost:5435/auromindai"

from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.ai_action import Lead
from app.models.conversation import Conversation, ChannelType
from app.models.message import Message, SenderType
from app.models.lead_scoring_rule import LeadScoringSetting
from app.services.crm.lead_scoring_service import recalculate_lead_score


DEMO_CUSTOM_SIGNALS = [
    {
        "id": "bulk_enterprise",
        "name": "Enterprise Bulk Order",
        "examples": ["bulk order", "enterprise license", "wholesale", "500 users"],
        "points": 35,
        "enabled": True,
    },
    {
        "id": "urgent_need",
        "name": "Urgent Deployment",
        "examples": ["urgent", "asap", "immediately", "deadline"],
        "points": 25,
        "enabled": True,
    },
    {
        "id": "budget_quote",
        "name": "Budget & Pricing Quote",
        "examples": ["quotation", "price quote", "estimate", "pricing sheet"],
        "points": 20,
        "enabled": True,
    },
    {
        "id": "competitor_churn",
        "name": "Competitor Mention",
        "examples": ["competitor", "cheaper elsewhere", "switching from"],
        "points": -20,
        "enabled": True,
    },
]

DEMO_LEADS_DATA = [
    {
        "name": "Ramesh Sharma (Enterprise Hot Lead)",
        "phone": "919876543210",
        "source": "whatsapp",
        "message": "Hi, we want to place a bulk order for an enterprise license for 500 users. We need this urgent and asap. Please give us a callback.",
        "expected_tier": "Hot",
    },
    {
        "name": "Ananya Patel (Warm Inquiring Lead)",
        "phone": "919123456789",
        "source": "whatsapp",
        "message": "Please send an estimate for the project.",
        "expected_tier": "Warm",
    },
    {
        "name": "Suresh Kumar (Competitor Comparison)",
        "phone": "919345678901",
        "source": "whatsapp",
        "message": "Your product is too expensive and competitor is cheaper elsewhere, not interested.",
        "expected_tier": "Cold",
    },
    {
        "name": "Vague Visitor (Cold Lead)",
        "phone": "919456789012",
        "source": "web",
        "message": "ok thanks",
        "expected_tier": "Cold",
    },
]


from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker


def get_db_session(custom_db_url=None):
    """Provides a database session, automatically falling back to localhost:5435 if run on host outside Docker."""
    if custom_db_url:
        engine = create_engine(custom_db_url)
        return sessionmaker(bind=engine)()

    # 1. Try default SessionLocal
    try:
        session = SessionLocal()
        session.execute(text("SELECT 1"))
        return session
    except Exception as default_err:
        # 2. If 'db' hostname failed (running on host Windows machine), fallback to localhost:5435
        raw_url = os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:Arunjack007%40@localhost:5435/auromindai",
        )
        candidates = []
        if "@db:5432" in raw_url:
            candidates.append(raw_url.replace("@db:5432", "@localhost:5435"))
            candidates.append(raw_url.replace("@db:5432", "@localhost:5432"))
            candidates.append(raw_url.replace("@db:5432", "@127.0.0.1:5435"))
        else:
            candidates.append("postgresql://postgres:Arunjack007%40@localhost:5435/auromindai")

        for candidate in candidates:
            try:
                engine = create_engine(candidate)
                session = sessionmaker(bind=engine)()
                session.execute(text("SELECT 1"))
                print(f"[*] Connected to PostgreSQL via host: {candidate.split('@')[-1]}")
                return session
            except Exception:
                continue

        # If all candidates fail, raise original error
        raise default_err


def seed_demo_data(workspace_id=None, db_url=None):
    db = get_db_session(db_url)
    try:
        if workspace_id:
            ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        else:
            ws = db.query(Workspace).first()

        if not ws:
            print("[ERROR] No workspace found in database. Please create a workspace first.")
            return

        print(f"[*] Seeding demo data into workspace: {ws.name} ({ws.id})")

        # 1. Update / create Lead Scoring Setting
        setting = db.query(LeadScoringSetting).filter(LeadScoringSetting.workspace_id == ws.id).first()
        if not setting:
            setting = LeadScoringSetting(
                workspace_id=ws.id,
                ai_qualification_enabled=True,
                thresholds={"hot": 50, "warm": 30, "cold": 0},
                signals=DEMO_CUSTOM_SIGNALS,
            )
            db.add(setting)
        else:
            setting.ai_qualification_enabled = True
            setting.thresholds = {"hot": 50, "warm": 30, "cold": 0}
            setting.signals = DEMO_CUSTOM_SIGNALS
            setting.updated_at = datetime.now(timezone.utc)

        db.commit()
        print(f"  [+] Lead scoring rules configured (Hot >= 50, Warm 30-49, Cold 0-29)")
        print(f"  [+] Seeded {len(DEMO_CUSTOM_SIGNALS)} custom conversation signals")

        # 2. Seed Leads & Conversations
        created_leads = []
        for item in DEMO_LEADS_DATA:
            channel_enum = getattr(ChannelType, item["source"].upper(), ChannelType.WEB)

            existing_conv = (
                db.query(Conversation)
                .filter(
                    Conversation.workspace_id == ws.id,
                    Conversation.phone == item["phone"],
                    Conversation.channel == channel_enum,
                )
                .first()
            )

            if existing_conv:
                conv = existing_conv
                lead = db.query(Lead).filter(Lead.conversation_id == conv.id).first()
                if not lead:
                    lead = Lead(
                        id=uuid.uuid4(),
                        workspace_id=ws.id,
                        conversation_id=conv.id,
                        name=item["name"],
                        phone=item["phone"],
                        source=item["source"],
                        status="new",
                        score=0,
                    )
                    db.add(lead)
                    db.flush()
                else:
                    lead.name = item["name"]
            else:
                conv = Conversation(
                    id=uuid.uuid4(),
                    workspace_id=ws.id,
                    contact_name=item["name"],
                    phone=item["phone"],
                    channel=channel_enum,
                )
                db.add(conv)
                db.flush()

                lead = Lead(
                    id=uuid.uuid4(),
                    workspace_id=ws.id,
                    conversation_id=conv.id,
                    name=item["name"],
                    phone=item["phone"],
                    source=item["source"],
                    status="new",
                    score=0,
                )
                db.add(lead)
                db.flush()

            msg = Message(
                id=uuid.uuid4(),
                conversation_id=conv.id,
                sender_type=SenderType.USER,
                content=item["message"],
                timestamp=datetime.now(timezone.utc),
            )
            db.add(msg)
            db.commit()

            # Recalculate lead score immediately
            breakdown = recalculate_lead_score(lead, db, commit=True)
            created_leads.append((lead, breakdown, item["expected_tier"]))

        print("\n" + "=" * 65)
        print("  SEEDED LEADS & REALTIME QUALIFICATION RESULTS")
        print("=" * 65)
        for lead, breakdown, expected in created_leads:
            print(f"  Lead: {lead.name}")
            print(f"  Phone: {lead.phone} | Source: {lead.source}")
            print(f"  Score: {lead.score} / 100 | Tier: {lead.lead_tier.upper()} (Expected: {expected})")
            print(f"  Behavioral: {lead.behavioral_score} | Semantic Intent: {lead.semantic_intent_score}")
            print(f"  Signals Matched: {[k for k, v in (lead.intent_signals or {}).items() if isinstance(v, dict) and v.get('value')]}")
            print("-" * 65)

        print("\n[SUCCESS] Seeding complete! You can now view these leads in the CRM Preview tab.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo leads and scoring rules.")
    parser.add_argument("--workspace-id", help="Target workspace UUID (optional)")
    parser.add_argument("--db-url", help="Custom database URL (optional)")
    args = parser.parse_args()
    seed_demo_data(args.workspace_id, args.db_url)
