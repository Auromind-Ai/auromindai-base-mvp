#!/usr/bin/env python3
"""
Script: seed_channels_connection.py
Description: Seeds WhatsApp and Instagram connection data for workspaces,
             along with active integrations, an AI Agent configured with WhatsApp & Instagram,
             realistic multi-turn conversations, messages, and CRM leads.
"""

import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(backend_dir, ".env"))
except ImportError:
    pass

# Inside container, DATABASE_URL from environment should be preserved as-is.
# Only replace @db:5432 if we are running outside Docker on the Windows host.
if not os.path.exists("/.dockerenv"):
    if "@db:5432" in os.environ.get("DATABASE_URL", ""):
        os.environ["DATABASE_URL"] = os.environ["DATABASE_URL"].replace("@db:5432", "@localhost:5435")
    elif "DATABASE_URL" not in os.environ:
        os.environ["DATABASE_URL"] = "postgresql://postgres:Arunjack007%40localhost:5435/auromindai"

from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.integration import Integration
from app.models.ai_agent import AIAgent
from app.models.conversation import Conversation, ChannelType, ConversationStatus
from app.models.message import Message, SenderType, MessageStatus
from app.models.ai_action import Lead
from app.models.user import User


def seed_whatsapp_and_instagram(workspace_id_filter: str | None = None):
    db = SessionLocal()
    try:
        query = db.query(Workspace)
        if workspace_id_filter:
            query = query.filter(Workspace.id == uuid.UUID(workspace_id_filter))
        
        workspaces = query.all()
        if not workspaces:
            print("[!] No workspaces found to seed.")
            return

        now = datetime.now(timezone.utc)
        print(f"[*] Seeding WhatsApp and Instagram data across {len(workspaces)} workspace(s)...")

        # Mock / Config meta access token
        meta_token = os.getenv("META_SYSTEM_USER_TOKEN") or "EAABw_orbion_mock_token_seeded_active_session_demo"
        ig_token = "IGQVJ_seeded_instagram_long_lived_token_active_demo"

        for idx, ws in enumerate(workspaces):
            ws_id = ws.id
            ws_suffix = str(idx + 1)
            phone_num = f"+91 98765 4321{idx}"
            phone_id = f"10482910482910{idx}"
            waba_id = f"10293847561029{idx}"
            biz_id = f"10839281726354{idx}"
            clean_name = ws.name.lower().replace(' ', '_').replace("'", '')[:12]
            ig_handle = f"auromind_{clean_name}" if idx > 0 else "veeraragavan_official"

            print(f"\n--- Workspace: '{ws.name}' ({ws_id}) ---")

            # 1. Update Workspace WhatsApp & Instagram Meta fields
            ws.meta_access_token = meta_token
            ws.meta_business_id = biz_id
            ws.meta_waba_id = waba_id
            ws.meta_phone_number_id = phone_id
            ws.meta_display_phone = phone_num
            ws.meta_2fa_enabled = True
            ws.meta_business_verification_status = "verified"
            ws.meta_onboarding_completed_at = now
            ws.meta_onboarding_dismissed = False
            ws.meta_ig_id = ig_handle
            ws.meta_ig_access_token = ig_token
            ws.meta_tier_limit = 1000

            print(f"  [+] Workspace channels configured: WhatsApp ({phone_num}) & Instagram (@{ig_handle})")

            # 2. Add / Update Integration records
            wa_integration = db.query(Integration).filter(
                Integration.workspace_id == ws_id,
                Integration.integration_type == "whatsapp"
            ).first()
            if not wa_integration:
                wa_integration = Integration(
                    workspace_id=ws_id,
                    integration_type="whatsapp",
                    connected_account_id=phone_id,
                    connected_email=f"whatsapp.{ws_suffix}@auromindai.com",
                    access_token=meta_token,
                    is_active=True
                )
                db.add(wa_integration)
                print(f"  [+] Added WhatsApp Integration record")
            else:
                wa_integration.is_active = True
                wa_integration.connected_account_id = phone_id
                print(f"  [*] Updated existing WhatsApp Integration record")

            ig_integration = db.query(Integration).filter(
                Integration.workspace_id == ws_id,
                Integration.integration_type == "instagram"
            ).first()
            if not ig_integration:
                ig_integration = Integration(
                    workspace_id=ws_id,
                    integration_type="instagram",
                    connected_account_id=ig_handle,
                    connected_email=f"instagram.{ws_suffix}@auromindai.com",
                    access_token=ig_token,
                    is_active=True
                )
                db.add(ig_integration)
                print(f"  [+] Added Instagram Integration record")
            else:
                ig_integration.is_active = True
                ig_integration.connected_account_id = ig_handle
                print(f"  [*] Updated existing Instagram Integration record")

            # 3. Create or Update active AI Agent with WhatsApp & Instagram enabled
            creator = ws.created_by or db.query(User.id).first()[0]
            existing_agent = db.query(AIAgent).filter(
                AIAgent.workspace_id == ws_id,
                AIAgent.name.ilike("%Auro Omnichannel%")
            ).first()

            if not existing_agent:
                agent = AIAgent(
                    workspace_id=ws_id,
                    created_by=creator,
                    name="Auro Omnichannel Assistant",
                    description="AI assistant managing 24/7 customer sales inquiries, lead qualification, and support over WhatsApp & Instagram.",
                    agent_type="sales_assistant",
                    avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=AuroAgent",
                    language="English (India)",
                    tone_of_voice="Friendly & Professional",
                    business_name="Auromind AI",
                    website_url="https://auromindai.com",
                    status="active",
                    is_draft=False,
                    channels_config={
                        "whatsapp": {"enabled": True},
                        "instagram": {"enabled": True},
                        "twilio": {"enabled": False}
                    },
                    channel_settings={
                        "auto_reply": True,
                        "sync_crm": True,
                        "channel_specific_tone": True,
                        "channel_tones": {
                            "whatsapp": "Friendly & Professional",
                            "instagram": "Casual & Conversational",
                            "twilio": "Concise & Direct"
                        }
                    },
                    ai_config={
                        "provider": "groq",
                        "model": "openai/gpt-oss-120b",
                        "temperature": 0.7,
                        "max_tokens": 1024,
                        "top_p": 1.0,
                        "frequency_penalty": 0.0,
                        "presence_penalty": 0.0,
                        "system_prompt": "You are Auro, the official omnichannel AI sales and customer assistant for Auromind AI. You handle incoming inquiries from customers across WhatsApp and Instagram, provide accurate product details, qualify high-value leads, share pricing, and schedule live interactive demos."
                    },
                    knowledge_config={
                        "collection": f"agent_{ws_id.hex[:12]}",
                        "faqs": [
                            {
                                "question": "What channels does Auromind AI support?",
                                "answer": "Auromind AI provides unified conversational intelligence across WhatsApp Business and Instagram Direct Messages, with automated CRM lead capturing."
                            },
                            {
                                "question": "How do I schedule a product demo?",
                                "answer": "Simply tell us your preferred day and time right here, and our team will immediately set up a live interactive demo."
                            }
                        ],
                        "settings": {
                            "use_knowledge_base": True,
                            "auto_sync": True
                        }
                    },
                    conversations_count={"total": 14, "active": 6}
                )
                db.add(agent)
                print("  [+] Created active AI Agent: 'Auro Omnichannel Assistant' (WhatsApp + Instagram enabled)")
            else:
                existing_agent.status = "active"
                existing_agent.is_draft = False
                existing_agent.channels_config = {
                    "whatsapp": {"enabled": True},
                    "instagram": {"enabled": True},
                    "twilio": {"enabled": False}
                }
                print("  [*] Updated existing AI Agent channels to WhatsApp & Instagram enabled")

            # 4. Populate / Enrich Instagram Conversations & Messages
            # Let's check existing Instagram conversation 'regfr' if present in this workspace
            regfr_conv = db.query(Conversation).filter(
                Conversation.workspace_id == ws_id,
                Conversation.channel == ChannelType.INSTAGRAM,
                Conversation.contact_name == "regfr"
            ).first()

            if regfr_conv and len(regfr_conv.messages) == 0:
                # Add dialogue to regfr
                db.add_all([
                    Message(
                        conversation_id=regfr_conv.id,
                        sender_type=SenderType.USER,
                        content="Hi there! Saw your reel regarding AI customer support on Instagram & WhatsApp. How does pricing work?",
                        status=MessageStatus.DELIVERED,
                        timestamp=now - timedelta(minutes=45)
                    ),
                    Message(
                        conversation_id=regfr_conv.id,
                        sender_type=SenderType.AI,
                        content="Hello! Thanks for reaching out via Instagram DM! 🚀 Our platform connects directly with both WhatsApp and Instagram to automate inquiries, capture qualified leads, and sync to CRM. We have Starter, Growth, and Enterprise tiers. Would you like a quick demo?",
                        status=MessageStatus.DELIVERED,
                        timestamp=now - timedelta(minutes=43)
                    ),
                    Message(
                        conversation_id=regfr_conv.id,
                        sender_type=SenderType.USER,
                        content="A demo would be awesome! Can you do tomorrow afternoon? You can reach me at 6369517711.",
                        status=MessageStatus.DELIVERED,
                        timestamp=now - timedelta(minutes=30)
                    ),
                    Message(
                        conversation_id=regfr_conv.id,
                        sender_type=SenderType.AI,
                        content="Fantastic! We've scheduled your demo for tomorrow afternoon. Our specialist will connect with you on WhatsApp at 6369517711. Looking forward to showing you the power of Auromind AI! ✨",
                        status=MessageStatus.DELIVERED,
                        timestamp=now - timedelta(minutes=28)
                    )
                ])
                print("  [+] Added multi-turn message thread to existing Instagram conversation 'regfr'")

            # Seed additional Instagram conversations if workspace has fewer than 3 Instagram conversations
            ig_conv_count = db.query(Conversation).filter(
                Conversation.workspace_id == ws_id,
                Conversation.channel == ChannelType.INSTAGRAM
            ).count()

            if ig_conv_count < 3:
                ig_demo_data = [
                    {
                        "contact_name": "Priya Sharma (@priya_tech_boutique)",
                        "phone": f"91984501234{idx}",
                        "external_id": f"ig_user_priya_{idx}",
                        "status": ConversationStatus.OPEN,
                        "messages": [
                            ("USER", "Hello! We run an apparel boutique and get 150+ DMs every day on Instagram. Can your AI answer product sizing, stock availability, and accept orders?", 120),
                            ("AI", "Hi Priya! Absolutely! Auromind AI connects seamlessly to your Instagram Direct Messages. It answers product inquiries, checks stock, shares catalogs, and collects order details automatically.", 118),
                            ("USER", "That sounds like a lifesaver. What is the setup time and can it also handle WhatsApp?", 90),
                            ("AI", "Setup takes less than 15 minutes! And yes, it works across both WhatsApp Business and Instagram simultaneously from one unified dashboard.", 88),
                            ("USER", "Perfect! I want to try this out this week. My email is priya@techboutique.in.", 40),
                            ("AI", "Awesome! I've sent your onboarding invitation to priya@techboutique.in. Let us know if you need any assistance getting started! 🎉", 38)
                        ],
                        "lead": {
                            "name": "Priya Sharma",
                            "email": f"priya.boutique{idx}@example.com",
                            "phone": f"91984501234{idx}",
                            "company": "Priya Boutique",
                            "requirement": "Instagram DM + WhatsApp automated order taking and sizing queries",
                            "budget": "₹30,000 / month",
                            "timeline": "Immediate (Within 48 hours)",
                            "score": 92,
                            "lead_tier": "hot",
                            "status": "active",
                            "labels": ["Instagram Inbound", "High Intent", "E-Commerce", "Hot Lead"]
                        }
                    },
                    {
                        "contact_name": "Karthik Raja (@karthik_designs)",
                        "phone": f"91978905432{idx}",
                        "external_id": f"ig_user_karthik_{idx}",
                        "status": ConversationStatus.OPEN,
                        "messages": [
                            ("USER", "Hey team! Do you have an API or direct integration to trigger WhatsApp followups when someone comments on our Instagram posts?", 75),
                            ("AI", "Hello Karthik! Yes, our omnichannel automation links Instagram post comments to automatic DM responses and WhatsApp followups seamlessly.", 73),
                            ("USER", "Great! Sending you our team's requirements. We want to test next Monday.", 25)
                        ],
                        "lead": {
                            "name": "Karthik Raja",
                            "email": f"karthik.designs{idx}@example.com",
                            "phone": f"91978905432{idx}",
                            "company": "Karthik Design Studio",
                            "requirement": "Social media comment-to-DM automation & WhatsApp bridge",
                            "budget": "₹15,000 - ₹25,000 / month",
                            "timeline": "Next week",
                            "score": 78,
                            "lead_tier": "warm",
                            "status": "new",
                            "labels": ["Instagram DM", "Marketing Agency", "Warm Lead"]
                        }
                    }
                ]

                for item in ig_demo_data:
                    existing_conv = db.query(Conversation).filter(
                        Conversation.workspace_id == ws_id,
                        Conversation.channel == ChannelType.INSTAGRAM,
                        Conversation.phone == item["phone"]
                    ).first()

                    if not existing_conv:
                        conv = Conversation(
                            workspace_id=ws_id,
                            channel=ChannelType.INSTAGRAM,
                            phone=item["phone"],
                            external_id=item["external_id"],
                            contact_name=item["contact_name"],
                            status=item["status"],
                            last_message_at=now - timedelta(minutes=25)
                        )
                        db.add(conv)
                        db.flush()

                        for s_type, body, mins_ago in item["messages"]:
                            db.add(Message(
                                conversation_id=conv.id,
                                sender_type=SenderType.USER if s_type == "USER" else SenderType.AI,
                                content=body,
                                status=MessageStatus.DELIVERED,
                                timestamp=now - timedelta(minutes=mins_ago)
                            ))

                        ld = item["lead"]
                        db.add(Lead(
                            workspace_id=ws_id,
                            conversation_id=conv.id,
                            name=ld["name"],
                            phone=ld["phone"],
                            normalized_phone=ld["phone"],
                            email=ld["email"],
                            normalized_email=ld["email"],
                            company=ld["company"],
                            source="instagram",
                            requirement=ld["requirement"],
                            budget=ld["budget"],
                            timeline=ld["timeline"],
                            score=ld["score"],
                            lead_score=float(ld["score"]),
                            lead_tier=ld["lead_tier"],
                            status=ld["status"],
                            labels=ld["labels"],
                            last_activity_at=now - timedelta(minutes=25)
                        ))
                        print(f"  [+] Seeded Instagram Conversation & Lead: {item['contact_name']}")

            # 5. Populate / Enrich WhatsApp Conversations & Messages if needed
            wa_conv_count = db.query(Conversation).filter(
                Conversation.workspace_id == ws_id,
                Conversation.channel == ChannelType.WHATSAPP
            ).count()

            if wa_conv_count < 3:
                wa_demo_data = [
                    {
                        "contact_name": "Ramesh Sharma (Enterprise Hot Lead)",
                        "phone": f"91987654320{idx}",
                        "messages": [
                            ("USER", "Hi, we want to place a bulk order for an enterprise license for 500 users. We need this urgent and asap. Please give us a callback.", 60),
                            ("AI", "Hello Ramesh! Thank you for reaching out to Auromind AI on WhatsApp. Our enterprise plan supports 500+ users with dedicated SLA, custom AI models, and full WhatsApp & Instagram automation. I have notified our Enterprise Director to call you at +91 98765 43200 shortly.", 58),
                            ("USER", "Thanks! Looking forward to the call today.", 30),
                            ("AI", "You're very welcome! Our director Mr. Veeraragavan will reach out within the hour. Have a great day ahead! 🚀", 28)
                        ],
                        "lead": {
                            "name": "Ramesh Sharma (Enterprise Hot Lead)",
                            "email": f"ramesh.enterprise{idx}@tata-corp.com",
                            "phone": f"91987654320{idx}",
                            "company": "Tata Enterprise Corp",
                            "requirement": "Bulk enterprise license for 500 users across WhatsApp and Instagram",
                            "budget": "₹1,50,000 / month",
                            "timeline": "Immediate (Urgent)",
                            "score": 96,
                            "lead_tier": "hot",
                            "status": "active",
                            "labels": ["WhatsApp Inbound", "Enterprise License", "Bulk Order", "Urgent"]
                        }
                    },
                    {
                        "contact_name": "Ananya Patel (Warm Inquiring Lead)",
                        "phone": f"91912345678{idx}",
                        "messages": [
                            ("USER", "Hi, what are the pricing tiers for your WhatsApp AI agent? We need automated customer onboarding.", 90),
                            ("AI", "Hello Ananya! 👋 Our WhatsApp AI agent includes automated onboarding, lead qualification, and smart FAQ resolution. Starter begins at ₹4,999/mo and Pro is ₹14,999/mo. Would you like a 14-day free trial?", 87),
                            ("USER", "Yes, 14-day trial sounds great! Can I test it with our support team?", 45),
                            ("AI", "Absolutely! You can invite your team members to the workspace under Team Settings. Here is your trial activation link: https://app.auromindai.com/trial", 42)
                        ],
                        "lead": {
                            "name": "Ananya Patel (Warm Inquiring Lead)",
                            "email": f"ananya.patel{idx}@startupglow.io",
                            "phone": f"91912345678{idx}",
                            "company": "Glow Cosmetics",
                            "requirement": "Automated customer onboarding via WhatsApp Business",
                            "budget": "₹15,000 / month",
                            "timeline": "Within 2 weeks",
                            "score": 82,
                            "lead_tier": "warm",
                            "status": "new",
                            "labels": ["WhatsApp Inbound", "Trial Requested", "Warm Lead"]
                        }
                    }
                ]

                for item in wa_demo_data:
                    existing_conv = db.query(Conversation).filter(
                        Conversation.workspace_id == ws_id,
                        Conversation.channel == ChannelType.WHATSAPP,
                        Conversation.phone == item["phone"]
                    ).first()

                    if not existing_conv:
                        conv = Conversation(
                            workspace_id=ws_id,
                            channel=ChannelType.WHATSAPP,
                            phone=item["phone"],
                            contact_name=item["contact_name"],
                            status=ConversationStatus.OPEN,
                            last_message_at=now - timedelta(minutes=28)
                        )
                        db.add(conv)
                        db.flush()

                        for s_type, body, mins_ago in item["messages"]:
                            db.add(Message(
                                conversation_id=conv.id,
                                sender_type=SenderType.USER if s_type == "USER" else SenderType.AI,
                                content=body,
                                status=MessageStatus.DELIVERED,
                                timestamp=now - timedelta(minutes=mins_ago)
                            ))

                        ld = item["lead"]
                        db.add(Lead(
                            workspace_id=ws_id,
                            conversation_id=conv.id,
                            name=ld["name"],
                            phone=ld["phone"],
                            normalized_phone=ld["phone"],
                            email=ld["email"],
                            normalized_email=ld["email"],
                            company=ld["company"],
                            source="whatsapp",
                            requirement=ld["requirement"],
                            budget=ld["budget"],
                            timeline=ld["timeline"],
                            score=ld["score"],
                            lead_score=float(ld["score"]),
                            lead_tier=ld["lead_tier"],
                            status=ld["status"],
                            labels=ld["labels"],
                            last_activity_at=now - timedelta(minutes=28)
                        ))
                        print(f"  [+] Seeded WhatsApp Conversation & Lead: {item['contact_name']}")

        db.commit()
        print("\n[✓] WhatsApp and Instagram seeding successfully completed!")

    except Exception as exc:
        db.rollback()
        print(f"\n[x] Error during seeding: {exc}", file=sys.stderr)
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Seed WhatsApp & Instagram connection data.")
    parser.add_argument("--workspace-id", type=str, default=None, help="Target workspace UUID")
    args = parser.parse_args()
    seed_whatsapp_and_instagram(args.workspace_id)
