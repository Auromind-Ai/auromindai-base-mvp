
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.event_bus import emit_event
from app.models import User
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)

GRACE_DAYS = 30


class AccountService:

    @staticmethod
    def request_deletion(db: Session, user_id: str) -> dict:
        """Schedule account for deletion after GRACE_DAYS."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found.")
        if not user.is_active:
            raise ValueError("Account is already inactive.")

        deletion_date = datetime.now(timezone.utc) + timedelta(days=GRACE_DAYS)
        user.deletion_scheduled_at = deletion_date
        db.commit()

        formatted = deletion_date.strftime("%B %d, %Y")
        try:
         
            emit_event(
                event_name="user.deletion_requested",
                payload={
                    "user_name": user.full_name or user.email,
                    "email": user.email,
                    "deletion_date": formatted,
                    "action_route": "/settings/account",
                    "action_label": "Account Settings",
                    "user_id": str(user.id),
                    "is_critical": True
                },
                actor_id=user.id,
                idempotency_key=f"del_req:{user.id}:{deletion_date.strftime('%Y%m%d')}",
                db=db
            )
        except Exception as e:
            logger.error(f"[AccountService] Failed to emit deletion requested event: {e}")

        return {
            "deletion_scheduled_at": deletion_date.isoformat(),
            "message": f"Your account is scheduled for deletion on {formatted}.",
        }

    @staticmethod
    def cancel_deletion(db: Session, user_id: str) -> dict:
        """Cancel a pending deletion request."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found.")
        if not user.deletion_scheduled_at:
            raise ValueError("No deletion is currently scheduled for this account.")

        user.deletion_scheduled_at = None
        db.commit()

        try:
            emit_event(
                event_name="user.deletion_cancelled",
                payload={
                    "user_name": user.full_name or user.email,
                    "email": user.email,
                    "action_route": "/dashboard",
                    "action_label": "Go to Dashboard",
                    "user_id": str(user.id)
                },
                actor_id=user.id,
                idempotency_key=f"del_cancel:{user.id}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
                db=db
            )
        except Exception as e:
            logger.error(f"[AccountService] Failed to emit deletion cancelled event: {e}")

        return {"message": "Account deletion cancelled. Your account has been fully restored."}

    @staticmethod
    def run_permanent_deletion(db: Session) -> int:
        now = datetime.now(timezone.utc)
        expired_users = (
            db.query(User)
            .filter(
                User.deletion_scheduled_at.isnot(None),
                User.deletion_scheduled_at <= now,
                User.is_active == True,
            )
            .all()
        )

        count = 0
        for user in expired_users:
            try:
                user.is_active            = False
                user.full_name            = "Deleted User"
                user.password_hash        = None
                user.two_factor_secret    = None
                user.two_factor_enabled   = False
                # Email is kept as audit trail but account is inaccessible
                count += 1
            except Exception as e:
                logger.error(f"[DeletionJob] Failed to process user {user.id}: {e}")

        if count:
            db.commit()
            logger.info(f"[DeletionJob] Permanently deleted {count} account(s).")

        return count