import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.enums import SubscriptionStatus
from app.models.plan import Plan
from app.models.subscription import Subscription


class SubscriptionService:
    def _upsert_subscription(
        self,
        db: Session,
        workspace_id: str,
        provider: str,
        plan: Plan,
        subscription_data: dict[str, Any],
        override_status: SubscriptionStatus | None = None,
    ) -> Subscription:

        provider_id = subscription_data.get("id")

       
        subscription = self._get_subscription_by_provider_id(db, provider, provider_id)

        status = override_status or self._map_subscription_status(subscription_data.get("status"))

        # Handle ACTIVE constraint (VERY IMPORTANT)
        if status == SubscriptionStatus.active:
          

            existing_actives = (
                db.query(Subscription)
                .filter(
                    Subscription.workspace_id == workspace_id,
                    Subscription.status == SubscriptionStatus.active,
                    or_(
                        Subscription.provider_subscription_id != provider_id,
                        Subscription.provider_subscription_id.is_(None),
                    ),
                )
                .with_for_update()
                .all()
            )

            for existing_active in existing_actives:
                existing_active.status = SubscriptionStatus.cancelled
                existing_active.canceled_at = datetime.now(timezone.utc)
                existing_active.cancel_at_period_end = True

            if existing_actives:
                db.flush()

        # CREATE OR UPDATE
        if subscription is None:
            subscription = Subscription(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                plan_id=plan.id,
                status=status,
                billing_cycle="monthly",
                start_date=self._from_unix(subscription_data.get("start_at")),
                end_date=self._from_unix(subscription_data.get("end_at")),
                current_period_start=self._from_unix(subscription_data.get("current_start")),
                current_period_end=self._from_unix(subscription_data.get("current_end")),
                provider=provider,
                provider_subscription_id=provider_id,
            )
            db.add(subscription)

        else:
            #  idempotent update
            subscription.plan_id = plan.id
            subscription.status = status
            subscription.provider = provider
            subscription.billing_cycle = "monthly"
            subscription.start_date = self._from_unix(subscription_data.get("start_at"))
            subscription.end_date = self._from_unix(subscription_data.get("end_at"))
            subscription.current_period_start = self._from_unix(subscription_data.get("current_start"))
            subscription.current_period_end = self._from_unix(subscription_data.get("current_end"))

            if provider_id:
                subscription.provider_subscription_id = provider_id

            if status == SubscriptionStatus.cancelled:
                subscription.canceled_at = datetime.now(timezone.utc)

        db.flush()
        return subscription

    def _get_active_subscription(self, db: Session, workspace_id: str) -> Subscription | None:
        return (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .order_by(Subscription.created_at.desc())
            .first()
        )

    def _get_subscription_by_provider_id(
        self,
        db: Session,
        provider: str,
        provider_subscription_id: str | None,
    ) -> Subscription | None:
        if not provider_subscription_id:
            return None
        return (
            db.query(Subscription)
            .filter(
                Subscription.provider == provider,
                Subscription.provider_subscription_id == provider_subscription_id,
            )
            .first()
        )

    def _map_subscription_status(self, status_value: str | None) -> SubscriptionStatus:
        status = (status_value or "").lower()
        if status in {"active", "authenticated"}:
            return SubscriptionStatus.active
        if status in {"cancelled", "completed"}:
            return SubscriptionStatus.cancelled
        if status in {"expired", "halted"}:
            return SubscriptionStatus.expired
        if status in {"pending", "created"}:
            return SubscriptionStatus.trialing
        return SubscriptionStatus.past_due

    def _from_unix(self, value: Any) -> datetime | None:
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromtimestamp(int(value), tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            return None