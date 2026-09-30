#!/usr/bin/env python3
"""
Script: seed_whatsapp_templates.py
Description: Seeds 4 WhatsApp templates (2 approved + 2 pending) into the database.
             If a template already exists by name in a workspace, its status and content are updated.
"""

import os
import sys
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
    # ── 1. Approved Marketing Template ──
    {
        "name": "welcome_special_offer",
        "category": "MARKETING",
        "type": "TEXT",
        "language": "en_US",
        "header": "Welcome to Auromind AI! 🎉",
        "content": "Hi {{1}}, thank you for connecting with us! Enjoy an exclusive {{2}}% discount on your first service with code {{3}}. Let us know how we can assist you today.",
        "footer": "Reply STOP to unsubscribe",
        "cta": "https://auromindai.com",
        "cta_btn_title": "Claim Offer",
        "status": "approved",
        "system_tag": "trending",
        "meta_template_id": "meta_tpl_welcome_101",
    },
    # ── 2. Approved Utility Template ──
    {
        "name": "order_status_update",
        "category": "UTILITY",
        "type": "IMAGE",
        "language": "en_US",
        "header": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        "media_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        "content": "Hello {{1}}, your order #{{2}} has been confirmed and is now being processed! Estimated delivery date is {{3}}. Tracking link is available below.",
        "footer": "Customer Support • Auromind AI",
        "cta": "https://auromindai.com/track",
        "cta_btn_title": "Track Order",
        "status": "approved",
        "system_tag": "ecommerce",
        "meta_template_id": "meta_tpl_order_102",
    },
    # ── 3. Pending Marketing Template ──
    {
        "name": "seasonal_festive_sale",
        "category": "MARKETING",
        "type": "TEXT",
        "language": "en_US",
        "header": "Mega Festive Sale! 🌟",
        "content": "Dear {{1}}, our biggest festive season sale is live now! Get up to {{2}}% off on all trending services and products. Don't miss out on these limited-time deals.",
        "footer": "Valid till midnight",
        "cta": "https://auromindai.com/deals",
        "cta_btn_title": "Shop Now",
        "status": "pending",
        "system_tag": "seasonal",
        "meta_template_id": "meta_tpl_festive_103",
    },
    # ── 4. Pending Utility Template ──
    {
        "name": "appointment_reminder",
        "category": "UTILITY",
        "type": "TEXT",
        "language": "en_US",
        "header": "Appointment Reminder 📅",
        "content": "Hi {{1}}, this is a friendly reminder for your scheduled appointment on {{2}} at {{3}}. Please let us know in advance if you need to reschedule.",
        "footer": "Auromind AI Care Team",
        "cta": "https://auromindai.com/reschedule",
        "cta_btn_title": "View Details",
        "status": "pending",
        "system_tag": "healthcare_service",
        "meta_template_id": "meta_tpl_appt_104",
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

        total_seeded = 0
        for ws in workspaces:
            print(f"\nProcessing Workspace: '{ws.name}' ({ws.id})")
            for t_data in TEMPLATES_DATA:
                existing = db.query(Template).filter(
                    Template.workspace_id == ws.id,
                    Template.name == t_data["name"]
                ).first()

                if existing:
                    print(f"  [Updating] Template '{t_data['name']}' (Status: {t_data['status']})")
                    for k, v in t_data.items():
                        setattr(existing, k, v)
                    existing.updated_at = datetime.now(timezone.utc)
                else:
                    print(f"  [Creating] Template '{t_data['name']}' (Status: {t_data['status']})")
                    new_tmpl = Template(
                        id=uuid.uuid4(),
                        workspace_id=ws.id,
                        user_id=default_user_id,
                        created_at=datetime.now(timezone.utc),
                        **t_data
                    )
                    db.add(new_tmpl)
                    total_seeded += 1

        db.commit()
        print(f"\nSuccessfully seeded/updated WhatsApp templates across {len(workspaces)} workspace(s).")
        print("Summary: 2 Approved + 2 Pending = 4 Templates per workspace.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding templates: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_templates()
