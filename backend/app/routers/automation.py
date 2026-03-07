from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.email_automation_engine import AutomationEngine
from app.routers.auth import get_current_user

router = APIRouter(prefix="/automation", tags=["automation"])

engine = AutomationEngine()


@router.post("/approve")
async def approve_action(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    engine.approve_and_execute(db, decision_id)

    return {"status": "approved"}