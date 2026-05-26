from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.services.platform_settings_service import get_all_settings, update_settings

router = APIRouter()


@router.get("/settings")
async def get_platform_settings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        return get_all_settings(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching settings: {str(e)}")


@router.post("/settings")
async def update_platform_settings(
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        # Log plans before
        from app.models.plan import Plan
        result = update_settings(db, updates)
        # Synchronize plans table
        from app.services.billing.plan_service import PlanService
        plan_service = PlanService()
        for plan_key in ["free", "pro", "enterprise"]:
            config = plan_service._get_plan_config(db, plan_key)
            plan_service._get_or_create_plan(db, config)
        db.commit()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")
