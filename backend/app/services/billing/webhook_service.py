from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.enums import PaymentStatus, SubscriptionStatus
from app.models.billing import Payment
from app.models.subscription import Subscription
from app.models.webhook_event import WebhookEvent
from app.services.billing.gateway.base import GatewayWebhookEvent
from app.services.billing.payment_service import PaymentService
from app.services.billing.plan_service import PlanService
from app.services.billing.subscription_service import SubscriptionService
from app.models.plan import Plan
from app.services.billing.token_service import TokenService
from app.services.billing.usage_service import UsageService



class WebhookService:
    def __init__(self, token_service: TokenService):
        self.token_service = token_service
        self.subscription_service = SubscriptionService()
        self.payment_service = PaymentService()
        self.plan_service = PlanService()


    def handle_webhook(
        self,
        db: Session,
        body: bytes,
        signature: str,
        provider: str = "razorpay",
    ) -> dict[str, Any]:
        # Use a try/except/finally so we can always attempt to release the distributed lock
        try:
            from app.services.billing.gateway import get_gateway
            gateway = get_gateway(provider)
            webhook = gateway.handle_webhook(body, signature)

            # Attempt to acquire a Redis-backed distributed lock so only one instance processes the event
            core_redis = None
            try:
                from app.core.metrics import redis_client as core_redis
            except Exception:
                core_redis = None

            lock_key = f"webhook-lock:{gateway.provider}:{webhook.event_id}"
            lock_token = None
            if core_redis:
                try:
                    import uuid
                    lock_token = str(uuid.uuid4())
                    acquired = core_redis.set(lock_key, lock_token, nx=True, ex=60)
                    if not acquired:
                        db.commit()
                        return {
                            "status": "duplicate",
                            "event": webhook.event_type,
                            "event_id": webhook.event_id,
                            "provider": gateway.provider,
                        }
                except Exception:
                    # If Redis fails, fall back to DB-based locking below
                    lock_token = None

            # =========================================================
            # PHASE 1: DURABLE AUDIT LOG (Commit immediately)
            # =========================================================
            webhook_event = (
                db.query(WebhookEvent)
                .filter(
                    WebhookEvent.provider == gateway.provider,
                    WebhookEvent.provider_event_id == webhook.event_id,
                )
                .first()
            )

            # CREATE IF NOT EXISTS AND COMMIT NOW
            if webhook_event is None:
                webhook_event = WebhookEvent(
                    id=uuid.uuid4(),
                    provider=gateway.provider,
                    provider_event_id=webhook.event_id,
                    event_type=webhook.event_type,
                    payload=webhook.raw_event,
                    processed=False,
                    processed_at=None,
                )
                db.add(webhook_event)
                try:
                    db.commit() # 🔥 Audit log is now permanently saved
                except Exception:
                    db.rollback() # Another thread beat us to it, which is fine

            # =========================================================
            # PHASE 2: PROCESSING WITH ROW LOCK
            # =========================================================
            # Re-fetch with FOR UPDATE to safely lock the row for processing
            webhook_event = (
                db.query(WebhookEvent)
                .filter(
                    WebhookEvent.provider == gateway.provider,
                    WebhookEvent.provider_event_id == webhook.event_id,
                )
                .with_for_update()
                .first()
            )

            # IF ALREADY PROCESSED → EXIT
            if webhook_event and webhook_event.processed:
                db.rollback() # Release the row lock safely
                return {
                    "status": "duplicate",
                    "event": webhook.event_type,
                    "event_id": webhook.event_id,
                    "provider": gateway.provider,
                }

            # UPDATE PAYLOAD (in case of retry with new payload data)
            webhook_event.payload = webhook.raw_event
            webhook_event.event_type = webhook.event_type

            try:
                # PROCESS EVENT
                if webhook.event_type in {"subscription.created", "subscription.authenticated"}:
                    self._handle_subscription_created(db, gateway.provider, webhook.entity)

                elif webhook.event_type == "subscription.activated":
                    self._handle_subscription_activated(db, gateway.provider, webhook.entity)

                elif webhook.event_type in {"payment.captured", "subscription.charged"}:
                    self._handle_payment_success(db, gateway.provider, webhook.entity)

                elif webhook.event_type == "payment.failed":
                    self._handle_payment_failed(db, gateway.provider, webhook.entity)

                elif webhook.event_type in {"subscription.cancelled", "subscription.completed"}:
                    self._handle_subscription_cancelled(db, gateway.provider, webhook.entity)

                # MARK AS PROCESSED
                webhook_event.processed = True
                webhook_event.processed_at = datetime.now(timezone.utc)

                db.flush()
                db.commit() #  Commit all business logic

                return {
                    "status": "ok",
                    "event": webhook.event_type,
                    "event_id": webhook.event_id,
                    "provider": gateway.provider,
                }

            except Exception as e:
                db.rollback() #  Roll back ONLY the failed business logic
                
                # Re-fetch the audit log to ensure it remains in a failed/unprocessed state
                failed_event = db.query(WebhookEvent).filter(
                    WebhookEvent.provider == gateway.provider,
                    WebhookEvent.provider_event_id == webhook.event_id
                ).first()
                if failed_event:
                    failed_event.processed = False
                    db.commit() # Save the failure state
                
                # Re-raise so the API returns a 500 and Razorpay knows to retry
                raise e

        except Exception:
            db.rollback()
            raise
        finally:
            # Release Redis lock only if we set it and still own it
            try:
                if 'core_redis' in locals() and core_redis and lock_token:
                    try:
                        lua = (
                            "if redis.call('get', KEYS[1]) == ARGV[1] then "
                            "return redis.call('del', KEYS[1]) else return 0 end"
                        )
                        core_redis.eval(lua, 1, lock_key, lock_token)
                    except Exception:
                        try:
                            if core_redis.get(lock_key) == lock_token:
                                core_redis.delete(lock_key)
                        except Exception:
                            pass
            except Exception:
                pass

    def _handle_subscription_created(
        self,
        db: Session,
        provider: str,
        entity: dict[str, Any],
    ) -> None:
        subscription_payload = self._get_subscription_payload(entity)
        workspace_id = self._extract_workspace_id(subscription_payload)
        if not workspace_id:
            return

        plan_key = self._plan_key_from_subscription_payload(db, provider, subscription_payload)
        plan_config = self.plan_service._get_plan_config(db, plan_key)
        local_plan = self.plan_service._get_or_create_plan(db, plan_config)
        self.subscription_service._upsert_subscription(
            db=db,
            workspace_id=workspace_id,
            provider=provider,
            plan=local_plan,
            subscription_data=subscription_payload,
            override_status=SubscriptionStatus.trialing,
        )

    def _handle_subscription_activated(
        self,
        db: Session,
        provider: str,
        entity: dict[str, Any],
    ) -> None:
        subscription_payload = self._get_subscription_payload(entity)
        workspace_id = self._extract_workspace_id(subscription_payload)
        if not workspace_id:
            return

        plan_key = self._plan_key_from_subscription_payload(db, provider, subscription_payload)
        plan_config = self.plan_service._get_plan_config(db, plan_key)
        local_plan = self.plan_service._get_or_create_plan(db, plan_config)
        self.subscription_service._upsert_subscription(
            db=db,
            workspace_id=workspace_id,
            provider=provider,
            plan=local_plan,
            subscription_data=subscription_payload,
            override_status=SubscriptionStatus.active,
        )

    def _handle_payment_success(
        self,
        db: Session,
        provider: str,
        entity: dict[str, Any],
    ) -> None:
        payment_payload = self._get_payment_payload(entity)
        subscription_payload = self._get_subscription_payload(entity)

        provider_subscription_id = payment_payload.get("subscription_id") or subscription_payload.get("id")
        if not provider_subscription_id:
            return

        subscription = self.subscription_service._get_subscription_by_provider_id(db, provider, provider_subscription_id)
        if subscription is None:
            workspace_id = self._extract_workspace_id(subscription_payload)
            if not workspace_id:
                return
            plan_key = self._plan_key_from_subscription_payload(db, provider, subscription_payload)
            plan = self.plan_service._get_or_create_plan(db, self.plan_service._get_plan_config(db, plan_key))
            subscription = self.subscription_service._upsert_subscription(
                db=db,
                workspace_id=workspace_id,
                provider=provider,
                plan=plan,
                subscription_data=subscription_payload or {"id": provider_subscription_id, "status": "active"},
                override_status=SubscriptionStatus.active,
            )

        plan_key = self._plan_key_from_subscription(db, subscription)
        plan_config = self.plan_service._get_plan_config(db, plan_key)
        from app.services.billing.gateway import get_gateway
        gateway = get_gateway(provider)
        fetched_payment = gateway.fetch_payment(payment_payload.get("id"))

        expected_amount = self._to_provider_minor_units(plan_config.amount)

        if fetched_payment.amount != expected_amount:
            raise ValueError(
                f"Webhook amount mismatch: got {fetched_payment.amount}, expected {expected_amount}"
            )

        if fetched_payment.status != "captured":
            raise ValueError("Payment not captured")

        if fetched_payment.currency != plan_config.currency:
            raise ValueError("Currency mismatch")

        payment = self.payment_service._record_successful_payment(
            db=db,
            provider=provider,
            subscription=subscription,
            payment_payload=fetched_payment.raw or {},
            plan_config=plan_config,
        )
        self.token_service.grant_plan_tokens(
            db=db,
            workspace_id=str(subscription.workspace_id),
            subscription=subscription,
            payment=payment,
            plan_config=plan_config,
        )

    def _handle_subscription_cancelled(
        self,
        db: Session,
        provider: str,
        entity: dict[str, Any],
    ) -> None:
        subscription_payload = self._get_subscription_payload(entity)
        provider_subscription_id = subscription_payload.get("id")
        if not provider_subscription_id:
            return

        subscription = self.subscription_service._get_subscription_by_provider_id(db, provider, provider_subscription_id)
        if subscription is None:
            workspace_id = self._extract_workspace_id(subscription_payload)
            if not workspace_id:
                return
            plan_key = self._plan_key_from_subscription_payload(db, provider, subscription_payload)
            plan = self.plan_service._get_or_create_plan(db, self.plan_service._get_plan_config(db, plan_key))
            subscription = self.subscription_service._upsert_subscription(
                db=db,
                workspace_id=workspace_id,
                provider=provider,
                plan=plan,
                subscription_data=subscription_payload,
                override_status=SubscriptionStatus.cancelled,
            )
        else:
            subscription.status = SubscriptionStatus.cancelled
            subscription.canceled_at = datetime.now(timezone.utc)
            subscription.cancel_at_period_end = True
            subscription.current_period_end = self._from_unix(subscription_payload.get("end_at"))
            db.flush()

    def _handle_payment_failed(
        self,
        db: Session,
        provider: str,
        entity: dict[str, Any],
    ) -> None:
        payment_payload = self._get_payment_payload(entity)
        provider_subscription_id = payment_payload.get("subscription_id")
        subscription = (
            self.subscription_service._get_subscription_by_provider_id(db, provider, provider_subscription_id)
            if provider_subscription_id
            else None
        )
        if subscription:
            subscription.status = SubscriptionStatus.past_due

        payment = self.payment_service._get_payment_by_payment_id(db, provider, payment_payload.get("id"))
        if payment is None and subscription is None:
            return

        amount = int((payment_payload.get("amount") or 0) / 100)
        currency = (payment_payload.get("currency") or "INR").upper()
        failure_reason = payment_payload.get("error_description") or payment_payload.get("error_reason")

        if payment is None:
            import uuid
            payment = Payment(
                id=uuid.uuid4(),
                workspace_id=subscription.workspace_id,
                subscription_id=subscription.id,
                amount=amount,
                currency=currency,
                provider=provider,
                status=PaymentStatus.failed,
                provider_payment_id=payment_payload.get("id"),
                provider_order_id=provider_subscription_id,
                failure_reason=failure_reason,
                idempotency_key=f"{provider}:failed:{payment_payload.get('id')}",
            )
            db.add(payment)
        else:
            payment.status = PaymentStatus.failed
            payment.failure_reason = failure_reason
        db.flush()

    

    def _plan_key_from_subscription_payload(
        self,
        db: Session,
        provider: str,
        subscription_payload: dict[str, Any],
    ) -> str:
        notes = subscription_payload.get("notes") or {}
        if notes.get("plan_key"):
            return str(notes["plan_key"]).lower()

        provider_plan_id = subscription_payload.get("plan_id")
        for key in ("free", "pro", "enterprise"):
            plan_config = self.plan_service._get_plan_config(db, key)
            if provider_plan_id and provider_plan_id == plan_config.provider_plan_ids.get(provider):
                return key

        subscription = self.subscription_service._get_subscription_by_provider_id(db, provider, subscription_payload.get("id"))
        return self._plan_key_from_subscription(db, subscription)

    def _plan_key_from_subscription(self, db: Session, subscription: Subscription | None) -> str:
        if subscription and subscription.plan_id:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if plan and plan.name:
                return plan.name.lower()
        return "free"

    def _extract_workspace_id(self, subscription_payload: dict[str, Any]) -> str | None:
        notes = subscription_payload.get("notes") or {}
        workspace_id = notes.get("workspace_id")
        if workspace_id:
            return str(workspace_id)
        return str(subscription_payload.get("workspace_id")) if subscription_payload.get("workspace_id") else None

    def _get_subscription_payload(self, entity: dict[str, Any]) -> dict[str, Any]:
        if "subscription" in entity and isinstance(entity["subscription"], dict):
            return entity["subscription"]
        return entity

    def _get_payment_payload(self, entity: dict[str, Any]) -> dict[str, Any]:
        if "payment" in entity and isinstance(entity["payment"], dict):
            return entity["payment"]
        return entity

    def _to_provider_minor_units(self, amount_major: int) -> int:
        return int(amount_major * 100)

    def _from_unix(self, value: Any) -> datetime | None:
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromtimestamp(int(value), tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            return None