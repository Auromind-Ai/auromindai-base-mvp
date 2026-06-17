"""Account lifecycle service — deletion request, cancellation, background cleanup."""

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models import User
from app.services.email_service import EmailService

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
            EmailService.send_email(
                to_email=user.email,
                subject="Your account is scheduled for deletion",
                body=(
                    f"Hi {user.full_name},\n\n"
                    f"Your Auromind account has been scheduled for permanent deletion on {formatted}.\n\n"
                    f"If you change your mind, simply log in before that date and cancel the deletion "
                    f"from your account settings.\n\n"
                    f"If you did not request this, please contact support immediately.\n\n"
                    f"— The Auromind Team"
                ),
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
            EmailService.send_email(
                to_email=user.email,
                subject="Account deletion cancelled — you're back!",
                body=(
                    f"Hi {user.full_name},\n\n"
                    f"Your account deletion has been successfully cancelled. "
                    f"Your Auromind account is fully restored and active.\n\n"
                    f"— The Auromind Team"
                ),
            )
        except Exception as e:
            print(f"[AccountService] Failed to send cancellation email: {e}")

        return {"message": "Account deletion cancelled. Your account has been fully restored."}

    @staticmethod
    def run_permanent_deletion(db: Session) -> int:
        """
        Background job — call daily.
        Permanently anonymises accounts whose grace period has expired.
        Returns count of accounts processed.
        """
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