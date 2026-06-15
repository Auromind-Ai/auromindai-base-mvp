import sys
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.append(os.path.abspath("backend"))

from app.database import SessionLocal
from app.models.platform_setting import PlatformSetting
from app.services.platform_settings_service import update_settings
from app.services.billing.plan_service import PlanService

def run():
    db = SessionLocal()
    try:
        print("Updating platform settings for MVP pricing...")
        updates = {
            "free_plan_price": 0,
            "pro_plan_price": 6999,
            "enterprise_plan_price": 24999,
            
            "free_plan_name": "Free",
            "pro_plan_name": "Pro",
            "enterprise_plan_name": "Business",
            
            "free_plan_desc": "Try Auromind for free and see the ROI yourself.",
            "pro_plan_desc": "Everything you need to automate and scale your sales system.",
            "enterprise_plan_desc": "Enterprise-grade scale for growing teams and custom needs.",
            
            "free_plan_features": ["100 AI Replies / Month", "Basic Workflows", "Meta API Included"],
            "pro_plan_features": ["10,000 AI Replies / Month", "Advanced Workflows", "Priority Support", "Full Analytics"],
            "enterprise_plan_features": ["Custom AI Quotas", "Dedicated Account Manager", "On-Premise & Custom API Options", "Global SLA"],
            
            "token_limit_per_plan": {
                "free": 100000,       # 100,000 tokens = 100 credits = 100 replies
                "pro": 10000000,     # 10,000,000 tokens = 10,000 credits = 10,000 replies
                "enterprise": 100000000 # 100,000,000 tokens = 100,000 credits = 100,000 replies
            }
        }
        
        # Perform settings update
        result = update_settings(db, updates)
        print("Platform settings updated successfully.")
        
        # Synchronize Plan table
        print("Synchronizing Plan table...")
        plan_service = PlanService()
        for plan_key in ["free", "pro", "enterprise"]:
            config = plan_service._get_plan_config(db, plan_key)
            plan = plan_service._get_or_create_plan(db, config)
            print(f"Synced Plan: {plan.name}, Price: {plan.price}, Token Limit: {plan.token_limit}")
            
        db.commit()
        print("All changes committed successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Error updating pricing: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run()
