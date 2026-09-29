from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func

from app.models.workspace import Workspace, WorkspaceMember, WorkspaceInvitation
from app.services.billing.entitlement_service import EntitlementService


MAX_MEMBERS_PER_WORKSPACE = 3


def member_seat_limit(db, workspace):
    return MAX_MEMBERS_PER_WORKSPACE


def lock_workspace(db, workspace_id):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).with_for_update().first()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


def ensure_member_seat(db, workspace, *, exclude_member_id=None, exclude_invitation_id=None, exclude_email=None):
    """Caller holds the workspace lock through commit; pending invites reserve seats."""
    limit = member_seat_limit(db, workspace)
    if limit == -1:
        return
    members = db.query(func.count(WorkspaceMember.id)).filter(
        WorkspaceMember.workspace_id == workspace.id,
        WorkspaceMember.role.in_(["member", "team_member"]),
        WorkspaceMember.is_active == True,
    )
    if exclude_member_id:
        members = members.filter(WorkspaceMember.id != exclude_member_id)
    invites = db.query(func.count(WorkspaceInvitation.id)).filter(
        WorkspaceInvitation.workspace_id == workspace.id,
        WorkspaceInvitation.role.in_(["member", "team_member"]),
        WorkspaceInvitation.status == "pending",
        WorkspaceInvitation.expires_at > datetime.now(timezone.utc),
    )
    if exclude_invitation_id:
        invites = invites.filter(WorkspaceInvitation.id != exclude_invitation_id)
    if exclude_email:
        invites = invites.filter(func.lower(WorkspaceInvitation.email) != exclude_email.lower())
    if (members.scalar() or 0) + (invites.scalar() or 0) >= limit:
        raise HTTPException(status_code=400, detail=f"All {limit} member seats are in use or reserved. Remove a member/invitation or upgrade your plan.")
