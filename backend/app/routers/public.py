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
    return {
        "platform_version": get_setting(db, "platform_version", "v2.4.1"),
        "release_date": get_setting(db, "release_date", "June 05, 2026"),
        "copyright": get_setting(db, "copyright", "@2026 Auromind"),
        "last_updated": get_setting(db, "last_updated", "June 05, 2026, 10:30 AM")
    }

@router.get("/pricing")
async def get_pricing(db: Session = Depends(get_db)) -> Dict[str, Any]:
    settings = get_all_settings(db)
    print(" SETTINGS:", settings)
    return {
        "free_plan_price":        get_setting(db, "free_plan_price", 0.0),
        "pro_plan_price":         get_setting(db, "pro_plan_price", 1000.0),
        "enterprise_plan_price":  get_setting(db, "enterprise_plan_price", 10000.0),
        
        "token_limit_per_plan":   get_setting(db, "token_limit_per_plan", {
            "free": 10000,
            "pro": 100000,
            "enterprise": 1000000
        }),

        "free_plan_name":         get_setting(db, "free_plan_name", "Free"),
        "free_plan_desc":         get_setting(db, "free_plan_desc", ""),
        "free_plan_features":     get_setting(db, "free_plan_features", []),
        "pro_plan_name":          get_setting(db, "pro_plan_name", "Pro"),
        "pro_plan_desc":          get_setting(db, "pro_plan_desc", ""),
        "pro_plan_features":      get_setting(db, "pro_plan_features", []),
        "enterprise_plan_name":   get_setting(db, "enterprise_plan_name", "Enterprise"),
        "enterprise_plan_desc":   get_setting(db, "enterprise_plan_desc", ""),
        "enterprise_plan_features": get_setting(db, "enterprise_plan_features", []),
    }
 