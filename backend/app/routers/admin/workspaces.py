from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.workspace import Workspace, WorkspaceMember
from app.models.user import User

router = APIRouter(tags=["Admin Workspaces"])


# ============================================================
# Get All Workspaces (Optimized)
# ============================================================

@router.get("/workspaces")
async def get_workspaces(db: Session = Depends(get_db)):

    results = (
        db.query(
            Workspace.id,
            Workspace.name,
            Workspace.plan_type,
            Workspace.created_at,
            User.full_name,
            User.email,
            User.is_active,
            func.count(WorkspaceMember.id).label("member_count")
        )
        .join(User, Workspace.created_by == User.id)
        .outerjoin(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .group_by(
            Workspace.id,
            Workspace.name,
            Workspace.plan_type,
            Workspace.created_at,
            User.full_name,
            User.email,
            User.is_active
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

            "plan_type": ws.plan_type or "starter",

            "member_count": ws.member_count or 0,

            "created_at": ws.created_at.isoformat() if ws.created_at else None,

            "is_active": ws.is_active
        }
        for ws in results
    ]


# ============================================================
# Edit Workspace Plan
# ============================================================

@router.patch("/workspaces/{workspace_id}")
async def update_workspace_plan(
    workspace_id: str,
    data: dict,
    db: Session = Depends(get_db)
):

    ws = db.get(Workspace, workspace_id)

    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws.plan_type = data.get("plan_type", ws.plan_type)

    db.commit()

    return {"message": "Workspace plan updated"}


# ============================================================
# Reset Token Limits
# ============================================================

@router.post("/workspaces/{workspace_id}/reset-limits")
async def reset_workspace_limits(
    workspace_id: str,
    db: Session = Depends(get_db)
):

    ws = db.get(Workspace, workspace_id)

    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws.token_usage = 0
    db.commit()

    return {"message": "Workspace limits reset"}


# ============================================================
# Toggle Workspace Status
# ============================================================

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