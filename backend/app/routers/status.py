from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.services.status_page_service import StatusPageService

router = APIRouter(prefix="/status", tags=["Status Page"])


class SubscribeRequest(BaseModel):
    email: EmailStr


@router.get("/summary")
async def get_status_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:

    try:
        return StatusPageService.get_status_summary(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system status summary: {str(e)}"
        )


@router.get("/uptime-90d")
async def get_90_day_uptime(db: Session = Depends(get_db)) -> Dict[str, Any]:
    
    try:
        return StatusPageService.get_90_day_history(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve 90-day uptime history: {str(e)}"
        )


@router.get("/notices")
async def get_recent_notices(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
   
    try:
        notices = StatusPageService.get_recent_notices(db, days=days)
        return {
            "days": days,
            "count": len(notices),
            "notices": notices,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve recent notices: {str(e)}"
        )


@router.get("/history")
async def get_incident_history(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=50),
    service: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
  
    try:
        return StatusPageService.get_historical_incidents(
            db=db,
            page=page,
            limit=limit,
            service_key=service,
            year=year,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve incident history: {str(e)}"
        )


@router.post("/subscribe")
async def subscribe_status_updates(
    body: SubscribeRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
   
    try:
        return StatusPageService.subscribe_email(db, body.email)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Subscription failed: {str(e)}"
        )
