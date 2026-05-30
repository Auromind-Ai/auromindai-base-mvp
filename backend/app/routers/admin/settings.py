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
        return update_settings(db, updates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")
