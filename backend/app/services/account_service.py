
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models import User
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService

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
            NotificationService.notify(
                db=db,
                user_id=user.id,
                workspace_id=None,
                type="security_alert",
                title=None,
                message=None,
                send_email=True,
                is_critical=True,
                email_subject=None,
                template_key="account_deletion_requested",
                variables={
                    "user_name": user.full_name or user.email,
                    "deletion_date": formatted
                }
            )
        except Exception as e:
            print(f"[AccountService] Failed to send deletion email: {e}")

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
            NotificationService.notify(
                db=db,
                user_id=user.id,
                workspace_id=None,
                type="security_alert",
                title=None,
                message=None,
                send_email=True,
                email_subject=None,
                template_key="account_deletion_cancelled",
                variables={
                    "user_name": user.full_name or user.email
                }
            )
        except Exception as e:
            print(f"[AccountService] Failed to send cancellation email: {e}")

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
                print(f"[DeletionJob] Failed to process user {user.id}: {e}")

        if count:
            db.commit()
            print(f"[DeletionJob] Permanently deleted {count} account(s).")

        return count