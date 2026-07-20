import logging
import uuid
from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.models.notification import Notification
from app.models.admin_audit_log import AdminAuditLog
from app.core.notification_metrics import notification_metrics
from app.workers.email_retry_worker import send_email_with_retry

logger = logging.getLogger("app")


def _ensure_uuid(val) -> Optional[UUID]:
    if val is None:
        return None
    if isinstance(val, UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, AttributeError):
        return None


_DEDUPLICATION_STORE = set()


class NotificationService:

    @staticmethod
    def is_duplicate(deduplication_key: Optional[str]) -> bool:
        if not deduplication_key:
            return False
        
        try:
            import redis
            from app.core.config import settings
            if settings.REDIS_URL:
                r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
                redis_key = f"notif_dedup:{deduplication_key}"
                if r.exists(redis_key):
                    return True
                r.setex(redis_key, 86400, "1")
                return False
        except Exception:
            pass

        if deduplication_key in _DEDUPLICATION_STORE:
            return True
        _DEDUPLICATION_STORE.add(deduplication_key)
        return False


    @staticmethod
    def clear_deduplication_store():
        _DEDUPLICATION_STORE.clear()

    @staticmethod
    def notify(
        db: Session,
        user_id: UUID,
        workspace_id: Optional[UUID],
        type: str,
        title: str,
        message: str,
        send_email: bool = False,
        is_critical: bool = False,
        email_subject: Optional[str] = None,
        deduplication_key: Optional[str] = None,
        resource: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Create a notification for a specific user if their preferences allow it.
        Opt-out model: if preference key is missing or not configured, notifications are enabled by default.
        Critical notifications always bypass opt-out preferences and trigger an email.
        Supports deduplication_key to prevent duplicate emails and notifications within a period.
        Supports resource tag (e.g. 'ai_tokens', 'flow_executions', 'whatsapp_credits') for multi-tenant UI routing.
        """
        if deduplication_key and NotificationService.is_duplicate(deduplication_key):
            try:
                notification_metrics.increment("duplicate_prevention_hits_total")
            except Exception:
                pass
            return None

        clean_user_id = _ensure_uuid(user_id)
        if not clean_user_id:
            return None

        user = db.query(User).filter(User.id == clean_user_id).first()
        if not user:
            return None

        # Map DB notification types to user preference JSONB keys
        mapping = {
            "lead_alert": "leadsAlerts",
            "workflow_completed": "workflowAlerts",
            "workflow_failed": "workflowAlerts",
            "ai_agent_event": "aiAgentEvents",
            "security_alert": "securityAlerts",
            "billing_alert": "billingAlerts",
            "workspace_alert": "workspaceAlerts",
            "usage_warning": "usageAlerts",
            "integration_alert": "integrationAlerts",
            "reminder": "reminders",
            "product_update": "productUpdates",
        }
        
        pref_key = mapping.get(type)
        if is_critical or not pref_key:
            # Critical alerts or unknown types are enabled by default
            enabled = True
        else:
            prefs = user.preferences or {}
            enabled = prefs.get(pref_key, True)
            
        if not enabled:
            return None
            
        # Create and persist in-app notification
        notification = Notification(
            id=uuid.uuid4(),
            user_id=clean_user_id,
            workspace_id=_ensure_uuid(workspace_id),
            type=type,
            title=title,
            message=message,
            is_read=False
        )
        db.add(notification)
        try:
            db.commit()
            db.refresh(notification)
            try:
                notification_metrics.increment("notifications_sent_total")
            except Exception:
                pass
        except Exception as db_exc:
            db.rollback()
            try:
                notification_metrics.increment("notifications_failed_total")
            except Exception:
                pass
            logger.error(f"Failed to persist notification: {db_exc}")
            return None

        # Automatically record security audit trail for critical / security events
        if type == "security_alert" or is_critical:
            try:
                audit_entry = AdminAuditLog(
                    id=uuid.uuid4(),
                    admin_user_id=str(clean_user_id),
                    action=f"SECURITY_EVENT:{title.upper().replace(' ', '_')}",
                    workspace_id=_ensure_uuid(workspace_id),
                    reason=message,
                    new_value={"title": title, "type": type, "resource": resource}
                )
                db.add(audit_entry)
                db.commit()
                try:
                    notification_metrics.increment("audit_logs_created_total")
                except Exception:
                    pass
            except Exception as audit_exc:
                db.rollback()
                logger.error(f"Failed to record security audit log: {audit_exc}")

        # Trigger email if send_email is True or is_critical is True
        if (send_email or is_critical) and user.email:
            try:
                subject = email_subject or f"[Auromind Security / Alert] {title}"
                body = f"Hi {user.full_name or 'User'},\n\n{title}\n\n{message}\n\n— The Auromind Security Team"
                send_email_with_retry(to_email=user.email, subject=subject, body=body, max_attempts=3)
            except Exception as email_exc:
                logger.error(f"Failed to dispatch notification email to {user.email}: {email_exc}")
        
        return notification

    @staticmethod
    def notify_workspace(
        db: Session,
        workspace_id: UUID,
        type: str,
        title: str,
        message: str,
        send_email: bool = False,
        is_critical: bool = False,
        email_subject: Optional[str] = None,
        deduplication_key: Optional[str] = None,
        resource: Optional[str] = None
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
            user_dedup_key = f"{deduplication_key}:{member.user_id}" if deduplication_key else None
            NotificationService.notify(
                db=db,
                user_id=member.user_id,
                workspace_id=clean_workspace_id,
                type=type,
                title=title,
                message=message,
                send_email=send_email,
                is_critical=is_critical,
                email_subject=email_subject,
                deduplication_key=user_dedup_key,
                resource=resource
            )

