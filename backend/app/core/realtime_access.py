from app.core.permissions import has_workspace_permission
from app.core.security import to_uuid
from app.database import SessionLocal
from app.models.workspace import WorkspaceMember


def realtime_allowed(user_id, workspace_id, event_type=None):
    user_uuid, ws_uuid = to_uuid(user_id), to_uuid(workspace_id)
    if not user_uuid or not ws_uuid:
        return False
    with SessionLocal() as db:
        member = db.query(WorkspaceMember).filter(
            WorkspaceMember.user_id == user_uuid,
            WorkspaceMember.workspace_id == ws_uuid,
            WorkspaceMember.is_active == True,
        ).first()
        if not member:
            return False
        if event_type is None:
            return True
        if event_type.startswith("lead."):
            permissions = ("leads.view", "crm.view")
        elif event_type.startswith("flow_"):
            permissions = ("automation.manage",)
        elif event_type.startswith("ai_"):
            permissions = ("ai.chat",)
        elif event_type in ("new_message", "message_status_updated", "conversation_updated"):
            permissions = ("inbox.conversations",)
        else:
            # Unknown workspace events must not leak data to restricted members.
            permissions = ("__admin_only__",)
        return any(has_workspace_permission(member.role, member.permissions, perm) for perm in permissions)
