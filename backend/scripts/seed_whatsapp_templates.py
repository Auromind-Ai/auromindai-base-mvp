#!/usr/bin/env python3
"""
Script: seed_whatsapp_templates.py
Description: Clears old templates and seeds fresh WhatsApp templates adhering to
             the new dynamic variable mapping system (including MARKETING, UTILITY,
             and AUTHENTICATION templates with otp_code).
"""

import os
import sys
import uuid
import json
from datetime import datetime, timezone

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

if not os.path.exists("/.dockerenv") and "@db:5432" in os.environ.get("DATABASE_URL", ""):
    os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].replace("@db:5432", "@localhost:5435")

from app.database import SessionLocal
from app.models.templates import Template
from app.models.workspace import Workspace
from app.models.user import User

TEMPLATES_DATA = [
    # ── 1. Plan Activation Notice (MARKETING - Approved) ──
    {
        "name": "plan_activation_notice",
        "category": "MARKETING",
        "type": "TEXT",
        "language": "en_US",
        "header": "Welcome to OrbionAgents! 🎉",
        "content": "Hi {{1}}, welcome to OrbionAgents! Your {{2}} plan is now active. Total amount paid: {{3}}. Let us know how our AI agents can assist your team today!",
        "variable_mapping": json.dumps({
            "1": "customer_name",
            "2": "plan_name",
            "3": "amount"
        }),
        "footer": "Powered by Orbion AI",
        "cta": "https://orbionagents.com/dashboard",
        "cta_btn_title": "Open Dashboard",
        "status": "approved",
        "system_tag": "onboarding",
        "meta_template_id": "meta_tpl_plan_act_201",
    },
    # ── 2. Welcome Offer & Deal (MARKETING - Approved) ──
    {
        "name": "welcome_special_offer",
        "category": "MARKETING",
        "type": "TEXT",
        "language": "en_US",
        "header": "Exclusive Partner Offer 🌟",
        "content": "Hi {{1}}, thank you for connecting with us! Your company {{2}} has unlocked an exclusive {{3}} deal on all {{4}} subscriptions. Claim your pass below.",
        "variable_mapping": json.dumps({
            "1": "customer_name",
            "2": "company",
            "3": "deal_value",
            "4": "product_name"
        }),
        "footer": "Reply STOP to unsubscribe",
        "cta": "https://orbionagents.com/offers",
        "cta_btn_title": "Claim Offer",
        "status": "approved",
        "system_tag": "trending",
        "meta_template_id": "meta_tpl_welcome_202",
    },
    # ── 3. Order Status Update (UTILITY - Approved - Media Image) ──
    {
        "name": "order_status_update",
        "category": "UTILITY",
        "type": "IMAGE",
        "language": "en_US",
        "header": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        "media_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        "content": "Hello {{1}}, your order #{{2}} for {{3}} has been confirmed and dispatched! Estimated delivery is {{4}}. Live tracking link is available below.",
        "variable_mapping": json.dumps({
            "1": "customer_name",
            "2": "order_id",
            "3": "product_name",
            "4": "appointment_date"
        }),
        "footer": "Customer Support • Orbion Care",
        "cta": "https://orbionagents.com/track",
        "cta_btn_title": "Track Order",
        "status": "approved",
        "system_tag": "ecommerce",
        "meta_template_id": "meta_tpl_order_203",
    },
    # ── 4. Appointment Schedule Reminder (UTILITY - Approved) ──
    {
        "name": "appointment_reminder",
        "category": "UTILITY",
        "type": "TEXT",
        "language": "en_US",
        "header": "Upcoming Appointment 📅",
        "content": "Hi {{1}}, this is a friendly reminder for your scheduled consultation on {{2}} regarding {{3}}. Please let us know in advance if you need to reschedule.",
        "variable_mapping": json.dumps({
            "1": "customer_name",
            "2": "appointment_date",
            "3": "product_name"
        }),
        "footer": "Orbion AI Care Team",
        "cta": "https://orbionagents.com/reschedule",
        "cta_btn_title": "View Details",
        "status": "approved",
        "system_tag": "service",
        "meta_template_id": "meta_tpl_appt_204",
    },
    # ── 5. Account Verification OTP (AUTHENTICATION - Approved) ──
    {
        "name": "account_verification_otp",
        "category": "AUTHENTICATION",
        "type": "TEXT",
        "language": "en_US",
        "header": None,
        "content": "{{1}} is your verification code. For your security, do not share this code.",
        "variable_mapping": json.dumps({
            "1": "otp_code"
        }),
        "footer": "Expires in 10 minutes",
        "cta": None,
        "cta_btn_title": "Copy Code",
        "status": "approved",
        "system_tag": "security",
        "meta_template_id": "meta_tpl_auth_otp_205",
    },
    # ── 6. Festive Season Sale (MARKETING - Pending) ──
    {
        "name": "seasonal_festive_sale",
        "category": "MARKETING",
        "type": "TEXT",
        "language": "en_US",
        "header": "Mega Festive Season Sale! 🌟",
        "content": "Dear {{1}}, our biggest festive season sale is live now! Get up to {{2}} off on all {{3}} upgrades. Don't miss out on these limited-time deals.",
        "variable_mapping": json.dumps({
            "1": "customer_name",
            "2": "deal_value",
            "3": "plan_name"
        }),
        "footer": "Valid till midnight",
        "cta": "https://orbionagents.com/deals",
        "cta_btn_title": "Shop Now",
        "status": "pending",
        "system_tag": "seasonal",
        "meta_template_id": "meta_tpl_festive_206",
    },
]


def seed_templates():
    db = SessionLocal()
    try:
        workspaces = db.query(Workspace).all()
        if not workspaces:
            print("No workspaces found in the database. Please create a workspace first.")
            return

        users = db.query(User).all()
        default_user_id = users[0].id if users else None

        # 1. Cleanly delete old templates across all workspaces
        deleted_count = db.query(Template).delete()
        db.commit()
        print(f"Cleaned up {deleted_count} old template(s) from database.")

        # 2. Seed fresh templates with variable mapping
        total_seeded = 0
        for ws in workspaces:
            print(f"\nSeeding new format templates into Workspace: '{ws.name}' ({ws.id})")
            for t_data in TEMPLATES_DATA:
                new_tmpl = Template(
                    id=uuid.uuid4(),
                    workspace_id=ws.id,
                    user_id=default_user_id,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                    **t_data
                )
                db.add(new_tmpl)
                total_seeded += 1
                print(f"  + [{t_data['category']}] '{t_data['name']}' (Status: {t_data['status']}, Vars: {t_data['variable_mapping']})")

        db.commit()
        print(f"\nSuccessfully seeded {total_seeded} templates across {len(workspaces)} workspace(s).")
        print("Categories included: MARKETING (3), UTILITY (2), AUTHENTICATION (1).")

    except Exception as e:
        db.rollback()
        print(f"Error seeding templates: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_templates()
