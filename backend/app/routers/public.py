from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app.services.platform_settings_service import get_all_settings, get_setting

router = APIRouter(prefix="/public", tags=["public"])

@router.get("/announcement")
async def get_announcement(db: Session = Depends(get_db)) -> Dict[str, Any]:
    
    settings = get_all_settings(db)
    return {
        "enabled": settings.get("announcement_enabled", False),
        "message": settings.get("announcement_message", ""),
    }

@router.get("/about")
async def get_about(db: Session = Depends(get_db)) -> Dict[str, Any]:
    app_name = get_setting(db, "app_name", "Auromind")
    return {
        "platform_version": get_setting(db, "platform_version", "v2.4.1"),
        "release_date": get_setting(db, "release_date", "June 05, 2026"),
        "copyright": get_setting(db, "copyright", f"@2026 {app_name}"),
        "last_updated": get_setting(db, "last_updated", "June 05, 2026, 10:30 AM")
    }

@router.get("/branding")
async def get_branding(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return {
        "app_name": get_setting(db, "app_name", "Orbionagents"),
        "app_logo_url": get_setting(db, "app_logo_url", "/logo.png")
    }

@router.get("/pricing")
async def get_pricing(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return {
        "free_plan_price":        get_setting(db, "free_plan_price", 0.0),
        "solo_plan_price":        get_setting(db, "solo_plan_price", 999.0),
        "pro_plan_price":         get_setting(db, "pro_plan_price", 5999.0),
        "enterprise_plan_price":  get_setting(db, "enterprise_plan_price", 24999.0),
        
        "token_limit_per_plan":   get_setting(db, "token_limit_per_plan", {
            "free": 1000000,
            "solo": 15000000,
            "pro": 100000000,
            "enterprise": 500000000
        }),

        "free_plan_name":         get_setting(db, "free_plan_name", "Free"),
        "free_plan_desc":         get_setting(db, "free_plan_desc", "Try Auromind for free and see the ROI yourself."),
        "free_plan_features":     get_setting(db, "free_plan_features", ["1,000 AI Replies", "Basic Workflows", "Meta API Included"]),
        "solo_plan_name":         get_setting(db, "solo_plan_name", "Solo Smart"),
        "solo_plan_desc":         get_setting(db, "solo_plan_desc", "RAG & custom knowledge base on a budget for solopreneurs."),
        "solo_plan_features":     get_setting(db, "solo_plan_features", ["15,000 AI Replies", "RAG Knowledge Base Enabled", "1 Gmail Integration", "Basic Automations"]),
        "pro_plan_name":          get_setting(db, "pro_plan_name", "Professional"),
        "pro_plan_desc":          get_setting(db, "pro_plan_desc", "Advanced features for growing teams and scalable workflows."),
        "pro_plan_features":      get_setting(db, "pro_plan_features", ["100,000 AI Replies", "Advanced Workflows + RAG", "Priority Support", "Full Analytics"]),
        "enterprise_plan_name":   get_setting(db, "enterprise_plan_name", "Business"),
        "enterprise_plan_desc":   get_setting(db, "enterprise_plan_desc", "Perfect for businesses starting with AI automation at scale."),
        "enterprise_plan_features": get_setting(db, "enterprise_plan_features", ["500,000 AI Replies", "Dedicated Manager", "Custom API Access", "On-premise Options", "Global SLA"]),
    }
 