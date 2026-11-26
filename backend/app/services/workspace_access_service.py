from datetime import datetime, timezone
import logging
import uuid

from fastapi import HTTPException
from sqlalchemy import func

from app.core.enums import SubscriptionStatus
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceInvitation
from app.services.billing.entitlement_service import EntitlementService

logger = logging.getLogger(__name__)
PLAN_EXPIRED_LOCK_REASON = "plan_expired"


def _to_utc(dt: datetime | None) -> datetime | None:
    if dt is None or not isinstance(dt, datetime):
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def is_workspace_plan_expired(db, workspace_id) -> bool:
    """Return True if workspace has a lapsed paid subscription and no active unexpired paid plan."""
    if not workspace_id:
        return False
    ws_id = getattr(workspace_id, "id", workspace_id)
    if isinstance(ws_id, str):
        try:
            ws_id = uuid.UUID(ws_id)
        except ValueError:
            return False
    try:
        subs = (
            db.query(Subscription, Plan)
            .join(Plan, Plan.id == Subscription.plan_id)
            .filter(Subscription.workspace_id == ws_id)
            .all()
        )
    except Exception:
        return False

    now_utc = datetime.now(timezone.utc)
    has_lapsed_paid = False
    for sub, plan in subs:
        plan_name = (getattr(plan, "name", "") or "").lower().strip()
        if not plan_name or plan_name == "free":
            continue
        end_utc = _to_utc(getattr(sub, "current_period_end", None))
        if sub.status == SubscriptionStatus.active and (end_utc is None or end_utc >= now_utc):
            return False
        if sub.status in (SubscriptionStatus.expired, SubscriptionStatus.past_due, SubscriptionStatus.cancelled) or (
            sub.status == SubscriptionStatus.active and end_utc is not None and end_utc < now_utc
        ):
            has_lapsed_paid = True
    return has_lapsed_paid


def reconcile_workspace_member_seats(db, workspace_id, *, workspace=None) -> dict:
    """
    Lock excess member seats on plan expiry/downgrade and auto-unlock them on renewal/upgrade.
    Manually deactivated members (locked_reason is None) are left untouched.
    """
    ws_id = getattr(workspace, "id", workspace_id)
    if not ws_id:
        return {"locked_user_ids": [], "unlocked_user_ids": [], "changed": False}
    if isinstance(ws_id, str):
        try:
            ws_id = uuid.UUID(ws_id)
        except ValueError:
            return {"locked_user_ids": [], "unlocked_user_ids": [], "changed": False}

    if workspace is None:
        workspace = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not workspace:
        return {"locked_user_ids": [], "unlocked_user_ids": [], "changed": False}

    limit = member_seat_limit(db, ws_id)
    candidates_q = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == ws_id,
            WorkspaceMember.role.in_(["member", "team_member"]),
        )
        .order_by(WorkspaceMember.created_at.asc(), WorkspaceMember.id.asc())
    )
    if getattr(workspace, "created_by", None):
        candidates_q = candidates_q.filter(WorkspaceMember.user_id != workspace.created_by)
    candidates = candidates_q.all()

    active_members = [m for m in candidates if getattr(m, "is_active", True)]
    plan_locked_members = [
        m for m in candidates
        if not getattr(m, "is_active", True) and getattr(m, "locked_reason", None) == PLAN_EXPIRED_LOCK_REASON
    ]

    locked_user_ids: list[str] = []
    unlocked_user_ids: list[str] = []

    if limit == -1:
        for m in plan_locked_members:
            m.is_active = True
            m.locked_reason = None
            unlocked_user_ids.append(str(m.user_id))
    else:
        allowed_seats = max(0, int(limit))
        if len(active_members) > allowed_seats:
            for m in active_members[allowed_seats:]:
                m.is_active = False
                m.locked_reason = PLAN_EXPIRED_LOCK_REASON
                locked_user_ids.append(str(m.user_id))
        elif len(active_members) < allowed_seats and plan_locked_members:
            slots = allowed_seats - len(active_members)
            for m in plan_locked_members[:slots]:
                m.is_active = True
                m.locked_reason = None
                unlocked_user_ids.append(str(m.user_id))

    changed = bool(locked_user_ids or unlocked_user_ids)
    if changed:
        db.flush()
    return {
        "locked_user_ids": locked_user_ids,
        "unlocked_user_ids": unlocked_user_ids,
        "changed": changed,
    }


def notify_seat_changes(workspace_id, result: dict | None) -> None:
    if not result or not result.get("changed"):
        return
    try:
        from app.services.analytics.realtime_service import publish_to_user
        ws_str = str(workspace_id)
        for uid in result.get("locked_user_ids", []) + result.get("unlocked_user_ids", []):
            publish_to_user(str(uid), "workspace_access_changed", {}, workspace_id=ws_str)
    except Exception as exc:
        logger.debug("Failed to notify seat changes for workspace %s: %s", workspace_id, exc)


def member_seat_limit(db, workspace) -> int:
    """Dynamically get allowed team member seats from plan entitlements."""
    if not workspace:
        return 1
    ws_id = getattr(workspace, "id", workspace)
    try:
        ent = EntitlementService.get_workspace_entitlement(db, ws_id)
        if ent and hasattr(ent, "team_limit") and ent.team_limit is not None:
            return int(ent.team_limit)
    except Exception:
        pass
    return 1


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
