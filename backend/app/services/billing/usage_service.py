from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.subscription import Subscription
from app.models.usage import Usage


class UsageService:
    def _record_usage_snapshot(
        self,
        db: Session,
        workspace_id: str,
        subscription_id: str | None,
        tokens_used: int,
    ) -> Usage | None:
        if subscription_id is None:
            return None

        subscription = (
            db.query(Subscription)
            .filter(Subscription.id == subscription_id)
            .with_for_update()
            .first()
        )
        if subscription is None:
            return None

        usage = self._get_or_create_period_usage(
            db=db,
            workspace_id=workspace_id,
            subscription=subscription,
        )
        usage.tokens_used = (usage.tokens_used or 0) + max(tokens_used, 0)
        db.flush()
        return usage

    def _get_or_create_period_usage(
        self,
        db: Session,
        workspace_id: str,
        subscription: Subscription,
    ) -> Usage:
        period_start, period_end = self._get_usage_period(subscription)
        usage = (
            db.query(Usage)
            .filter(
                Usage.workspace_id == workspace_id,
                Usage.subscription_id == subscription.id,
                Usage.period_start == period_start,
            )
            .with_for_update()
            .first()
        )
        if usage is None:
            import uuid
            usage = Usage(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                subscription_id=subscription.id,
                messages_used=0,
                tokens_used=0,
                overage_messages=0,
                overage_tokens=0,
                billed=False,
                period_start=period_start,
                period_end=period_end,
            )
            db.add(usage)
            db.flush()
        else:
            usage.period_end = period_end
        return usage

    def _get_period_usage_readonly(
        self,
        db: Session,
        workspace_id: str,
        subscription: Subscription,
    ) -> Usage | None:
        period_start, _ = self._get_usage_period(subscription)
        return (
            db.query(Usage)
            .filter(
                Usage.workspace_id == workspace_id,
                Usage.subscription_id == subscription.id,
                Usage.period_start == period_start,
            )
            .first()
        )

    def _get_usage_period(
        self,
        subscription: Subscription | None,
    ) -> tuple[datetime, datetime | None]:
        now = datetime.now(timezone.utc)
        if subscription and subscription.current_period_start:
            period_start = subscription.current_period_start
        else:
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        if period_start.tzinfo is None:
            period_start = period_start.replace(tzinfo=timezone.utc)

        period_end = subscription.current_period_end if subscription else None
        if period_end and period_end.tzinfo is None:
            period_end = period_end.replace(tzinfo=timezone.utc)
        return period_start, period_end