import uuid
from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.models.notification import Notification


def _ensure_uuid(val) -> Optional[UUID]:
    if val is None:
        return None
    if isinstance(val, UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, AttributeError):
        return None


class NotificationService:
    @staticmethod
    def notify(
        db: Session,
        user_id: UUID,
        workspace_id: Optional[UUID],
        type: str,
        title: str,
        message: str
    ) -> Optional[Notification]:
        """
        Create a notification for a specific user if their preferences allow it.
        Opt-out model: if preference key is missing or not configured, notifications are enabled by default.
        """
        # Map DB notification types to user preference JSONB keys
        mapping = {
            "lead_alert": "leadsAlerts",
            "workflow_completed": "workflowAlerts",
            "workflow_failed": "workflowAlerts",
            "ai_agent_event": "aiAgentEvents",
            "security_alert": "securityAlerts",
            "reminder": "reminders",
            "product_update": "productUpdates",
        }
        
        pref_key = mapping.get(type)
        if not pref_key:
            # If the notification type is unknown, default to enabled
            enabled = True
        else:
            user = db.query(User).filter(User.id == _ensure_uuid(user_id)).first()
            if not user:
                return None
            
            # Fetch preference toggles from user.preferences
            prefs = user.preferences or {}
            
            # Opt-out: default to True if key is absent
            enabled = prefs.get(pref_key, True)
            
        if not enabled:
            return None
            
        # Create and persist notification
        notification = Notification(
            id=uuid.uuid4(),
            user_id=_ensure_uuid(user_id),
            workspace_id=_ensure_uuid(workspace_id),
            type=type,
            title=title,
            message=message,
            is_read=False
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        # Real-time WebSocket broadcast integration (optional placeholder)
        try:
            from app.core.websockets import manager
            # Websocket manager broadcast logic can go here in the future
        except Exception:
            pass
            
        return notification

    @staticmethod
    def notify_workspace(
        db: Session,
        workspace_id: UUID,
        type: str,
        title: str,
        message: str
    ):
        """
        Send a notification to all members of a specific workspace.
        """
        clean_workspace_id = _ensure_uuid(workspace_id)
        if not clean_workspace_id:
            return
            
        members = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == clean_workspace_id
        ).all()
        
        for member in members:
            NotificationService.notify(
                db=db,
                user_id=member.user_id,
                workspace_id=clean_workspace_id,
                type=type,
                title=title,
                message=message
            )
