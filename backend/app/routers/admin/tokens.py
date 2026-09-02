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
import logging
from app.services.billing.gateway.base import get_tokens_per_credit
from app.services.billing.entitlement_service import EntitlementService
from app.routers.billing import get_billing_service
from app.models.token_ledger import TokenLedger

from app.services.platform_settings_service import get_setting

logger = logging.getLogger(__name__)
router = APIRouter()



@router.get("/tokens")
async def get_tokens(db: Session = Depends(get_db)):
    workspaces = db.query(Workspace).all()
    billing_service = get_billing_service()
    token_service = billing_service.token_service
    

    raw_rate = get_setting(db, "tokens_per_credit", None)
    if raw_rate is not None:
        try:
            system_tokens_per_credit = int(raw_rate)
        except (ValueError, TypeError):
            system_tokens_per_credit = get_tokens_per_credit()
    else:
        system_tokens_per_credit = get_tokens_per_credit()
        
    results = []

    for ws in workspaces:
        owner = None
        if ws.created_by:
            owner = db.query(User).filter(User.id == ws.created_by).first()
        if not owner:
            member = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.id).first()
            if member:
                owner = db.query(User).filter(User.id == member.user_id).first()

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

        # 1. Included Credits from plan entitlement
        ent = EntitlementService.get_workspace_entitlement(db, ws.id)
        included_credits = float(getattr(ent, "included_ai_credits", 0) or 0)

        # 2. Purchased Credits grants from top-up packs
        purchased_credits = float(token_service.get_purchased_grants(db, ws.id) or 0)

        # 3. Total Credits
        total_credits = included_credits + purchased_credits

        # 4. Total Token Limit = (included_credits + purchased_credits) * system_tokens_per_credit
        if total_credits > 0:
            token_limit = int(round(total_credits * system_tokens_per_credit))
        elif ws.custom_token_limit:
            token_limit = int(ws.custom_token_limit)
        else:
            token_limit = 0

        # 5. Usage in Credits & Tokens (current cycle)
        cycle_start = sub.current_period_start if sub else None
        cycle_credits_used = float(token_service.get_cycle_usage(db, ws.id, cycle_start) or 0)

        # Raw token count from TokenLedger
        ledger_tokens_used = db.query(func.sum(TokenLedger.tokens_used)).filter(
            TokenLedger.workspace_id == ws.id,
            TokenLedger.entry_type == "usage"
        ).scalar() or 0

        # Equivalent tokens spent
        if cycle_credits_used > 0:
            tokens_used = int(round(cycle_credits_used * system_tokens_per_credit))
        else:
            tokens_used = int(ledger_tokens_used)

        usage_percentage = round((tokens_used / token_limit * 100), 2) if token_limit > 0 else 0.0

        results.append({
            "id": str(ws.id),
            "workspace_id": str(ws.id),
            "workspace_name": ws.name,
            "user_email": owner.email if owner else None,
            "plan_type": plan_name,
            "included_credits": included_credits,
            "purchased_credits": purchased_credits,
            "total_credits": total_credits,
            "tokens_per_credit": system_tokens_per_credit,
            "credits_used": cycle_credits_used,
            "tokens_used": tokens_used,
            "token_limit": token_limit,
            "usage_percent": usage_percentage,
            "custom_limit_active": bool(ws.custom_token_limit)
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
    logger.debug(f"Workspace fetched for token limit update: {ws}")
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    logger.info(f"Updating token limit for workspace: {workspace_id} with data: {data.get('custom_token_limit')}")
    ws.custom_token_limit = data.get("custom_token_limit")

    db.commit()
    logger.info(f"Token limit updated for workspace: {workspace_id}")
    return {"message": "Token limit updated"}