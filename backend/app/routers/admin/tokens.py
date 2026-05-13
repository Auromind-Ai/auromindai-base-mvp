from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.usage import Usage
from sqlalchemy import func
from app.database import get_db
from app.models.workspace import Workspace
from app.models.workspace import WorkspaceMember
from app.models.user import User
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.core.enums import SubscriptionStatus
from datetime import datetime, timezone
router = APIRouter()

@router.get("/tokens")
async def get_tokens(db: Session = Depends(get_db)):
    workspaces = db.query(Workspace).all()
    results = []

    for ws in workspaces:
        owner = db.query(User).filter(User.id == ws.created_by).first()

        # Active subscription + plan name
        sub = db.query(Subscription).filter(
            Subscription.workspace_id == ws.id,
            Subscription.status == SubscriptionStatus.active
        ).first()
        plan_name = "free" 

        if sub:
            plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
            if plan:
                plan_name = plan.name.lower()
            
        now = datetime.now(timezone.utc)
    #  Actual tokens used from Usage table (current period)
        usage = (
            db.query(func.sum(Usage.tokens_used))
            .filter(
                Usage.workspace_id == ws.id,
                Usage.period_start >= now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            )
            .scalar()
        ) or 0
        

        results.append({
            "id": str(ws.id),
            "workspace_id": str(ws.id),
            "workspace_name": ws.name,
            "user_email": owner.email if owner else None,
            "plan_type": plan_name,
            "tokens_used": usage,           
            "custom_token_limit": ws.custom_token_limit
        })

    return results



# Update Token Limit


@router.patch("/tokens/{workspace_id}/limit")
async def update_token_limit(
    workspace_id: str,
    data: dict,
    db: Session = Depends(get_db)
):

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    print("Workspace fetched for token limit update:", ws)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    print("Updating token limit for workspace:", workspace_id, "with data:", data.get("custom_token_limit"))
    ws.custom_token_limit = data.get("custom_token_limit")

    db.commit()
    print("Token limit updated for workspace:", workspace_id)
    return {"message": "Token limit updated"}