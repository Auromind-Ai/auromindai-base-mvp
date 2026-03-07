from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app.services.platform_settings_service import get_all_settings

router = APIRouter(prefix="/public", tags=["public"])

@router.get("/pricing")
async def get_pricing_settings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get public pricing settings for the pricing page.
    """
    settings = get_all_settings(db)
    return {
        "free_plan_price": settings.get("free_plan_price", 0.0),
        "pro_plan_price": settings.get("pro_plan_price", 1000.0),
        "enterprise_plan_price": settings.get("enterprise_plan_price", 10000.0),
        "token_limit_per_plan": settings.get("token_limit_per_plan", {"free": 10000, "pro": 100000, "enterprise": 1000000}),
    }


@router.get("/announcement")
async def get_announcement(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Return the global announcement banner state for the frontend.
    """
    settings = get_all_settings(db)
    return {
        "enabled": settings.get("announcement_enabled", False),
        "message": settings.get("announcement_message", ""),
    }