from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.core.enums import SubscriptionStatus
from app.database import get_db
from app.models.workspace import Workspace, WorkspaceMember
from app.models.user import User
from datetime import datetime, timezone
from app.models.usage import Usage

router = APIRouter(tags=["Admin Workspaces"])


@router.get("/workspaces")
async def get_workspaces(db: Session = Depends(get_db)):
    results = (
        db.query(
            Workspace.id,
            Workspace.name,
            Workspace.created_at,
            User.full_name,
            User.email,
            User.is_active,
            Plan.name.label("plan_name"),                         
            func.count(WorkspaceMember.id).label("member_count")
        )
        .join(User, Workspace.created_by == User.id)
        .outerjoin(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .outerjoin(
            Subscription,
            (Subscription.workspace_id == Workspace.id) &
            (Subscription.status == SubscriptionStatus.active)  
        )
        .outerjoin(Plan, Plan.id == Subscription.plan_id)
        .group_by(
            Workspace.id,
            Workspace.name,
            Workspace.created_at,
            User.full_name,
            User.email,
            User.is_active,
            Plan.name
        )
        .all()
    )

    return [
        {
            "id": str(ws.id),
            "name": ws.name,
            "workspace_name": ws.name,
            "owner_name": ws.full_name,
            "owner_email": ws.email,
            "plan_type": ws.plan_name.lower() if ws.plan_name else "free",  # 
            "member_count": ws.member_count or 0,
            "created_at": ws.created_at.isoformat() if ws.created_at else None,
            "is_active": ws.is_active
        }
        for ws in results
    ]


@router.patch("/workspaces/{workspace_id}")
async def update_workspace_plan(
    workspace_id: str,
    data: dict,
    db: Session = Depends(get_db)
):
    ws = db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    new_plan_name = data.get("plan_type")

    plan = db.query(Plan).filter(
        func.lower(Plan.name) == new_plan_name.lower()
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")


    old_sub = db.query(Subscription).filter(
        Subscription.workspace_id == workspace_id,
        Subscription.status == SubscriptionStatus.active
    ).first()

    import uuid
    ws_uuid = uuid.UUID(workspace_id)
    from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator

    is_upgrade = True
    if old_sub:
        old_plan = db.query(Plan).filter(Plan.id == old_sub.plan_id).first()
        if old_plan and plan:
            order = {"free": 0, "pro": 1, "enterprise": 2}
            old_val = order.get(old_plan.name.lower(), 0)
            new_val = order.get(plan.name.lower(), 0)
            if new_val < old_val:
                is_upgrade = False

    if is_upgrade:
        EntitlementOrchestrator.upgrade_subscription(db, ws_uuid, plan.id)
    else:
        EntitlementOrchestrator.downgrade_subscription(db, ws_uuid, plan.id)

    if new_plan_name.lower() == "free":
        ws.overage_enabled = False

    db.commit()

    return {"message": "Workspace plan updated"}

# Reset Token Limits



@router.post("/workspaces/{workspace_id}/reset-limits")
async def reset_workspace_limits(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    ws = db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    active_sub = (
        db.query(Subscription)
        .filter(
            Subscription.workspace_id == workspace_id,
            Subscription.status == SubscriptionStatus.active,
        )
        .order_by(Subscription.created_at.desc())
        .first()
    )

    if not active_sub:
        raise HTTPException(status_code=404, detail="Active subscription not found")

    now = datetime.now(timezone.utc)

    latest_usage = (
        db.query(Usage)
        .filter(
            Usage.workspace_id == workspace_id,
            Usage.subscription_id == active_sub.id,
        )
        .order_by(Usage.period_start.desc())
        .first()
    )

    if latest_usage and latest_usage.period_end is None:
        latest_usage.period_end = now

    db.add(
        Usage(
            workspace_id=workspace_id,
            subscription_id=active_sub.id,
            messages_used=0,
            tokens_used=0,
            overage_messages=0,
            overage_tokens=0,
            billed=False,
            period_start=now,
            period_end=None,
        )
    )

    db.commit()
    return {"message": "Usage reset successfully"}

# Toggle Workspace Status


@router.post("/workspaces/{workspace_id}/toggle-status")
async def toggle_workspace_status(
    workspace_id: str,
    db: Session = Depends(get_db)
):

    ws = db.get(Workspace, workspace_id)

    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    owner = db.get(User, ws.created_by)

    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    owner.is_active = not owner.is_active

    db.commit()

    return {
        "message": "Workspace status updated",
        "is_active": owner.is_active
    }