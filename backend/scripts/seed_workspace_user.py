#!/usr/bin/env python3
"""
Script: seed_workspace_user.py
Description: Cleanly seeds comprehensive, realistic CRM, Inbox, AI Agents,
             Campaigns, Templates, Calendar Events, Support Tickets,
             Sales Pipeline, and Lead Scoring data specifically for the workspace
             owned by 'yogisanjay278@gmail.com'.
"""

import os
import sys
import uuid
import json
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(backend_dir, ".env"))
except ImportError:
    pass

if "@db:5432" in os.environ.get("DATABASE_URL", ""):
    os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].replace("@db:5432", "@localhost:5435")
elif "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:Arunjack007%40@localhost:5435/yogeshdb"

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import SessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.conversation import Conversation, ChannelType, ConversationStatus
from app.models.message import Message, SenderType, MessageStatus
from app.models.ai_action import (
    Lead,
    SalesPipeline,
    SupportTicket,
    HumanEscalation,
    AIAction,
    ConversationState,
)
from app.models.lead_scoring_rule import LeadScoringSetting
from app.models.lead_scoring import CrmSavedView, LeadScoreHistory
from app.models.templates import Template
from app.models.campaign import Campaign, CampaignRecipient, ContactList, ContactListMember
from app.models.integration import Integration, CalendarEvent
from app.models.wcc import WCCWallet


TARGET_USER_EMAIL = "yogisanjay278@gmail.com"

CUSTOM_SIGNALS = [
    {
        "id": "bulk_enterprise",
        "name": "Enterprise Bulk Order",
        "examples": ["bulk order", "enterprise license", "wholesale", "500 users", "enterprise seats"],
        "points": 35,
        "enabled": True,
    },
    {
        "id": "urgent_need",
        "name": "Urgent Deployment",
        "examples": ["urgent", "asap", "immediately", "deadline", "by next monday"],
        "points": 25,
        "enabled": True,
    },
    {
        "id": "budget_quote",
        "name": "Budget & Pricing Quote",
        "examples": ["quotation", "price quote", "estimate", "pricing sheet", "cost breakdown"],
        "points": 20,
        "enabled": True,
    },
    {
        "id": "tech_integration",
        "name": "API & Webhook Integration",
        "examples": ["api", "webhook", "rest api", "custom integration", "crm sync"],
        "points": 20,
        "enabled": True,
    },
    {
        "id": "high_value_deal",
        "name": "High Value Contract",
        "examples": ["annual contract", "250000", "enterprise plan", "custom contract"],
        "points": 30,
        "enabled": True,
    },
    {
        "id": "competitor_churn",
        "name": "Competitor Mention",
        "examples": ["competitor", "cheaper elsewhere", "switching from", "too expensive"],
        "points": -20,
        "enabled": True,
    },
]

TEMPLATES_DATA = [
    {
        "name": "plan_activation_notice",
        "category": "MARKETING",
        "type": "TEXT",
        "language": "en_US",
        "header": "Welcome to Auromind AI! 🎉",
        "content": "Hi {{1}}, welcome to Auromind AI! Your {{2}} plan is now active. Total amount paid: {{3}}. Let us know how our AI agents can assist your team today!",
        "variable_mapping": json.dumps({"1": "customer_name", "2": "plan_name", "3": "amount"}),
        "footer": "Powered by Auromind AI",
        "cta": "https://auromindai.com/dashboard",
        "cta_btn_title": "Open Dashboard",
        "status": "approved",
        "system_tag": "onboarding",
        "meta_template_id": "meta_tpl_plan_act_201",
    },
    {
        "name": "welcome_special_offer",
        "category": "MARKETING",
        "type": "TEXT",
        "language": "en_US",
        "header": "Exclusive Partner Offer 🌟",
        "content": "Hi {{1}}, thank you for connecting with us! Your company {{2}} has unlocked an exclusive {{3}} deal on all {{4}} subscriptions. Claim your pass below.",
        "variable_mapping": json.dumps({"1": "customer_name", "2": "company", "3": "deal_value", "4": "product_name"}),
        "footer": "Reply STOP to unsubscribe",
        "cta": "https://auromindai.com/offers",
        "cta_btn_title": "Claim Offer",
        "status": "approved",
        "system_tag": "trending",
        "meta_template_id": "meta_tpl_welcome_202",
    },
    {
        "name": "order_status_update",
        "category": "UTILITY",
        "type": "IMAGE",
        "language": "en_US",
        "header": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        "media_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        "content": "Hello {{1}}, your order #{{2}} for {{3}} has been confirmed and dispatched! Estimated delivery is {{4}}. Live tracking link is available below.",
        "variable_mapping": json.dumps({"1": "customer_name", "2": "order_id", "3": "product_name", "4": "appointment_date"}),
        "footer": "Customer Support • Auromind Care",
        "cta": "https://auromindai.com/track",
        "cta_btn_title": "Track Order",
        "status": "approved",
        "system_tag": "ecommerce",
        "meta_template_id": "meta_tpl_order_203",
    },
    {
        "name": "appointment_reminder",
        "category": "UTILITY",
        "type": "TEXT",
        "language": "en_US",
        "header": "Upcoming Appointment 📅",
        "content": "Hi {{1}}, this is a friendly reminder for your scheduled consultation on {{2}} regarding {{3}}. Please let us know in advance if you need to reschedule.",
        "variable_mapping": json.dumps({"1": "customer_name", "2": "appointment_date", "3": "product_name"}),
        "footer": "Auromind AI Care Team",
        "cta": "https://auromindai.com/reschedule",
        "cta_btn_title": "View Details",
        "status": "approved",
        "system_tag": "service",
        "meta_template_id": "meta_tpl_appt_204",
    },
    {
        "name": "account_verification_otp",
        "category": "AUTHENTICATION",
        "type": "TEXT",
        "language": "en_US",
        "header": None,
        "content": "{{1}} is your verification code. For your security, do not share this code.",
        "variable_mapping": json.dumps({"1": "otp_code"}),
        "footer": "Expires in 10 minutes",
        "cta": None,
        "cta_btn_title": "Copy Code",
        "status": "approved",
        "system_tag": "security",
        "meta_template_id": "meta_tpl_auth_otp_205",
    },
    {
        "name": "seasonal_festive_sale",
        "category": "MARKETING",
        "type": "TEXT",
        "language": "en_US",
        "header": "Mega Festive Season Sale! 🌟",
        "content": "Dear {{1}}, our biggest festive season sale is live now! Get up to {{2}} off on all {{3}} upgrades. Don't miss out on these limited-time deals.",
        "variable_mapping": json.dumps({"1": "customer_name", "2": "deal_value", "3": "plan_name"}),
        "footer": "Valid till midnight",
        "cta": "https://auromindai.com/deals",
        "cta_btn_title": "Shop Now",
        "status": "pending",
        "system_tag": "seasonal",
        "meta_template_id": "meta_tpl_festive_206",
    },
]

SEEDED_LEADS_DATA = [
    {
        "contact_name": "Dr. Vikram Sethi",
        "email": "vikram.sethi@apollohealthtech.in",
        "phone": "919884012345",
        "company": "Apollo HealthTech Solutions",
        "channel": ChannelType.WHATSAPP,
        "business_type": "Healthcare IT",
        "product_type": "Hospital Patient Care AI",
        "requirement": "Need 500 enterprise seats for doctor-patient WhatsApp automation with HIPAA compliance and custom EMR integration.",
        "budget": "₹2,50,000 / month",
        "budget_min": 200000.0,
        "budget_max": 300000.0,
        "timeline": "Immediate (1 week)",
        "score": 92,
        "behavioral_score": 42,
        "semantic_intent_score": 50,
        "lead_tier": "hot",
        "status": "converted",
        "is_converted": True,
        "conversion_amount": 250000.0,
        "converted_product": "Enterprise Pro + Custom WhatsApp Bot",
        "conversion_notes": "Annual contract signed. Onboarding in progress.",
        "demo_requested": True,
        "meeting_date": datetime.now(timezone.utc) + timedelta(days=2),
        "meeting_link": "https://meet.google.com/xyz-drvs-demo",
        "pipeline_stage": "closed_won",
        "pipeline_confidence": 0.98,
        "intent_signals": {
            "bulk_enterprise": {"value": True, "score": 35},
            "urgent_need": {"value": True, "score": 25},
            "high_value_deal": {"value": True, "score": 30},
        },
        "messages": [
            {"sender": SenderType.USER, "text": "Hi team, we represent Apollo HealthTech. We are looking for an enterprise WhatsApp AI automation solution for 500 hospital staff and doctors."},
            {"sender": SenderType.AI, "text": "Hello Dr. Vikram! Welcome to Auromind AI. We support large-scale enterprise healthcare deployments with full HIPAA compliance and role-based access. Would you like to review our enterprise pricing and schedule an architecture walkthrough?"},
            {"sender": SenderType.USER, "text": "Yes, we need this urgent and asap. Please send a quotation and let's schedule a demo for 500 users."},
            {"sender": SenderType.AI, "text": "Understood! I've flagged this for our Enterprise Solutions Architect and scheduled a demo for this Thursday at 11:00 AM IST. Meeting link: https://meet.google.com/xyz-drvs-demo"},
            {"sender": SenderType.USER, "text": "Perfect. We have approved the ₹2,50,000/mo proposal. Looking forward to the onboarding call."},
        ]
    },
    {
        "contact_name": "Ananya Patel",
        "email": "ananya.patel@quickcommerce.com",
        "phone": "919820054321",
        "company": "QuickCommerce Retail Ltd",
        "channel": ChannelType.WHATSAPP,
        "business_type": "E-Commerce / D2C",
        "product_type": "E-Commerce Abandoned Cart Bot",
        "requirement": "Automated order confirmation, abandoned cart recovery, and customer support via WhatsApp Cloud API.",
        "budget": "₹1,20,000 / month",
        "budget_min": 100000.0,
        "budget_max": 150000.0,
        "timeline": "Within 3 days",
        "score": 85,
        "behavioral_score": 35,
        "semantic_intent_score": 50,
        "lead_tier": "hot",
        "status": "active",
        "is_converted": False,
        "demo_requested": True,
        "meeting_date": datetime.now(timezone.utc) + timedelta(days=3),
        "meeting_link": "https://meet.google.com/abc-ananya-demo",
        "pipeline_stage": "negotiation",
        "pipeline_confidence": 0.88,
        "intent_signals": {
            "urgent_need": {"value": True, "score": 25},
            "budget_quote": {"value": True, "score": 20},
            "bulk_enterprise": {"value": True, "score": 35},
        },
        "messages": [
            {"sender": SenderType.USER, "text": "Hello! We run QuickCommerce Retail with 50,000 orders/month. We need automated abandoned cart WhatsApp recovery urgently."},
            {"sender": SenderType.AI, "text": "Hello Ananya! Our e-commerce recovery flow typically recovers 18-24% of abandoned carts using WhatsApp interactive buttons. We can configure this within 48 hours."},
            {"sender": SenderType.USER, "text": "Great! Please share the price quote and estimate for 50k monthly sessions."},
            {"sender": SenderType.AI, "text": "Based on 50k conversations, our Growth Enterprise plan at ₹1,20,000/month includes unlimited agents, AI dynamic fallback, and full Shopify/WooCommerce webhooks."},
            {"sender": SenderType.USER, "text": "Sounds very reasonable. Can we get a quick 15-min walkthrough call tomorrow?"},
        ]
    },
    {
        "contact_name": "Ramesh Sharma",
        "email": "ramesh@apexdigital.co",
        "phone": "919444198765",
        "company": "Apex Digital Agency",
        "channel": ChannelType.INSTAGRAM,
        "business_type": "Marketing Agency",
        "product_type": "White-label AI Chatbot",
        "requirement": "Agency multi-workspace plan with custom domain and white-labeling for 15 client accounts.",
        "budget": "₹60,000 / month",
        "budget_min": 50000.0,
        "budget_max": 80000.0,
        "timeline": "2-4 weeks",
        "score": 68,
        "behavioral_score": 30,
        "semantic_intent_score": 38,
        "lead_tier": "warm",
        "status": "active",
        "is_converted": False,
        "demo_requested": False,
        "pipeline_stage": "proposal",
        "pipeline_confidence": 0.72,
        "intent_signals": {
            "budget_quote": {"value": True, "score": 20},
            "tech_integration": {"value": True, "score": 20},
        },
        "messages": [
            {"sender": SenderType.USER, "text": "Hi! We are a digital agency managing 15 brand clients. Do you offer white-label dashboard options?"},
            {"sender": SenderType.AI, "text": "Hi Ramesh! Yes, Auromind AI supports Agency Multi-Tenancy with custom domain branding, client sub-accounts, and unified billing management."},
            {"sender": SenderType.USER, "text": "Can you share the agency pricing tier breakdown?"},
            {"sender": SenderType.AI, "text": "Our Agency Partner tier starts at ₹60,000/month for up to 20 client workspaces with dedicated webhook bandwidth and priority WABA onboarding."},
        ]
    },
    {
        "contact_name": "Kavitha Ranganathan",
        "email": "kavitha.r@finservecap.com",
        "phone": "919789023456",
        "company": "FinServe Capital",
        "channel": ChannelType.WEB,
        "business_type": "Financial Services",
        "product_type": "Loan Eligibility Lead Bot",
        "requirement": "Real-time loan calculator and document collection bot with backend core-banking API integration.",
        "budget": "₹75,000 / month",
        "budget_min": 60000.0,
        "budget_max": 90000.0,
        "timeline": "Next month",
        "score": 62,
        "behavioral_score": 25,
        "semantic_intent_score": 37,
        "lead_tier": "warm",
        "status": "new",
        "is_converted": False,
        "pipeline_stage": "discovery",
        "pipeline_confidence": 0.65,
        "intent_signals": {
            "tech_integration": {"value": True, "score": 20},
            "budget_quote": {"value": True, "score": 20},
        },
        "messages": [
            {"sender": SenderType.USER, "text": "We need an AI bot on web & WhatsApp that can check customer loan eligibility via REST API and collect KYC documents securely."},
            {"sender": SenderType.AI, "text": "Hello Kavitha! Auromind AI provides visual Automation Flows with HTTP Action Nodes that connect directly with your core-banking REST API and secure AWS S3 bucket."},
            {"sender": SenderType.USER, "text": "That matches our tech stack. I will discuss with our CTO and get back on the technical review."},
        ]
    },
    {
        "contact_name": "Siddharth Verma",
        "email": "siddharth@edutechglobal.org",
        "phone": "919811167890",
        "company": "EduTech Global Academy",
        "channel": ChannelType.WHATSAPP,
        "business_type": "EdTech & Online Courses",
        "product_type": "Student Admissions Counselor AI",
        "requirement": "24/7 student course query responder with lead qualification and instant callback scheduler.",
        "budget": "₹85,000 / month",
        "budget_min": 75000.0,
        "budget_max": 100000.0,
        "timeline": "Immediate",
        "score": 78,
        "behavioral_score": 38,
        "semantic_intent_score": 40,
        "lead_tier": "hot",
        "status": "active",
        "is_converted": False,
        "demo_requested": True,
        "meeting_date": datetime.now(timezone.utc) + timedelta(days=4),
        "meeting_link": "https://meet.google.com/edutech-demo-2026",
        "pipeline_stage": "proposal",
        "pipeline_confidence": 0.82,
        "intent_signals": {
            "urgent_need": {"value": True, "score": 25},
            "bulk_enterprise": {"value": True, "score": 35},
        },
        "messages": [
            {"sender": SenderType.USER, "text": "Hello, we are experiencing huge inbound traffic for university admissions counseling. We need an urgent AI bot to qualify student leads."},
            {"sender": SenderType.AI, "text": "Hello Siddharth! Our Lead Qualification Bot can automatically score incoming student inquiries, capture target degrees, and book counseling slots into Google Calendar."},
            {"sender": SenderType.USER, "text": "Excellent. We need this urgent for our upcoming batch intake next week. Let's schedule a demo."},
        ]
    },
    {
        "contact_name": "Suresh Kumar",
        "email": "suresh@sklogistics.in",
        "phone": "919345678901",
        "company": "SK Logistics & Freight",
        "channel": ChannelType.WHATSAPP,
        "business_type": "Logistics",
        "product_type": "Shipment Tracking Bot",
        "requirement": "Basic tracking replies for cargo status.",
        "budget": "₹15,000 / month",
        "budget_min": 10000.0,
        "budget_max": 20000.0,
        "timeline": "Flexible",
        "score": 18,
        "behavioral_score": 10,
        "semantic_intent_score": 8,
        "lead_tier": "cold",
        "status": "active",
        "is_converted": False,
        "pipeline_stage": "discovery",
        "pipeline_confidence": 0.25,
        "intent_signals": {
            "competitor_churn": {"value": True, "score": -20},
        },
        "messages": [
            {"sender": SenderType.USER, "text": "Hi, your product seems expensive. Competitor is offering similar tracking bot cheaper elsewhere for 5k/month. Can you match that?"},
            {"sender": SenderType.AI, "text": "Hello Suresh, our platform includes dedicated Meta WABA infrastructure, AI semantic fallback, and omnichannel automation. Our starter plan starts at ₹15,000/month with full features."},
            {"sender": SenderType.USER, "text": "Not interested if you cannot give discount."},
        ]
    },
    {
        "contact_name": "Vague Visitor",
        "email": "visitor94@gmail.com",
        "phone": "919456789012",
        "company": "Independent",
        "channel": ChannelType.WEB,
        "business_type": "Personal",
        "product_type": "General Inquiry",
        "requirement": "General browsing",
        "budget": None,
        "budget_min": None,
        "budget_max": None,
        "timeline": None,
        "score": 5,
        "behavioral_score": 5,
        "semantic_intent_score": 0,
        "lead_tier": "cold",
        "status": "lost",
        "is_converted": False,
        "pipeline_stage": "closed_lost",
        "pipeline_confidence": 0.05,
        "intent_signals": {},
        "messages": [
            {"sender": SenderType.USER, "text": "ok thanks for info"},
        ]
    },
    {
        "contact_name": "Meera Krishnan",
        "email": "meera.k@zenithretail.in",
        "phone": "919840155667",
        "company": "Zenith Retail Outlets",
        "channel": ChannelType.WHATSAPP,
        "business_type": "Retail Chain",
        "product_type": "Store Locator & Offers Bot",
        "requirement": "Integration support for store inventory sync and human agent handoff.",
        "budget": "₹50,000 / month",
        "budget_min": 40000.0,
        "budget_max": 60000.0,
        "timeline": "Immediate",
        "score": 55,
        "behavioral_score": 25,
        "semantic_intent_score": 30,
        "lead_tier": "warm",
        "status": "active",
        "is_converted": False,
        "pipeline_stage": "proposal",
        "pipeline_confidence": 0.75,
        "intent_signals": {
            "tech_integration": {"value": True, "score": 20},
        },
        "messages": [
            {"sender": SenderType.USER, "text": "Hi team, our Meta WhatsApp webhook is encountering delay with inventory lookups. Can a technical manager assist us with webhook timeout config?"},
            {"sender": SenderType.AI, "text": "Hello Meera! I have recorded your support request regarding webhook latency and assigned this to our Senior Technical Support team for immediate escalation."},
        ]
    }
]


def seed_workspace():
    db = SessionLocal()
    try:
        # 1. Lookup User
        user = db.query(User).filter(User.email.ilike(f"%{TARGET_USER_EMAIL}%")).first()
        if not user:
            print(f"[ERROR] User '{TARGET_USER_EMAIL}' not found in database!")
            return

        print("=" * 70)
        print(f"[*] SEEDING DATA FOR USER: {user.email} ({user.full_name})")
        print("=" * 70)

        # 2. Lookup or Create Workspace for user
        ws = db.query(Workspace).filter(Workspace.created_by == user.id).first()
        if not ws:
            # Check membership
            mem = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).first()
            if mem:
                ws = db.query(Workspace).filter(Workspace.id == mem.workspace_id).first()

        if not ws:
            ws = Workspace(
                id=uuid.uuid4(),
                name=f"{user.full_name or 'User'}'s Workspace",
                created_by=user.id,
                billing_owner_id=user.id,
                plan_type="enterprise",
                overage_enabled=True,
            )
            db.add(ws)
            db.flush()
            print(f"[+] Created new Workspace: {ws.name} ({ws.id})")
        else:
            print(f"[*] Target Workspace: '{ws.name}' (ID: {ws.id})")

        # 3. Ensure Workspace Membership
        existing_mem = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == ws.id,
            WorkspaceMember.user_id == user.id
        ).first()
        if not existing_mem:
            new_mem = WorkspaceMember(
                id=uuid.uuid4(),
                workspace_id=ws.id,
                user_id=user.id,
                name=user.full_name,
                role="founder"
            )
            db.add(new_mem)
            db.flush()
            print(f"[+] Ensured founder membership for {user.email}")

        # 4. Configure Lead Scoring Settings
        scoring_setting = db.query(LeadScoringSetting).filter(LeadScoringSetting.workspace_id == ws.id).first()
        if not scoring_setting:
            scoring_setting = LeadScoringSetting(
                id=uuid.uuid4(),
                workspace_id=ws.id,
                ai_qualification_enabled=True,
                thresholds={"hot": 50, "warm": 30, "cold": 0},
                signals=CUSTOM_SIGNALS,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(scoring_setting)
        else:
            scoring_setting.ai_qualification_enabled = True
            scoring_setting.thresholds = {"hot": 50, "warm": 30, "cold": 0}
            scoring_setting.signals = CUSTOM_SIGNALS
            scoring_setting.updated_at = datetime.now(timezone.utc)
        print(f"[+] Configured Lead Scoring Settings (6 intent signals, Hot>=50, Warm>=30)")

        # 5. Seed / Update WhatsApp Templates for this workspace
        seeded_templates = []
        for t_data in TEMPLATES_DATA:
            tmpl = db.query(Template).filter(
                Template.workspace_id == ws.id,
                Template.name == t_data["name"]
            ).first()
            if not tmpl:
                tmpl = Template(
                    id=uuid.uuid4(),
                    workspace_id=ws.id,
                    user_id=user.id,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                    **t_data
                )
                db.add(tmpl)
                db.flush()
            else:
                for k, v in t_data.items():
                    setattr(tmpl, k, v)
                tmpl.updated_at = datetime.now(timezone.utc)
            seeded_templates.append(tmpl)
        print(f"[+] Seeded/Updated {len(seeded_templates)} WhatsApp Templates")

        # 6. Seed Conversations, Messages, and Leads
        created_lead_records = []
        created_conv_records = []
        for item in SEEDED_LEADS_DATA:
            # Check or create conversation
            conv = db.query(Conversation).filter(
                Conversation.workspace_id == ws.id,
                Conversation.phone == item["phone"]
            ).first()

            if not conv:
                conv = Conversation(
                    id=uuid.uuid4(),
                    workspace_id=ws.id,
                    phone=item["phone"],
                    user_id=user.id,
                    channel=item["channel"],
                    contact_name=item["contact_name"],
                    status=ConversationStatus.CONVERTED if item["is_converted"] else ConversationStatus.OPEN,
                    active_agent="AI Sales Assistant",
                    agent_locked=False,
                    created_at=datetime.now(timezone.utc) - timedelta(days=2),
                    last_message_at=datetime.now(timezone.utc),
                )
                db.add(conv)
                db.flush()
            else:
                conv.contact_name = item["contact_name"]
                conv.channel = item["channel"]
                conv.status = ConversationStatus.CONVERTED if item["is_converted"] else ConversationStatus.OPEN
            created_conv_records.append(conv)

            # Messages for conversation
            # Clean old messages for this conversation if any, then re-seed
            db.query(Message).filter(Message.conversation_id == conv.id).delete()
            base_time = datetime.now(timezone.utc) - timedelta(hours=len(item["messages"]) * 2)
            for idx, msg_data in enumerate(item["messages"]):
                msg_time = base_time + timedelta(hours=idx * 2)
                msg_rec = Message(
                    id=uuid.uuid4(),
                    conversation_id=conv.id,
                    sender_type=msg_data["sender"],
                    content=msg_data["text"],
                    status=MessageStatus.DELIVERED if msg_data["sender"] == SenderType.AI else MessageStatus.RECEIVED,
                    is_read=True,
                    timestamp=msg_time,
                )
                db.add(msg_rec)

            # Check or create Lead
            lead = db.query(Lead).filter(
                Lead.workspace_id == ws.id,
                Lead.conversation_id == conv.id
            ).first()

            if not lead:
                lead = Lead(
                    id=uuid.uuid4(),
                    workspace_id=ws.id,
                    conversation_id=conv.id,
                    user_id=user.id,
                    name=item["contact_name"],
                    email=item["email"],
                    normalized_email=item["email"].lower().strip(),
                    phone=item["phone"],
                    normalized_phone=item["phone"],
                    company=item["company"],
                    source=item["channel"].value.lower(),
                    requirement=item["requirement"],
                    budget=item["budget"],
                    budget_min=item["budget_min"],
                    budget_max=item["budget_max"],
                    budget_raw=item["budget"],
                    timeline=item["timeline"],
                    business_type=item["business_type"],
                    product_type=item["product_type"],
                    score=item["score"],
                    lead_score=float(item["score"]),
                    behavioral_score=item["behavioral_score"],
                    semantic_intent_score=item["semantic_intent_score"],
                    lead_tier=item["lead_tier"],
                    status=item["status"],
                    is_converted=item["is_converted"],
                    conversion_amount=item.get("conversion_amount"),
                    converted_product=item.get("converted_product"),
                    conversion_notes=item.get("conversion_notes"),
                    converted_at=datetime.now(timezone.utc) if item["is_converted"] else None,
                    demo_requested=item.get("demo_requested", False),
                    meeting_date=item.get("meeting_date"),
                    meeting_link=item.get("meeting_link"),
                    intent_signals=item.get("intent_signals", {}),
                    labels=["Enterprise", "Q4 Prospect"] if item["score"] > 60 else ["Standard"],
                    ai_summary=f"Automated AI summary for {item['contact_name']} ({item['company']}): High engagement with intent score {item['score']}.",
                    last_activity_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc) - timedelta(days=2),
                )
                db.add(lead)
                db.flush()
            else:
                lead.name = item["contact_name"]
                lead.email = item["email"]
                lead.normalized_email = item["email"].lower().strip()
                lead.company = item["company"]
                lead.requirement = item["requirement"]
                lead.budget = item["budget"]
                lead.budget_min = item["budget_min"]
                lead.budget_max = item["budget_max"]
                lead.timeline = item["timeline"]
                lead.score = item["score"]
                lead.lead_score = float(item["score"])
                lead.behavioral_score = item["behavioral_score"]
                lead.semantic_intent_score = item["semantic_intent_score"]
                lead.lead_tier = item["lead_tier"]
                lead.status = item["status"]
                lead.is_converted = item["is_converted"]
                lead.conversion_amount = item.get("conversion_amount")
                lead.converted_product = item.get("converted_product")
                lead.conversion_notes = item.get("conversion_notes")
                lead.demo_requested = item.get("demo_requested", False)
                lead.meeting_date = item.get("meeting_date")
                lead.meeting_link = item.get("meeting_link")
                lead.intent_signals = item.get("intent_signals", {})
                lead.last_activity_at = datetime.now(timezone.utc)

            created_lead_records.append(lead)

            # Record Lead Score History
            hist = LeadScoreHistory(
                id=uuid.uuid4(),
                lead_id=lead.id,
                score_before=0,
                score_after=lead.score,
                behavioral_score_delta=lead.behavioral_score,
                intent_score_delta=lead.semantic_intent_score,
                reason="initial_qualification_seed",
                event_type="intent_detection",
                created_at=datetime.now(timezone.utc),
            )
            db.add(hist)

            # Seed / Update Sales Pipeline entry
            pipe = db.query(SalesPipeline).filter(
                SalesPipeline.workspace_id == ws.id,
                SalesPipeline.conversation_id == conv.id
            ).first()
            if not pipe:
                pipe = SalesPipeline(
                    id=uuid.uuid4(),
                    workspace_id=ws.id,
                    conversation_id=conv.id,
                    stage=item["pipeline_stage"],
                    intent=f"Purchase {item['product_type']}",
                    lead_score=item["lead_tier"],
                    confidence_score=item["pipeline_confidence"],
                    meeting_required=item.get("demo_requested", False),
                    payment_required=item["is_converted"],
                )
                db.add(pipe)
            else:
                pipe.stage = item["pipeline_stage"]
                pipe.lead_score = item["lead_tier"]
                pipe.confidence_score = item["pipeline_confidence"]

        print(f"[+] Seeded/Updated {len(created_lead_records)} Leads, Conversations & Messages")
        print(f"[+] Seeded/Updated Sales Pipeline entries")

        # 7. Seed Support Tickets
        db.query(SupportTicket).filter(SupportTicket.workspace_id == ws.id).delete()
        tickets_data = [
            {
                "conv": created_conv_records[7], # Meera Krishnan
                "issue_type": "Integration / Webhook Latency",
                "status": "open",
                "description": "Meta WABA Webhook taking > 3.5s to respond during peak flash sales. Needs timeout threshold adjustment.",
                "customer_name": "Meera Krishnan",
                "customer_contact": "919840155667",
            },
            {
                "conv": created_conv_records[1], # Ananya Patel
                "issue_type": "Billing & Invoice GSTIN",
                "status": "in_progress",
                "description": "Update registered GSTIN number on previous month tax invoice copy.",
                "customer_name": "Ananya Patel",
                "customer_contact": "919820054321",
            },
            {
                "conv": created_conv_records[0], # Dr. Vikram Sethi
                "issue_type": "Meta Template Expedited Review",
                "status": "resolved",
                "description": "HIPAA patient intake template approval submitted to Meta Business Manager.",
                "customer_name": "Dr. Vikram Sethi",
                "customer_contact": "919884012345",
            }
        ]
        for t in tickets_data:
            ticket = SupportTicket(
                id=uuid.uuid4(),
                workspace_id=ws.id,
                conversation_id=t["conv"].id,
                user_id=user.id,
                issue_type=t["issue_type"],
                status=t["status"],
                description=t["description"],
                customer_name=t["customer_name"],
                customer_contact=t["customer_contact"],
                created_at=datetime.now(timezone.utc) - timedelta(hours=12),
            )
            db.add(ticket)
        print(f"[+] Seeded 3 Support Tickets (Open, In Progress, Resolved)")

        # 8. Seed Human Escalation records
        db.query(HumanEscalation).filter(HumanEscalation.workspace_id == ws.id).delete()
        escalations_data = [
            {
                "conv": created_conv_records[7],
                "channel": "WHATSAPP",
                "message": "Can a senior technical manager assist us with webhook timeout config?",
                "reason": "Technical integration bottleneck requiring senior dev assistance.",
                "status": "pending",
                "priority": "high",
            },
            {
                "conv": created_conv_records[0],
                "channel": "WHATSAPP",
                "message": "Proposal signed for 500 users, onboarding engineer requested.",
                "reason": "Enterprise customer onboarding handoff.",
                "status": "resolved",
                "priority": "urgent",
                "resolved_at": datetime.now(timezone.utc) - timedelta(hours=4),
                "resolution_notes": "Assigned Senior Architect Rajesh to onboarding call.",
            }
        ]
        for esc in escalations_data:
            h_esc = HumanEscalation(
                id=uuid.uuid4(),
                workspace_id=ws.id,
                conversation_id=esc["conv"].id,
                user_id=user.id,
                channel=esc["channel"],
                message=esc["message"],
                reason=esc["reason"],
                status=esc["status"],
                priority=esc["priority"],
                assigned_to=user.id,
                resolved_at=esc.get("resolved_at"),
                resolution_notes=esc.get("resolution_notes"),
                created_at=datetime.now(timezone.utc) - timedelta(hours=8),
            )
            db.add(h_esc)
        print(f"[+] Seeded 2 Human Escalation records (High / Urgent)")

        # 9. Seed Calendar Events
        db.query(CalendarEvent).filter(CalendarEvent.workspace_id == ws.id).delete()
        cal_events = [
            {
                "title": "Enterprise AI Agent Architecture Walkthrough - Apollo HealthTech",
                "description": "500 Seats deployment, HIPAA compliance, and custom EMR connector demo with Dr. Vikram Sethi.",
                "event_date": datetime.now(timezone.utc) + timedelta(days=2),
                "event_time": "11:00 AM - 12:00 PM IST",
                "client_name": "Dr. Vikram Sethi",
                "client_email": "vikram.sethi@apollohealthtech.in",
                "client_phone": "919884012345",
                "meet_link": "https://meet.google.com/xyz-drvs-demo",
                "status": "scheduled",
                "conv_id": created_conv_records[0].id,
            },
            {
                "title": "QuickCommerce WhatsApp Cart Recovery Walkthrough",
                "description": "Reviewing interactive button recovery flows and Shopify integration with Ananya Patel.",
                "event_date": datetime.now(timezone.utc) + timedelta(days=3),
                "event_time": "03:30 PM - 04:00 PM IST",
                "client_name": "Ananya Patel",
                "client_email": "ananya.patel@quickcommerce.com",
                "client_phone": "919820054321",
                "meet_link": "https://meet.google.com/abc-ananya-demo",
                "status": "scheduled",
                "conv_id": created_conv_records[1].id,
            },
            {
                "title": "EduTech Global Student Counselor Bot Demonstration",
                "description": "Demonstrating automated student qualification and Google Calendar lead booking.",
                "event_date": datetime.now(timezone.utc) + timedelta(days=4),
                "event_time": "04:00 PM - 04:45 PM IST",
                "client_name": "Siddharth Verma",
                "client_email": "siddharth@edutechglobal.org",
                "client_phone": "919811167890",
                "meet_link": "https://meet.google.com/edutech-demo-2026",
                "status": "scheduled",
                "conv_id": created_conv_records[4].id,
            }
        ]
        for ce in cal_events:
            event = CalendarEvent(
                id=uuid.uuid4(),
                workspace_id=ws.id,
                title=ce["title"],
                description=ce["description"],
                event_date=ce["event_date"],
                event_time=ce["event_time"],
                timezone="Asia/Kolkata",
                location="Google Meet",
                google_event_id=f"g_event_{uuid.uuid4().hex[:10]}",
                sync_status="synced",
                client_name=ce["client_name"],
                client_email=ce["client_email"],
                client_phone=ce["client_phone"],
                meet_link=ce["meet_link"],
                conversation_id=ce["conv_id"],
                status=ce["status"],
            )
            db.add(event)
        print(f"[+] Seeded 3 Calendar Events (Scheduled product demos & client calls)")

        # 10. Seed Contact Lists & Members
        db.query(ContactListMember).filter(ContactListMember.lead_id.in_([l.id for l in created_lead_records])).delete(synchronize_session=False)
        db.query(ContactList).filter(ContactList.workspace_id == ws.id).delete()

        list1 = ContactList(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            name="🔥 High-Intent Enterprise Leads",
            description="Leads with AI qualification score >= 60 and enterprise budget.",
            total_contacts=4,
            filter_query={"score_min": 60, "tier": "hot"},
        )
        list2 = ContactList(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            name="📱 WhatsApp Inbound Qualified",
            description="Inbound leads from official WhatsApp Cloud API.",
            total_contacts=5,
            filter_query={"channel": "WHATSAPP"},
        )
        list3 = ContactList(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            name="🎓 D2C & EdTech Brands",
            description="Fast growing retail, online learning, and D2C businesses.",
            total_contacts=3,
            filter_query={"business_types": ["E-Commerce / D2C", "EdTech & Online Courses"]},
        )
        db.add_all([list1, list2, list3])
        db.flush()

        # Add list members
        # List 1 members: Vikram, Ananya, Siddharth, Ramesh
        for lead_idx in [0, 1, 2, 4]:
            mem = ContactListMember(
                id=uuid.uuid4(),
                contact_list_id=list1.id,
                lead_id=created_lead_records[lead_idx].id,
            )
            db.add(mem)

        # List 2 members: Vikram, Ananya, Siddharth, Suresh, Meera
        for lead_idx in [0, 1, 4, 5, 7]:
            mem = ContactListMember(
                id=uuid.uuid4(),
                contact_list_id=list2.id,
                lead_id=created_lead_records[lead_idx].id,
            )
            db.add(mem)

        # List 3 members: Ananya, Siddharth, Meera
        for lead_idx in [1, 4, 7]:
            mem = ContactListMember(
                id=uuid.uuid4(),
                contact_list_id=list3.id,
                lead_id=created_lead_records[lead_idx].id,
            )
            db.add(mem)

        print(f"[+] Seeded 3 Contact Lists / Audiences with Lead Members")

        # 11. Seed Campaigns & Campaign Recipients
        db.query(Campaign).filter(Campaign.workspace_id == ws.id).delete()
        template_offer = seeded_templates[1] # welcome_special_offer
        template_notice = seeded_templates[0] # plan_activation_notice

        camp1 = Campaign(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            created_by=user.id,
            name="Q4 Festive AI Agent Promotion",
            campaign_type="promotional",
            campaign_goal="Upsell high-growth businesses with 20% festive discount",
            portfolio_id="meta_portfolio_99881",
            phone_number_id="meta_phone_num_88992",
            status="completed",
            audience_source="existing_contacts",
            total_recipients=5,
            valid_recipients=5,
            invalid_recipients=0,
            message_type="template",
            template_id=template_offer.id,
            schedule_type="now",
            scheduled_at=datetime.now(timezone.utc) - timedelta(days=1),
            started_at=datetime.now(timezone.utc) - timedelta(days=1),
            completed_at=datetime.now(timezone.utc) - timedelta(days=1, hours=-1),
            sent_count=5,
            delivered_count=5,
            read_count=4,
            failed_count=0,
            accepted_count=5,
            estimated_cost=2.50,
            actual_cost=2.50,
        )
        db.add(camp1)
        db.flush()

        # Seed recipients for campaign 1
        for idx in range(5):
            target_lead = created_lead_records[idx]
            recip = CampaignRecipient(
                id=uuid.uuid4(),
                campaign_id=camp1.id,
                workspace_id=ws.id,
                lead_id=target_lead.id,
                phone_number=target_lead.phone,
                normalized_phone=target_lead.phone,
                recipient_name=target_lead.name,
                variables={"customer_name": target_lead.name, "company": target_lead.company or "Company", "deal_value": "20% OFF", "product_name": "Auromind Pro"},
                status="read" if idx < 4 else "delivered",
                cost=0.50,
                accepted_at=datetime.now(timezone.utc) - timedelta(days=1),
                sent_at=datetime.now(timezone.utc) - timedelta(days=1),
                delivered_at=datetime.now(timezone.utc) - timedelta(days=1),
                read_at=datetime.now(timezone.utc) - timedelta(days=1) if idx < 4 else None,
            )
            db.add(recip)

        camp2 = Campaign(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            created_by=user.id,
            name="Enterprise Product Update - Autumn 2026",
            campaign_type="promotional",
            campaign_goal="Announce new Multi-Agent Orchestration & Flow Builder",
            portfolio_id="meta_portfolio_99881",
            phone_number_id="meta_phone_num_88992",
            status="in_progress",
            audience_source="smart_segment",
            total_recipients=4,
            valid_recipients=4,
            invalid_recipients=0,
            message_type="template",
            template_id=template_offer.id,
            schedule_type="now",
            started_at=datetime.now(timezone.utc) - timedelta(hours=2),
            sent_count=4,
            delivered_count=4,
            read_count=2,
            failed_count=0,
            accepted_count=4,
            estimated_cost=2.00,
            actual_cost=2.00,
        )
        db.add(camp2)
        db.flush()

        for idx in range(4):
            target_lead = created_lead_records[idx]
            recip = CampaignRecipient(
                id=uuid.uuid4(),
                campaign_id=camp2.id,
                workspace_id=ws.id,
                lead_id=target_lead.id,
                phone_number=target_lead.phone,
                normalized_phone=target_lead.phone,
                recipient_name=target_lead.name,
                variables={"customer_name": target_lead.name, "company": target_lead.company or "Company", "deal_value": "Free Tier Upgrade", "product_name": "Multi-Agent Hub"},
                status="read" if idx < 2 else "delivered",
                cost=0.50,
                accepted_at=datetime.now(timezone.utc) - timedelta(hours=2),
                sent_at=datetime.now(timezone.utc) - timedelta(hours=2),
                delivered_at=datetime.now(timezone.utc) - timedelta(hours=2),
                read_at=datetime.now(timezone.utc) - timedelta(hours=1) if idx < 2 else None,
            )
            db.add(recip)

        print(f"[+] Seeded 2 Campaigns with realistic recipient delivery & read metrics")

        # 12. Seed CRM Saved Views
        db.query(CrmSavedView).filter(CrmSavedView.workspace_id == ws.id).delete()
        views = [
            {
                "name": "🔥 Top High-Scoring Leads (Score >= 50)",
                "filters": {"tier": ["hot"], "score_min": 50, "status": ["new", "active", "converted"]},
            },
            {
                "name": "📅 Product Demos & Consultations Booked",
                "filters": {"demo_requested": True},
            },
            {
                "name": "💼 High Budget Enterprise Pipeline (> ₹50k)",
                "filters": {"budget_min": 50000},
            }
        ]
        for v in views:
            sv = CrmSavedView(
                id=uuid.uuid4(),
                workspace_id=ws.id,
                user_id=user.id,
                name=v["name"],
                filters=v["filters"],
            )
            db.add(sv)
        print(f"[+] Seeded 3 CRM Saved Views")

        # 13. Seed Integrations (Google Calendar & WhatsApp Cloud API)
        db.query(Integration).filter(Integration.workspace_id == ws.id).delete()
        int1 = Integration(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            integration_type="google_calendar",
            connected_email=user.email,
            connected_account_id=f"g_acc_{user.email.split('@')[0]}",
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        int2 = Integration(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            integration_type="whatsapp_cloud_api",
            connected_email=user.email,
            connected_account_id="waba_act_991823746",
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add_all([int1, int2])
        print(f"[+] Seeded Integrations (Google Calendar & WhatsApp Cloud API)")

        # 14. Ensure WCC Wallet has credits
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
        if not wallet:
            wallet = WCCWallet(
                id=uuid.uuid4(),
                workspace_id=ws.id,
                balance=5000.0,
                included_balance=2500.0,
                purchased_balance=2500.0,
                held_balance=0.0,
                overage_balance=0.0,
                currency="INR",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(wallet)
        else:
            if (wallet.balance or 0) < 1000:
                wallet.balance = 5000.0
                wallet.purchased_balance = 5000.0
                wallet.updated_at = datetime.now(timezone.utc)
        print(f"[+] Ensured WCC Wallet (Balance: {wallet.balance} INR)")

        db.commit()
        print("\n" + "=" * 70)
        print("🎉 SEEDING COMPLETED SUCCESSFULLY!")
        print(f"Workspace: '{ws.name}' ({ws.id})")
        print(f"User: '{user.email}'")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_workspace()
