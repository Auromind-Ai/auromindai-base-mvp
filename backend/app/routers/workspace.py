import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceInvitation
from app.routers.auth import get_current_user, CurrentUser
from app.core.security import verify_workspace_access, to_uuid
from app.core.config import settings
from app.core.permissions import ALL_PERMISSIONS_TREE, get_full_permissions_dict, has_workspace_permission, normalize_permissions
from app.services.email_service import EmailService
from app.services.analytics.realtime_service import publish_to_user
from app.services.billing.entitlement_service import EntitlementService
from app.schemas.workspace import (
    InviteMemberRequest,
    UpdateMemberRequest,
    UpdateMemberRoleRequest,
    WorkspaceMemberResponse,
    WorkspaceInvitationResponse,
    WorkspaceSeatsSummaryResponse,
    AcceptInvitationRequest,
    PublicInvitationDetailsResponse
)

from app.services.workspace_access_service import member_seat_limit, lock_workspace, ensure_member_seat

logger = logging.getLogger(__name__)

router = APIRouter()


def _is_datetime_expired(dt: Optional[datetime]) -> bool:
    if not dt:
        return False
    now = datetime.now(timezone.utc)
    target = dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    return target < now


def _get_dynamic_seat_limits(db: Session, workspace: Workspace) -> int:
    return member_seat_limit(db, workspace)


@router.get("/workspaces/{workspace_id}/my-permissions")
async def get_my_workspace_permissions(
    workspace_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the active user's role, owner status, and permissions in the current workspace."""
    verified_ws_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = to_uuid(verified_ws_id)
    user_uuid = to_uuid(current_user.id)

    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == ws_uuid,
        WorkspaceMember.user_id == user_uuid
    ).first()

    if not membership:
        if workspace.created_by and workspace.created_by == user_uuid:
            membership = WorkspaceMember(
                workspace_id=ws_uuid,
                user_id=user_uuid,
                role="founder",
                is_active=True,
                permissions=get_full_permissions_dict()
            )
            db.add(membership)
            db.commit()
            db.refresh(membership)
        else:
            raise HTTPException(status_code=403, detail="Not a member of this workspace")

    is_owner = bool(workspace.created_by and membership.user_id == workspace.created_by) or (membership.role in ("founder", "owner"))
    role = (membership.role or "member").lower().strip()
    if is_owner and role in ("member", "user", ""):
        role = "founder"

    if role in ("admin", "founder", "owner", "platform_admin") or is_owner:
        permissions = get_full_permissions_dict()
    else:
        permissions = normalize_permissions(membership.permissions)

    return {
        "workspace_id": str(workspace.id),
        "workspace_name": workspace.name,
        "role": role,
        "is_owner": is_owner,
        "is_active": getattr(membership, "is_active", True),
        "permissions": permissions,
        "permissions_schema": ALL_PERMISSIONS_TREE
    }


@router.get("/workspaces/{workspace_id}/members", response_model=WorkspaceSeatsSummaryResponse)
async def get_workspace_seats_and_members(
    workspace_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active members and pending invitations for a workspace with seat counts."""
    verified_ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="team.members")
    ws_uuid = to_uuid(verified_ws_id)
    
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Fetch active members
    raw_members = (
        db.query(WorkspaceMember, User)
        .outerjoin(User, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == ws_uuid)
        .order_by(WorkspaceMember.created_at.asc())
        .all()
    )

    members_list: List[WorkspaceMemberResponse] = []
    used_member_count = 0

    for wm, u in raw_members:
        is_owner = bool(workspace.created_by and wm.user_id == workspace.created_by) or wm.role in ("founder", "owner")
        role_norm = (wm.role or "member").lower().strip()
        is_member_role = role_norm in ("member", "team_member")

        if is_member_role and getattr(wm, "is_active", True):
            used_member_count += 1

        # Format permissions
        if role_norm in ("admin", "founder", "owner") or is_owner:
            perms = get_full_permissions_dict()
        else:
            perms = normalize_permissions(wm.permissions)

        display_name = wm.name or (u.full_name if u else None)

        members_list.append(
            WorkspaceMemberResponse(
                id=str(wm.id),
                user_id=str(wm.user_id),
                email=u.email if u else "unknown@domain.com",
                full_name=u.full_name if u else None,
                name=display_name,
                role=role_norm,
                permissions=perms,
                is_active=getattr(wm, "is_active", True),
                created_at=wm.created_at,
                is_owner=is_owner
            )
        )

    viewer = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws_uuid, WorkspaceMember.user_id == to_uuid(current_user.id)).first()
    can_manage = has_workspace_permission(viewer.role, viewer.permissions, "team.members")

    # Fetch pending invitations
    raw_invitations = (
        db.query(WorkspaceInvitation, User)
        .outerjoin(User, WorkspaceInvitation.invited_by == User.id)
        .filter(
            WorkspaceInvitation.workspace_id == ws_uuid,
            WorkspaceInvitation.status == "pending"
        )
        .order_by(WorkspaceInvitation.created_at.desc())
        .all()
    )

    frontend_base = settings.FRONTEND_URL or "http://localhost:3000"
    invitations_list: List[WorkspaceInvitationResponse] = []
    
    for inv, inviter_user in raw_invitations:
        # Check if expired
        if _is_datetime_expired(inv.expires_at):
            continue

        role_norm = (inv.role or "member").lower().strip()
        if role_norm in ("member", "team_member"):
            used_member_count += 1

        inv_perms = inv.permissions
        if role_norm in ("admin", "founder", "owner"):
            inv_perms = get_full_permissions_dict()

        invitations_list.append(
            WorkspaceInvitationResponse(
                id=str(inv.id),
                workspace_id=str(inv.workspace_id),
                workspace_name=workspace.name,
                name=inv.name,
                email=inv.email,
                role=role_norm,
                permissions=inv_perms,
                token=inv.token if can_manage else None,
                status=inv.status,
                invited_by_name=inviter_user.full_name if inviter_user else (inviter_user.email if inviter_user else None),
                created_at=inv.created_at,
                expires_at=inv.expires_at,
                invite_url=f"{frontend_base}/accept-invite?token={inv.token}" if can_manage else None
            )
        )

    plan_type = getattr(workspace, "plan_type", "starter") or "starter"
    total_member_seats = _get_dynamic_seat_limits(db, workspace)
    available_member_seats = -1 if total_member_seats == -1 else max(0, total_member_seats - used_member_count)

    total_seats = total_member_seats
    used_seats = used_member_count
    available_seats = available_member_seats

    return WorkspaceSeatsSummaryResponse(
        workspace_id=str(workspace.id),
        workspace_name=workspace.name,
        plan_type=plan_type,
        total_member_seats=total_member_seats,
        used_member_seats=used_member_count,
        available_member_seats=available_member_seats,
        total_seats=total_seats,
        used_seats=used_seats,
        available_seats=available_seats,
        members=members_list,
        invitations=invitations_list,
        permissions_schema=ALL_PERMISSIONS_TREE
    )


@router.post("/workspaces/{workspace_id}/invitations", response_model=WorkspaceInvitationResponse)
async def invite_workspace_member(
    workspace_id: str,
    payload: InviteMemberRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite a team member (Admin or Member).
    Admin gets full permissions automatically.
    Member gets granular permissions and consumes a member seat.
    """
    verified_ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="team.members")
    ws_uuid = to_uuid(verified_ws_id)
    
    workspace = lock_workspace(db, ws_uuid)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    target_name = (payload.name or "").strip() or None
    target_email = payload.email.strip().lower()
    target_role = (payload.role or "member").strip().lower()

    if target_role not in ("admin", "member", "team_member"):
        target_role = "member"

    # Hierarchy check: Only founders/owners (or platform admin) can invite administrators
    current_user_uuid = to_uuid(current_user.id)
    caller_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == ws_uuid,
        WorkspaceMember.user_id == current_user_uuid
    ).first()
    caller_role = (caller_member.role or "member").lower().strip() if caller_member else "member"
    is_founder = (workspace.created_by == current_user_uuid) or caller_role in ("founder", "owner") or getattr(current_user.user, "platform_role", None) == "platform_admin"

    if target_role == "admin" and not is_founder:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace founders/owners can invite administrators."
        )

    # Normalize permissions
    if target_role == "admin":
        permissions_to_save = get_full_permissions_dict()
    else:
        permissions_to_save = normalize_permissions(payload.permissions)

    if target_role in ("member", "team_member"):
        ensure_member_seat(db, workspace, exclude_email=target_email)

    # Check if target email belongs to an existing user and is already a workspace member
    existing_user = db.query(User).filter(func.lower(User.email) == target_email).first()
    if existing_user:
        existing_membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == ws_uuid,
            WorkspaceMember.user_id == existing_user.id
        ).first()
        if existing_membership:
            raise HTTPException(
                status_code=400,
                detail=f"{target_email} is already a member of this workspace."
            )

    now_dt = datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    expires_at = now_dt + timedelta(days=7)

    # Check if there is already a pending invitation for this email in this workspace
    existing_invitation = db.query(WorkspaceInvitation).filter(
        WorkspaceInvitation.workspace_id == ws_uuid,
        func.lower(WorkspaceInvitation.email) == target_email,
        WorkspaceInvitation.status == "pending"
    ).first()

    if existing_invitation:
        existing_invitation.name = target_name
        existing_invitation.token = token
        existing_invitation.role = target_role
        existing_invitation.permissions = permissions_to_save
        existing_invitation.expires_at = expires_at
        existing_invitation.invited_by = current_user.id
        invitation = existing_invitation
    else:
        invitation = WorkspaceInvitation(
            id=uuid.uuid4(),
            workspace_id=ws_uuid,
            name=target_name,
            email=target_email,
            role=target_role,
            permissions=permissions_to_save,
            token=token,
            status="pending",
            invited_by=current_user.id,
            created_at=now_dt,
            expires_at=expires_at
        )
        db.add(invitation)

    db.commit()
    db.refresh(invitation)

    frontend_base = settings.FRONTEND_URL or "http://localhost:3000"
    invite_url = f"{frontend_base}/accept-invite?token={token}"
    inviter_name = current_user.full_name or current_user.email
    recipient_name = target_name or target_email.split("@")[0].title()

    email_sent = False
    # Send invitation email
    try:
        role_label = "an Administrator (Full Access)" if target_role == "admin" else "a Team Member"
        email_subject = f"You're invited to join {workspace.name} on OrbionAgents"
        email_body = f"""
Hello {recipient_name},

{inviter_name} has invited you to join the workspace "{workspace.name}" on OrbionAgents as {role_label}.

Click the link below to accept your invitation and access the workspace:
{invite_url}

This invitation link will expire in 7 days.

If you don't have an OrbionAgents account yet, you can sign up using this email address ({target_email}).

Best regards,
The OrbionAgents Team
"""
        email_result = EmailService.send_email(
            to_email=target_email,
            subject=email_subject,
            body=email_body,
            metadata={"workspace_id": str(ws_uuid), "invitation_id": str(invitation.id)}
        )
        email_sent = isinstance(email_result, dict) and email_result.get("status") == "success"
    except Exception as email_err:
        logger.warning(f"Could not send invitation email to {target_email}: {email_err}")

    return WorkspaceInvitationResponse(
        id=str(invitation.id),
        workspace_id=str(invitation.workspace_id),
        workspace_name=workspace.name,
        name=invitation.name,
        email=invitation.email,
        role=invitation.role,
        permissions=invitation.permissions,
        token=invitation.token,
        status=invitation.status,
        invited_by_name=inviter_name,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        invite_url=invite_url,
        email_sent=email_sent
    )


@router.post("/workspaces/{workspace_id}/invitations/{invitation_id}/resend", response_model=WorkspaceInvitationResponse)
async def resend_workspace_invitation(
    workspace_id: str,
    invitation_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resend a workspace invitation email and refresh its expiration."""
    verified_ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="team.members")
    ws_uuid = to_uuid(verified_ws_id)
    inv_uuid = to_uuid(invitation_id)

    workspace = lock_workspace(db, ws_uuid)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    invitation = db.query(WorkspaceInvitation).filter(
        WorkspaceInvitation.id == inv_uuid,
        WorkspaceInvitation.workspace_id == ws_uuid
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status not in ("pending", "expired"):
        raise HTTPException(status_code=400, detail="Only pending or expired invitations can be resent.")
    if invitation.role in ("member", "team_member"):
        ensure_member_seat(db, workspace, exclude_invitation_id=invitation.id)

    now_dt = datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    invitation.token = token
    invitation.status = "pending"
    invitation.expires_at = now_dt + timedelta(days=7)
    invitation.invited_by = current_user.id
    db.commit()

    frontend_base = settings.FRONTEND_URL or "http://localhost:3000"
    invite_url = f"{frontend_base}/accept-invite?token={token}"
    inviter_name = current_user.full_name or current_user.email
    recipient_name = invitation.name or invitation.email.split("@")[0].title()

    email_sent = False
    try:
        email_subject = f"Reminder: You're invited to join {workspace.name} on OrbionAgents"
        email_body = f"""
Hello {recipient_name},

{inviter_name} has invited you to collaborate in the workspace "{workspace.name}" on OrbionAgents.

Click the link below to accept the invitation:
{invite_url}

This link is valid for 7 days.

Best regards,
The OrbionAgents Team
"""
        email_result = EmailService.send_email(
            to_email=invitation.email,
            subject=email_subject,
            body=email_body,
            metadata={"workspace_id": str(ws_uuid), "invitation_id": str(invitation.id)}
        )
        email_sent = isinstance(email_result, dict) and email_result.get("status") == "success"
    except Exception as email_err:
        logger.warning(f"Could not resend invitation email to {invitation.email}: {email_err}")

    return WorkspaceInvitationResponse(
        id=str(invitation.id),
        workspace_id=str(invitation.workspace_id),
        workspace_name=workspace.name,
        name=invitation.name,
        email=invitation.email,
        role=invitation.role,
        permissions=invitation.permissions,
        token=invitation.token,
        status=invitation.status,
        invited_by_name=inviter_name,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        invite_url=invite_url,
        email_sent=email_sent
    )


@router.delete("/workspaces/{workspace_id}/invitations/{invitation_id}")
async def cancel_workspace_invitation(
    workspace_id: str,
    invitation_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke or cancel a pending workspace invitation."""
    verified_ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="team.members")
    ws_uuid = to_uuid(verified_ws_id)
    inv_uuid = to_uuid(invitation_id)

    lock_workspace(db, ws_uuid)

    invitation = db.query(WorkspaceInvitation).filter(
        WorkspaceInvitation.id == inv_uuid,
        WorkspaceInvitation.workspace_id == ws_uuid
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    db.delete(invitation)
    db.commit()

    return {"message": "Invitation revoked successfully"}


@router.patch("/workspaces/{workspace_id}/members/{member_id}")
async def update_workspace_member(
    workspace_id: str,
    member_id: str,
    payload: UpdateMemberRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a team member's name, role, permissions, or active status.
    Admin can edit role, granular permissions, or deactivate/activate member.
    """
    verified_ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="team.members")
    ws_uuid = to_uuid(verified_ws_id)
    mem_uuid = to_uuid(member_id)

    workspace = lock_workspace(db, ws_uuid)

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.id == mem_uuid,
        WorkspaceMember.workspace_id == ws_uuid
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    current_user_uuid = to_uuid(current_user.id)
    caller_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == ws_uuid,
        WorkspaceMember.user_id == current_user_uuid
    ).first()
    caller_role = (caller_member.role or "member").lower().strip() if caller_member else "member"
    is_founder = (workspace.created_by == current_user_uuid) or caller_role in ("founder", "owner") or getattr(current_user.user, "platform_role", None) == "platform_admin"

    # Self-modification guard: Users cannot modify their own role, status, or permissions
    if member.user_id == current_user_uuid:
        if (payload.role is not None and payload.role.strip().lower() != member.role) or payload.permissions is not None or (payload.is_active is not None and payload.is_active != member.is_active):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Users cannot modify their own role, permissions, or membership status."
            )

    if workspace and workspace.created_by == member.user_id:
        if payload.role and payload.role != member.role:
            raise HTTPException(status_code=400, detail="Cannot alter role of the workspace creator.")
        if payload.is_active is False:
            raise HTTPException(status_code=400, detail="Cannot deactivate the primary workspace owner.")

    # Role hierarchy: Only founders/owners (or platform admins) can assign admin role or modify an admin member
    target_role = (payload.role or member.role).strip().lower()
    if (target_role == "admin" or member.role == "admin") and not is_founder:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace founders/owners can assign or modify administrator roles."
        )

    # Update name
    if payload.name is not None:
        member.name = payload.name.strip()
        # Also sync to user full_name if empty
        user_record = db.query(User).filter(User.id == member.user_id).first()
        if user_record and not user_record.full_name:
            user_record.full_name = payload.name.strip()

    if target_role not in ("admin", "member", "team_member") and target_role != member.role:
        raise HTTPException(status_code=400, detail="Role must be admin or member.")
    target_active = member.is_active if payload.is_active is None else payload.is_active
    newly_consumes_seat = target_active and target_role in ("member", "team_member") and (
        not member.is_active or member.role not in ("member", "team_member")
    )
    if newly_consumes_seat:
        ensure_member_seat(db, workspace, exclude_member_id=member.id)
    previous_role = member.role
    member.role = target_role
    member.is_active = target_active
    if target_role == "admin":
        member.permissions = get_full_permissions_dict()
    elif previous_role in ("admin", "owner", "founder") and payload.permissions is None:
        member.permissions = {}

    # Update granular permissions
    if payload.permissions is not None:
        if member.role == "admin":
            member.permissions = get_full_permissions_dict()
        else:
            member.permissions = normalize_permissions(payload.permissions)

    db.commit()
    db.refresh(member)
    publish_to_user(str(member.user_id), "workspace_access_changed", {}, workspace_id=str(ws_uuid))

    return {
        "message": "Member updated successfully",
        "id": str(member.id),
        "name": member.name,
        "role": member.role,
        "is_active": member.is_active,
        "permissions": member.permissions
    }


@router.delete("/workspaces/{workspace_id}/members/{member_id}")
async def remove_workspace_member(
    workspace_id: str,
    member_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a team member from the workspace (immediate revocation of workspace access)."""
    verified_ws_id = verify_workspace_access(current_user, db, workspace_id, required_permission="team.members")
    ws_uuid = to_uuid(verified_ws_id)
    mem_uuid = to_uuid(member_id)

    workspace = lock_workspace(db, ws_uuid)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.id == mem_uuid,
        WorkspaceMember.workspace_id == ws_uuid
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    current_user_uuid = to_uuid(current_user.id)
    if member.user_id == current_user_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself using this endpoint. Use leave workspace instead."
        )

    if workspace.created_by and member.user_id == workspace.created_by:
        raise HTTPException(status_code=400, detail="Cannot remove the workspace creator / primary owner.")

    caller_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == ws_uuid,
        WorkspaceMember.user_id == current_user_uuid
    ).first()
    caller_role = (caller_member.role or "member").lower().strip() if caller_member else "member"
    is_founder = (workspace.created_by == current_user_uuid) or caller_role in ("founder", "owner") or getattr(current_user.user, "platform_role", None) == "platform_admin"

    if member.role == "admin" and not is_founder:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace founders/owners can remove administrator members."
        )

    member_user_id = str(member.user_id)
    db.delete(member)
    db.commit()
    publish_to_user(member_user_id, "workspace_access_changed", {}, workspace_id=str(ws_uuid))

    return {"message": "Member removed from workspace successfully. Access revoked immediately."}


# ─ PUBLIC INVITATION DETAILS & ACCEPTANCE ENDPOINTS ─

@router.get("/invitations/details/{token}", response_model=PublicInvitationDetailsResponse)
async def get_invitation_public_details(
    token: str,
    db: Session = Depends(get_db)
):
    """Get workspace invitation details by token (Public endpoint)."""
    invitation = db.query(WorkspaceInvitation).filter(WorkspaceInvitation.token == token).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation token not found or invalid.")

    workspace = db.query(Workspace).filter(Workspace.id == invitation.workspace_id).first()
    workspace_name = workspace.name if workspace else "Workspace"

    inviter = db.query(User).filter(User.id == invitation.invited_by).first() if invitation.invited_by else None
    inviter_name = inviter.full_name if inviter else (inviter.email if inviter else "A team member")

    is_expired = _is_datetime_expired(invitation.expires_at)

    is_valid = (invitation.status == "pending") and not is_expired

    return PublicInvitationDetailsResponse(
        id=str(invitation.id),
        workspace_id=str(invitation.workspace_id),
        workspace_name=workspace_name,
        name=invitation.name,
        email=invitation.email,
        role=invitation.role or "member",
        permissions=invitation.permissions,
        invited_by_name=inviter_name,
        status=invitation.status,
        is_expired=is_expired,
        is_valid=is_valid
    )


@router.post("/invitations/accept")
async def accept_invitation(
    payload: AcceptInvitationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept an invitation to join a workspace as an authenticated user."""
    invitation = db.query(WorkspaceInvitation).filter(
        WorkspaceInvitation.token == payload.token
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    workspace = lock_workspace(db, invitation.workspace_id)
    invitation = db.query(WorkspaceInvitation).filter(WorkspaceInvitation.token == payload.token).populate_existing().first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    if (current_user.email or "").strip().lower() != invitation.email.strip().lower():
        raise HTTPException(status_code=403, detail="Sign in with the email address this invitation was sent to.")
    existing_mem = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == invitation.workspace_id,
        WorkspaceMember.user_id == to_uuid(current_user.id)
    ).first()
    if invitation.status == "accepted":
        if not existing_mem or not existing_mem.is_active:
            raise HTTPException(status_code=403, detail="You no longer have active membership in this workspace.")
        return {"success": True, "workspace_id": str(workspace.id), "workspace_name": workspace.name, "role": existing_mem.role, "message": "Already a member."}
    if invitation.status != "pending" or _is_datetime_expired(invitation.expires_at):
        raise HTTPException(status_code=400, detail="Invitation is expired or no longer pending.")
    if existing_mem:
        raise HTTPException(status_code=400, detail="Membership already exists. Ask an admin to manage your access.")
    if invitation.role in ("member", "team_member"):
        ensure_member_seat(db, workspace, exclude_invitation_id=invitation.id)

    assigned_role = invitation.role or "member"
    assigned_permissions = invitation.permissions
    if assigned_role == "admin":
        assigned_permissions = get_full_permissions_dict()
    else:
        assigned_permissions = normalize_permissions(assigned_permissions)

    if not existing_mem:
        new_member = WorkspaceMember(
            id=uuid.uuid4(),
            workspace_id=invitation.workspace_id,
            user_id=current_user.id,
            name=invitation.name or current_user.full_name,
            role=assigned_role,
            permissions=assigned_permissions,
            is_active=True
        )
        db.add(new_member)
    invitation.status = "accepted"
    db.commit()

    return {
        "success": True,
        "workspace_id": str(workspace.id),
        "workspace_name": workspace.name,
        "role": assigned_role,
        "message": f"Successfully joined {workspace.name} as {assigned_role.title()}!"
    }
