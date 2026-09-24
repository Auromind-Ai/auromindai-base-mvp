import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.user import User
from app.models.campaign import Campaign, CampaignRecipient, ContactList, ContactListMember
from app.models.templates import Template
from app.models.ai_action import Lead
from app.core.logger import logger

def seed_marketing_data():
    db: Session = SessionLocal()
    try:
        workspaces = db.query(Workspace).all()
        if not workspaces:
            logger.info("No workspaces found in DB.")
            return

        logger.info(f"Seeding marketing campaigns and templates across {len(workspaces)} workspaces...")

        for ws in workspaces:
            user = db.query(User).filter(User.id == ws.created_by).first() if ws.created_by else db.query(User).first()
            user_id = user.id if user else None

            # Ensure Meta WhatsApp line is connected on workspace
            if not ws.meta_display_phone or not ws.meta_phone_number_id or not ws.meta_access_token:
                ws.meta_access_token = ws.meta_access_token or "EAAN_MOCK_CONNECTED_TOKEN_WHATSAPP_LIVE"
                ws.meta_display_phone = ws.meta_display_phone or "+91 98765 43210"
                ws.meta_phone_number_id = ws.meta_phone_number_id or "109283746501928"
                ws.meta_waba_id = ws.meta_waba_id or "104857692019283"
                ws.meta_business_id = ws.meta_business_id or "102938475610293"
                ws.meta_tier_limit = ws.meta_tier_limit or 10000
                db.flush()

            # 1. Seed Templates if none exist
            existing_templates = db.query(Template).filter(Template.workspace_id == ws.id).all()
            if not existing_templates:
                sample_templates = [
                    {
                        "name": "festive_discount_v1",
                        "type": "TEXT",
                        "category": "MARKETING",
                        "language": "en",
                        "header": "Festive Super Savings! 🎉",
                        "content": "Hi {{1}}, celebrate this festive season with an exclusive 25% discount on all our premium services! Use code {{2}} at checkout. Valid till {{3}}.",
                        "footer": "Reply STOP to unsubscribe",
                        "cta": "https://example.com/festive",
                        "cta_btn_title": "Claim Offer",
                        "status": "APPROVED",
                    },
                    {
                        "name": "cart_abandonment_recovery",
                        "type": "TEXT",
                        "category": "MARKETING",
                        "language": "en",
                        "header": "You left something behind! 🛒",
                        "content": "Hello {{1}}, we noticed you left items in your cart. Complete your purchase now and get an extra 10% off with coupon code {{2}}!",
                        "footer": "Offer expires in 24 hours",
                        "cta": "https://example.com/checkout",
                        "cta_btn_title": "Complete Order",
                        "status": "APPROVED",
                    },
                    {
                        "name": "vip_early_access_promo",
                        "type": "TEXT",
                        "category": "MARKETING",
                        "language": "en",
                        "header": "VIP Exclusive Access 🌟",
                        "content": "Dear {{1}}, as a valued VIP member, you get 24-hour early access to our biggest flash sale. Discover top deals before anyone else!",
                        "footer": "Auromind VIP Club",
                        "cta": "https://example.com/vip-sale",
                        "cta_btn_title": "Shop Now",
                        "status": "APPROVED",
                    },
                    {
                        "name": "monthly_product_newsletter",
                        "type": "TEXT",
                        "category": "MARKETING",
                        "language": "en",
                        "header": "What's New this Month 🚀",
                        "content": "Hi {{1}}, check out our latest feature updates and AI automation tools designed to double your sales conversion rate this month.",
                        "footer": "Auromind Product Team",
                        "cta": "https://example.com/newsletter",
                        "cta_btn_title": "Read Updates",
                        "status": "APPROVED",
                    },
                ]
                for t_data in sample_templates:
                    tmpl = Template(
                        workspace_id=ws.id,
                        user_id=user_id,
                        **t_data
                    )
                    db.add(tmpl)
                db.flush()

            # 2. Seed Contact Lists if none exist
            existing_lists = db.query(ContactList).filter(ContactList.workspace_id == ws.id).all()
            if not existing_lists:
                sample_lists = [
                    {"name": "VIP Customers List", "description": "High lifetime-value customers with 3+ purchases", "total_contacts": 1800},
                    {"name": "Diwali Festive Audience", "description": "Engaged contacts from last 90 days", "total_contacts": 2500},
                    {"name": "Product Launch Subscribers", "description": "Users opted-in for new AI features", "total_contacts": 3200},
                    {"name": "Cart Abandoners Q4", "description": "Users who abandoned cart within 7 days", "total_contacts": 950},
                ]
                for l_data in sample_lists:
                    cl = ContactList(workspace_id=ws.id, **l_data)
                    db.add(cl)
                db.flush()

            # 3. Seed Realistic Campaigns
            # Clear old dummy campaigns if needed or add if empty
            existing_campaigns = db.query(Campaign).filter(Campaign.workspace_id == ws.id).all()
            if not existing_campaigns:
                now = datetime.now(timezone.utc)
                
                campaign_seeds = [
                    {
                        "name": "Diwali Mega Sale 2025",
                        "campaign_type": "promotional",
                        "campaign_goal": "Festive discount offer & product clearance",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "existing_contacts",
                        "total_recipients": 2500,
                        "valid_recipients": 2450,
                        "invalid_recipients": 50,
                        "accepted_count": 2450,
                        "sent_count": 2450,
                        "delivered_count": 2384,
                        "read_count": 312,
                        "failed_count": 66,
                        "schedule_type": "now",
                        "estimated_cost": 1960.00,
                        "actual_cost": 1907.20,
                        "message_content": "Celebrate Diwali with 25% off on all products! Use code DIWALI25 at checkout.",
                        "created_at": now - timedelta(days=14, hours=3),
                        "completed_at": now - timedelta(days=14, hours=2),
                    },
                    {
                        "name": "VIP Black Friday Early Access",
                        "campaign_type": "promotional",
                        "campaign_goal": "VIP exclusive early bird discount",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "smart_segment",
                        "total_recipients": 1800,
                        "valid_recipients": 1780,
                        "invalid_recipients": 20,
                        "accepted_count": 1780,
                        "sent_count": 1780,
                        "delivered_count": 1742,
                        "read_count": 248,
                        "failed_count": 38,
                        "schedule_type": "now",
                        "estimated_cost": 1424.00,
                        "actual_cost": 1393.60,
                        "message_content": "Exclusive early access for VIP customers to our Black Friday collection.",
                        "created_at": now - timedelta(days=12, hours=5),
                        "completed_at": now - timedelta(days=12, hours=4),
                    },
                    {
                        "name": "New Product Launch - AI Copilot",
                        "campaign_type": "promotional",
                        "campaign_goal": "Feature announcement to active audience",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "existing_contacts",
                        "total_recipients": 3200,
                        "valid_recipients": 3150,
                        "invalid_recipients": 50,
                        "accepted_count": 3150,
                        "sent_count": 3150,
                        "delivered_count": 3080,
                        "read_count": 420,
                        "failed_count": 70,
                        "schedule_type": "now",
                        "estimated_cost": 2520.00,
                        "actual_cost": 2464.00,
                        "message_content": "Meet our new AI Copilot! Double your automated workflow output starting today.",
                        "created_at": now - timedelta(days=10, hours=2),
                        "completed_at": now - timedelta(days=10, hours=1),
                    },
                    {
                        "name": "Abandoned Cart 15% Recovery",
                        "campaign_type": "transactional",
                        "campaign_goal": "Cart recovery segment reminder",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "smart_segment",
                        "total_recipients": 950,
                        "valid_recipients": 935,
                        "invalid_recipients": 15,
                        "accepted_count": 935,
                        "sent_count": 935,
                        "delivered_count": 918,
                        "read_count": 156,
                        "failed_count": 17,
                        "schedule_type": "now",
                        "estimated_cost": 748.00,
                        "actual_cost": 734.40,
                        "message_content": "You left items in your cart. Finish your order with 15% extra discount.",
                        "created_at": now - timedelta(days=8, hours=6),
                        "completed_at": now - timedelta(days=8, hours=5),
                    },
                    {
                        "name": "Weekend Exclusive Flash Promo",
                        "campaign_type": "promotional",
                        "campaign_goal": "48-hour flash sale for repeat customers",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "upload_csv",
                        "total_recipients": 1500,
                        "valid_recipients": 1470,
                        "invalid_recipients": 30,
                        "accepted_count": 1470,
                        "sent_count": 1470,
                        "delivered_count": 1435,
                        "read_count": 189,
                        "failed_count": 35,
                        "schedule_type": "now",
                        "estimated_cost": 1176.00,
                        "actual_cost": 1148.00,
                        "message_content": "48 Hours Only: Flat 20% discount on all catalogue items.",
                        "created_at": now - timedelta(days=7, hours=1),
                        "completed_at": now - timedelta(days=7),
                    },
                    {
                        "name": "Monthly Newsletter - Oct Edition",
                        "campaign_type": "customer_support",
                        "campaign_goal": "Product updates & community highlights",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "existing_contacts",
                        "total_recipients": 2100,
                        "valid_recipients": 2060,
                        "invalid_recipients": 40,
                        "accepted_count": 2060,
                        "sent_count": 2060,
                        "delivered_count": 2010,
                        "read_count": 195,
                        "failed_count": 50,
                        "schedule_type": "now",
                        "estimated_cost": 1648.00,
                        "actual_cost": 1608.00,
                        "message_content": "October Newsletter: Top automation strategies and case studies.",
                        "created_at": now - timedelta(days=6, hours=4),
                        "completed_at": now - timedelta(days=6, hours=3),
                    },
                    {
                        "name": "Customer Appreciation Giveaway",
                        "campaign_type": "promotional",
                        "campaign_goal": "Loyalty tier member rewards",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "existing_contacts",
                        "total_recipients": 1250,
                        "valid_recipients": 1225,
                        "invalid_recipients": 25,
                        "accepted_count": 1225,
                        "sent_count": 1225,
                        "delivered_count": 1195,
                        "read_count": 164,
                        "failed_count": 30,
                        "schedule_type": "now",
                        "estimated_cost": 980.00,
                        "actual_cost": 956.00,
                        "message_content": "Thank you for being our loyal customer! Claim your special gift reward inside.",
                        "created_at": now - timedelta(days=5, hours=2),
                        "completed_at": now - timedelta(days=5, hours=1),
                    },
                    {
                        "name": "Webinar: AI Automation for Businesses",
                        "campaign_type": "promotional",
                        "campaign_goal": "Live interactive webinar registrations",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "smart_segment",
                        "total_recipients": 1600,
                        "valid_recipients": 1580,
                        "invalid_recipients": 20,
                        "accepted_count": 1580,
                        "sent_count": 1580,
                        "delivered_count": 1540,
                        "read_count": 210,
                        "failed_count": 40,
                        "schedule_type": "now",
                        "estimated_cost": 1264.00,
                        "actual_cost": 1232.00,
                        "message_content": "Join our masterclass this Friday on WhatsApp marketing automation at scale.",
                        "created_at": now - timedelta(days=4, hours=5),
                        "completed_at": now - timedelta(days=4, hours=4),
                    },
                    {
                        "name": "Re-engagement 90-Day Special Deal",
                        "campaign_type": "promotional",
                        "campaign_goal": "Win-back inactive audience",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "existing_contacts",
                        "total_recipients": 1100,
                        "valid_recipients": 1060,
                        "invalid_recipients": 40,
                        "accepted_count": 1060,
                        "sent_count": 1060,
                        "delivered_count": 1020,
                        "read_count": 98,
                        "failed_count": 40,
                        "schedule_type": "now",
                        "estimated_cost": 848.00,
                        "actual_cost": 816.00,
                        "message_content": "We miss you! Here is a ₹500 voucher on your next purchase.",
                        "created_at": now - timedelta(days=3, hours=7),
                        "completed_at": now - timedelta(days=3, hours=6),
                    },
                    {
                        "name": "Year-End Mega Clearance 50% Off",
                        "campaign_type": "promotional",
                        "campaign_goal": "Inventory clearance broadcast",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "audience_source": "upload_csv",
                        "total_recipients": 1400,
                        "valid_recipients": 1375,
                        "invalid_recipients": 25,
                        "accepted_count": 1375,
                        "sent_count": 1375,
                        "delivered_count": 1340,
                        "read_count": 142,
                        "failed_count": 35,
                        "schedule_type": "now",
                        "estimated_cost": 1100.00,
                        "actual_cost": 1072.00,
                        "message_content": "Massive stock clearance: Up to 50% off while supplies last.",
                        "created_at": now - timedelta(days=2, hours=3),
                        "completed_at": now - timedelta(days=2, hours=2),
                    },
                    {
                        "name": "Spring Collection 2026 Preview",
                        "campaign_type": "promotional",
                        "campaign_goal": "Upcoming seasonal launch teaser",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "scheduled",
                        "audience_source": "smart_segment",
                        "total_recipients": 2000,
                        "valid_recipients": 1970,
                        "invalid_recipients": 30,
                        "accepted_count": 0,
                        "sent_count": 0,
                        "delivered_count": 0,
                        "read_count": 0,
                        "failed_count": 0,
                        "schedule_type": "later",
                        "scheduled_at": now + timedelta(days=3, hours=10),
                        "estimated_cost": 1576.00,
                        "actual_cost": 0.0,
                        "message_content": "Get ready! The Spring 2026 Collection arrives this week.",
                        "created_at": now - timedelta(days=1, hours=2),
                    },
                    {
                        "name": "Cyber Week VIP Tech Specials",
                        "campaign_type": "promotional",
                        "campaign_goal": "Enterprise & Pro tier promo",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "scheduled",
                        "audience_source": "existing_contacts",
                        "total_recipients": 1750,
                        "valid_recipients": 1720,
                        "invalid_recipients": 30,
                        "accepted_count": 0,
                        "sent_count": 0,
                        "delivered_count": 0,
                        "read_count": 0,
                        "failed_count": 0,
                        "schedule_type": "later",
                        "scheduled_at": now + timedelta(days=5, hours=14),
                        "estimated_cost": 1376.00,
                        "actual_cost": 0.0,
                        "message_content": "Exclusive enterprise automation bundle offer coming this Cyber Week.",
                        "created_at": now - timedelta(hours=14),
                    },
                    {
                        "name": "Live Broadcast: Flash Coupon Drop",
                        "campaign_type": "promotional",
                        "campaign_goal": "Realtime promotional broadcast",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "in_progress",
                        "audience_source": "existing_contacts",
                        "total_recipients": 2200,
                        "valid_recipients": 2160,
                        "invalid_recipients": 40,
                        "accepted_count": 1420,
                        "sent_count": 1420,
                        "delivered_count": 1380,
                        "read_count": 115,
                        "failed_count": 22,
                        "schedule_type": "now",
                        "estimated_cost": 1728.00,
                        "actual_cost": 1104.00,
                        "message_content": "⚡ FLASH SALE IS LIVE! First 500 customers get free gift voucher.",
                        "created_at": now - timedelta(hours=2),
                        "started_at": now - timedelta(hours=1, minutes=45),
                    },
                    {
                        "name": "Mid-Month Pro Member Discounts",
                        "campaign_type": "promotional",
                        "campaign_goal": "General customer discount draft",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "draft",
                        "audience_source": "existing_contacts",
                        "total_recipients": 1800,
                        "valid_recipients": 1760,
                        "invalid_recipients": 40,
                        "accepted_count": 0,
                        "sent_count": 0,
                        "delivered_count": 0,
                        "read_count": 0,
                        "failed_count": 0,
                        "schedule_type": "now",
                        "estimated_cost": 1408.00,
                        "actual_cost": 0.0,
                        "message_content": "Draft message content for mid-month promotional push.",
                        "created_at": now - timedelta(hours=4),
                    },
                    {
                        "name": "Customer Feedback & NPS Survey",
                        "campaign_type": "customer_support",
                        "campaign_goal": "Product satisfaction survey draft",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "draft",
                        "audience_source": "smart_segment",
                        "total_recipients": 850,
                        "valid_recipients": 830,
                        "invalid_recipients": 20,
                        "accepted_count": 0,
                        "sent_count": 0,
                        "delivered_count": 0,
                        "read_count": 0,
                        "failed_count": 0,
                        "schedule_type": "now",
                        "estimated_cost": 664.00,
                        "actual_cost": 0.0,
                        "message_content": "Help us improve! Take our quick 1-minute survey and get ₹100 credit.",
                        "created_at": now - timedelta(days=1),
                    },
                    {
                        "name": "Annual Plan Upgrade Offer",
                        "campaign_type": "promotional",
                        "campaign_goal": "Upgrade free users to annual plan",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "paused",
                        "paused_reason": "Manual Pause - Message Template Optimization",
                        "audience_source": "existing_contacts",
                        "total_recipients": 1900,
                        "valid_recipients": 1860,
                        "invalid_recipients": 40,
                        "accepted_count": 650,
                        "sent_count": 650,
                        "delivered_count": 630,
                        "read_count": 45,
                        "failed_count": 12,
                        "schedule_type": "now",
                        "estimated_cost": 1488.00,
                        "actual_cost": 504.00,
                        "message_content": "Upgrade to Annual Plan today and get 2 months completely free!",
                        "created_at": now - timedelta(days=3, hours=4),
                    },
                    {
                        "name": "Partner Integration Outreach",
                        "campaign_type": "promotional",
                        "campaign_goal": "B2B partner outreach",
                        "phone_number_id": ws.meta_display_phone or ws.billing_phone or "+1 (415) 523-8886",
                        "status": "completed",
                        "paused_reason": "High failure rate exceeded threshold (15.6%)",
                        "audience_source": "upload_csv",
                        "total_recipients": 500,
                        "valid_recipients": 480,
                        "invalid_recipients": 20,
                        "accepted_count": 120,
                        "sent_count": 120,
                        "delivered_count": 45,
                        "read_count": 2,
                        "failed_count": 75,
                        "schedule_type": "now",
                        "estimated_cost": 384.00,
                        "actual_cost": 36.00,
                        "message_content": "Connect with our API partner network to expand your business.",
                        "created_at": now - timedelta(days=5, hours=8),
                    },
                ]

                for c_data in campaign_seeds:
                    camp = Campaign(
                        workspace_id=ws.id,
                        created_by=user_id,
                        **c_data
                    )
                    db.add(camp)
                
                logger.info(f"  Successfully seeded {len(campaign_seeds)} campaigns for workspace: {ws.name} ({ws.id})")

            db.commit()

        logger.info("Seeding completed successfully!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding marketing data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_marketing_data()
