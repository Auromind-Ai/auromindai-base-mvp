#!/usr/bin/env python3
"""
Seed script: Generates high-quality, realistic leads up to exactly 1,000 total leads
for the active workspace in Auromind AI CRM.
"""
import os
import sys
import uuid
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

# Path setup
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.user import User
from app.models.ai_action import Lead
from app.models.conversation import Conversation, ChannelType, ConversationStatus
from app.models.message import Message, SenderType, MessageStatus
from app.models.lead_scoring import LeadScoreHistory

FIRST_NAMES = [
    "Aarav", "Aditi", "Ananya", "Arjun", "Bala", "Chandran", "Deepika", "Divya",
    "Ganesh", "Harish", "Ishaan", "Jayaram", "Karthik", "Kavitha", "Keerthi",
    "Lakshmi", "Madhavan", "Meenakshi", "Naveen", "Nithya", "Parthiban", "Pooja",
    "Pradeep", "Priya", "Rahul", "Rajesh", "Ramesh", "Rithika", "Rohit", "Sanjeev",
    "Saravanan", "Shalini", "Siddharth", "Sneha", "Subhash", "Sudha", "Suresh",
    "Surya", "Swathi", "Tarun", "Uma", "Vaishnavi", "Varun", "Venkatesh", "Vignesh",
    "Vijay", "Vimal", "Vinoth", "Vivek", "Yuvan", "Abhishek", "Ashwin", "Bhuvana",
    "Chezhiyan", "Dharani", "Gayathri", "Hemant", "Jagadeesh", "Kalaiarasan",
    "Lavanya", "Manikandan", "Nandhini", "Pavithra", "Revathi", "Sathish"
]

LAST_NAMES = [
    "Kumar", "Sharma", "Patel", "Iyer", "Sundaram", "Nair", "Reddy", "Rajan",
    "Krishnan", "Murugan", "Pillai", "Verma", "Gupta", "Singh", "Menon", "Joshi",
    "Pandian", "Bhat", "Deshmukh", "Agarwal", "Varma", "Mishra", "Balaji",
    "Raghavan", "Kulkarni", "Mani", "Shah", "Sengupta", "Mukherjee", "Dutta",
    "Chauhan", "Kapoor", "Bose", "Acharya", "Nambiar", "Sankar", "Prabhakar",
    "Chandrasekhar", "Venkataraman", "Subramanian"
]

COMPANY_PREFIXES = [
    "Apex", "Zenith", "Surya", "Meenakshi", "BlueWave", "Prime", "Vasantham",
    "Bright", "Evergreen", "Omni", "Kaizen", "Sri Murugan", "NextGen", "Green Valley",
    "Royal", "Aura", "Prestige", "Velan", "Southern", "Titan", "Pinnacle", "Nexus",
    "Global", "Horizon", "Crown", "Trident", "Lotus", "Pioneer", "Metro", "Cosmos"
]

COMPANY_SUFFIXES = [
    "Technologies", "Retailers", "Textiles", "Infotech", "Logistics", "Dental Clinic",
    "Fitness Studio", "Real Estate", "Supermarket", "Consulting", "Solutions",
    "Enterprises", "Automations", "Industries", "Healthcare", "Motors", "Jewellers",
    "Communications", "Exports", "Labs", "Digital", "Organics", "Media", "Ventures"
]

REQUIREMENTS = [
    ("Looking for automated WhatsApp marketing bot to handle incoming customer leads", "whatsapp"),
    ("Need CRM integration and automated lead qualification for our sales team of 15 reps", "web"),
    ("Inquiry regarding AI chatbot for appointment booking and customer queries", "instagram"),
    ("Need Instagram DM automation for our fast-growing e-commerce clothing store", "instagram"),
    ("Requesting enterprise pricing, SLA terms and custom CRM webhook pipeline", "gmail"),
    ("Looking to replace manual call center triage with AI voice and SMS workflow", "twilio"),
    ("Need bulk notification system with template approval and interactive reply handling", "whatsapp"),
    ("Interested in automated lead scoring and pipeline management for real estate inquiries", "web"),
    ("Need automated quotation generation and instant payment link delivery on WhatsApp", "whatsapp"),
    ("Require omni-channel customer support solution across Instagram, WhatsApp and Web", "web"),
    ("Looking to integrate AI agent into our Shopify website for 24/7 product recommendations", "web"),
    ("Need urgent bulk customer re-engagement campaign for festive season discounts", "whatsapp"),
    ("Inquiry for automated billing, payment reminders and receipt dispatch system", "gmail"),
    ("Looking for student inquiry management and automated demo class scheduling", "whatsapp"),
    ("Want automated lead capture and follow-up sequences for digital marketing agency clients", "instagram")
]

BUDGET_RANGES = [
    ("₹10,000 - ₹25,000 / mo", 10000, 25000),
    ("₹25,000 - ₹50,000 / mo", 25000, 50000),
    ("₹50,000 - ₹1,00,000 / mo", 50000, 100000),
    ("₹1,00,000 - ₹2,50,000 Enterprise", 100000, 250000),
    ("₹5,000 - ₹10,000 Starter", 5000, 10000)
]

TIMELINES = [
    "Immediate (1-2 weeks)",
    "Within 1 month",
    "Next Quarter",
    "Evaluating vendors"
]

PRODUCTS = [
    "Growth Plan - WhatsApp Suite",
    "Enterprise AI CRM",
    "Omnichannel AI Suite",
    "Starter Automation Pack",
    "Custom AI Agent Solution"
]


def generate_unique_phone(existing_phones):
    while True:
        prefix = random.choice(["9840", "9790", "9444", "8939", "7358", "9940", "9600", "9176", "9884", "9445"])
        suffix = f"{random.randint(100000, 999999)}"
        phone = f"91{prefix[-2:]}{suffix}"
        if phone not in existing_phones:
            existing_phones.add(phone)
            return phone


def generate_unique_email(first_name, last_name, counter, existing_emails):
    clean_f = "".join(c for c in first_name.lower() if c.isalnum())
    clean_l = "".join(c for c in last_name.lower() if c.isalnum())
    domain = random.choice(["gmail.com", "outlook.com", "yahoo.in", "icloud.com", "enterprise.in", "company.co.in"])
    email = f"{clean_f}.{clean_l}{counter}@{domain}"
    while email in existing_emails:
        counter += 1
        email = f"{clean_f}.{clean_l}{counter}@{domain}"
    existing_emails.add(email)
    return email


def main():
    db = SessionLocal()
    try:
        # Target workspace
        target_ws_id = uuid.UUID("0199b611-978d-4409-b65c-0a7652e623c7")
        ws = db.query(Workspace).filter(Workspace.id == target_ws_id).first()
        if not ws:
            print(f"[ERROR] Workspace {target_ws_id} not found!")
            return

        current_leads_count = db.query(Lead).filter(Lead.workspace_id == ws.id).count()
        print(f"[*] Workspace: {ws.name} ({ws.id})")
        print(f"[*] Current lead count: {current_leads_count}")

        target_total = 1000
        needed = target_total - current_leads_count
        if needed <= 0:
            print(f"[!] Target count already reached or exceeded ({current_leads_count} >= {target_total}). Nothing to add.")
            return

        print(f"[*] Generating and inserting exactly {needed} leads to reach {target_total} total leads...")

        # Collect existing phones and emails in this workspace
        existing_phones = set(
            p[0] for p in db.query(Lead.phone).filter(Lead.workspace_id == ws.id).all() if p[0]
        )
        existing_conv_phones = set(
            p[0] for p in db.query(Conversation.phone).filter(Conversation.workspace_id == ws.id).all() if p[0]
        )
        existing_phones.update(existing_conv_phones)

        existing_emails = set(
            e[0] for e in db.query(Lead.normalized_email).filter(Lead.workspace_id == ws.id).all() if e[0]
        )

        owner_user = db.query(User).filter(User.id == ws.created_by).first()
        user_id = owner_user.id if owner_user else None

        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=60)

        # Pre-generate distributions:
        # ~20% Hot, ~45% Warm, ~35% Cold
        num_hot = int(needed * 0.20)
        num_warm = int(needed * 0.45)
        num_cold = needed - (num_hot + num_warm)

        tier_buckets = ["hot"] * num_hot + ["warm"] * num_warm + ["cold"] * num_cold
        random.shuffle(tier_buckets)

        batch_size = 50
        inserted_so_far = 0

        for i in range(needed):
            tier = tier_buckets[i]
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            full_name = f"{first_name} {last_name}"

            phone = generate_unique_phone(existing_phones)
            email = generate_unique_email(first_name, last_name, i + 1, existing_emails)
            company = f"{random.choice(COMPANY_PREFIXES)} {random.choice(COMPANY_SUFFIXES)}"
            req_text, _ = random.choice(REQUIREMENTS)

            source_choices = ["whatsapp", "instagram", "web", "gmail", "twilio"]
            source_weights = [0.45, 0.25, 0.15, 0.10, 0.05]
            source = random.choices(source_choices, weights=source_weights, k=1)[0]

            channel_map = {
                "whatsapp": ChannelType.WHATSAPP,
                "instagram": ChannelType.INSTAGRAM,
                "web": ChannelType.WEB,
                "gmail": ChannelType.EMAIL,
                "twilio": ChannelType.TWILIO,
            }
            channel_enum = channel_map.get(source, ChannelType.WEB)

            budget_label, b_min, b_max = random.choice(BUDGET_RANGES)
            timeline = random.choice(TIMELINES)

            # Dates spread across 60 days
            lead_created_at = start_date + timedelta(seconds=random.randint(0, int((now - start_date).total_seconds())))
            last_active_at = lead_created_at + timedelta(minutes=random.randint(5, 7200))
            if last_active_at > now:
                last_active_at = now

            # Scoring based on tier
            if tier == "hot":
                score = random.randint(70, 96)
                beh_score = random.randint(35, 50)
                sem_score = score - beh_score
                statuses = ["new", "active", "active", "converted", "converted"]
                status = random.choice(statuses)
                labels = random.choice([
                    ["High Priority"],
                    ["Premium Lead"],
                    ["High Priority", "Premium Lead"],
                    ["Interested"]
                ])
                intent_signals = {
                    "bulk_enterprise": {"value": True, "confidence": round(random.uniform(0.85, 0.99), 2)},
                    "urgent_need": {"value": True, "confidence": round(random.uniform(0.80, 0.95), 2)}
                }
            elif tier == "warm":
                score = random.randint(35, 69)
                beh_score = random.randint(18, 35)
                sem_score = score - beh_score
                status = random.choice(["new", "new", "active", "active", "lost"])
                labels = random.choice([
                    ["Interested"],
                    ["Follow Up"],
                    ["Interested", "Follow Up"],
                    []
                ])
                intent_signals = {
                    "budget_quote": {"value": True, "confidence": round(random.uniform(0.70, 0.90), 2)}
                }
            else: # cold
                score = random.randint(5, 34)
                beh_score = random.randint(2, 18)
                sem_score = max(0, score - beh_score)
                status = random.choice(["new", "new", "lost", "lost"])
                labels = []
                intent_signals = {}

            is_converted = (status == "converted")
            conv_amount = Decimal(str(random.choice([15000, 25000, 48000, 75000, 120000]))) if is_converted else None
            conv_product = random.choice(PRODUCTS) if is_converted else None
            converted_at = (lead_created_at + timedelta(days=random.randint(2, 10))) if is_converted else None
            if converted_at and converted_at > now:
                converted_at = now

            conv_status = ConversationStatus.OPEN
            if is_converted:
                conv_status = ConversationStatus.CONVERTED
            elif status == "lost":
                conv_status = ConversationStatus.CLOSED

            conv_id = uuid.uuid4()
            lead_id = uuid.uuid4()

            # 1. Step: Insert Conversation and flush so FK exists in DB
            conv = Conversation(
                id=conv_id,
                workspace_id=ws.id,
                phone=phone,
                user_id=user_id,
                contact_name=full_name,
                channel=channel_enum,
                status=conv_status,
                created_at=lead_created_at,
                updated_at=last_active_at,
                last_message_at=last_active_at
            )
            db.add(conv)
            db.flush()

            # 2. Step: Insert Lead and flush so FK exists in DB
            lead = Lead(
                id=lead_id,
                workspace_id=ws.id,
                conversation_id=conv_id,
                name=full_name,
                email=email,
                normalized_email=email.lower(),
                phone=phone,
                normalized_phone=phone,
                company=company,
                source=source,
                requirement=req_text,
                budget=budget_label,
                timeline=timeline,
                budget_min=Decimal(b_min),
                budget_max=Decimal(b_max),
                user_id=user_id,
                score=score,
                behavioral_score=beh_score,
                semantic_intent_score=sem_score,
                lead_tier=tier,
                status=status,
                labels=labels,
                intent_signals=intent_signals,
                is_favorite=(tier == "hot" and random.random() < 0.3),
                is_follow_up=(tier == "warm" and random.random() < 0.4),
                is_converted=is_converted,
                conversion_amount=conv_amount,
                converted_product=conv_product,
                converted_at=converted_at,
                created_at=lead_created_at,
                last_activity_at=last_active_at,
                updated_at=last_active_at,
                custom_fields={"industry": random.choice(["E-commerce", "Real Estate", "Healthcare", "Education", "Retail", "Manufacturing"])}
            )
            db.add(lead)
            db.flush()

            # 3. Step: Insert Message(s) & Score History
            msg1 = Message(
                id=uuid.uuid4(),
                conversation_id=conv_id,
                sender_type=SenderType.USER,
                content=f"Hi, {req_text}. Our budget is approx {budget_label}. Timeline: {timeline}.",
                status=MessageStatus.RECEIVED,
                timestamp=lead_created_at,
                is_read=True
            )
            db.add(msg1)

            if tier in ("hot", "warm"):
                msg2 = Message(
                    id=uuid.uuid4(),
                    conversation_id=conv_id,
                    sender_type=SenderType.AI,
                    content=f"Hello {first_name}! Thank you for reaching out to Auromind AI. We can definitely assist {company} with your {source.title()} automation requirements. Would you like a brief demo?",
                    status=MessageStatus.DELIVERED,
                    timestamp=lead_created_at + timedelta(minutes=random.randint(1, 5)),
                    is_read=True
                )
                db.add(msg2)

            hist = LeadScoreHistory(
                id=uuid.uuid4(),
                lead_id=lead_id,
                score_before=0,
                score_after=score,
                behavioral_score_delta=beh_score,
                intent_score_delta=sem_score,
                reason="initial_qualification",
                created_at=lead_created_at
            )
            db.add(hist)

            inserted_so_far += 1
            if inserted_so_far % batch_size == 0:
                db.commit()
                print(f"  [+] Progress: {inserted_so_far} / {needed} leads inserted...")

        # Final commit for remaining
        db.commit()
        print(f"  [+] All {inserted_so_far} leads successfully committed!")

        # Verify final count in database
        final_count = db.query(Lead).filter(Lead.workspace_id == ws.id).count()
        print("=" * 65)
        print(f"[SUCCESS] Final Lead Count in workspace '{ws.name}': {final_count}")
        print("=" * 65)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
