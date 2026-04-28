import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.core.enums import PaymentStatus, SubscriptionStatus
from app.models.billing import Payment
from app.models.subscription import Subscription


class PaymentService:
    def _record_successful_payment(
        self,
        db: Session,
        provider: str,
        subscription: Subscription,
        payment_payload: dict[str, Any],
        plan_config: Any,
    ) -> Payment:
        provider_payment_id = payment_payload.get("id")
        if not provider_payment_id:
            raise ValueError("Successful payment payload missing provider payment id")

        payment = (
            db.query(Payment)
            .filter(
                Payment.provider == provider,
                Payment.provider_payment_id == provider_payment_id,
            )
            .with_for_update()
            .first()
        )
        amount_major = int((payment_payload.get("amount") or 0) / 100) or plan_config.amount
        currency = (payment_payload.get("currency") or plan_config.currency or "INR").upper()

        if payment is None:
            payment = Payment(
                id=uuid.uuid4(),
                workspace_id=subscription.workspace_id,
                subscription_id=subscription.id,
                amount=amount_major,
                currency=currency,
                provider=provider,
                status=PaymentStatus.paid,
                provider_payment_id=provider_payment_id,
                provider_order_id=payment_payload.get("subscription_id") or subscription.provider_subscription_id,
                billing_start=subscription.current_period_start,
                billing_end=subscription.current_period_end,
                idempotency_key=f"{provider}:payment:{provider_payment_id}",
            )
            db.add(payment)
        else:
            payment.subscription_id = subscription.id
            payment.amount = amount_major
            payment.currency = currency
            payment.status = PaymentStatus.paid
            payment.provider_order_id = payment_payload.get("subscription_id") or subscription.provider_subscription_id
            payment.billing_start = subscription.current_period_start
            payment.billing_end = subscription.current_period_end

        subscription.status = SubscriptionStatus.active
        db.flush()
        return payment

    def _get_payment_by_payment_id(
        self,
        db: Session,
        provider: str,
        payment_id: str | None,
    ) -> Payment | None:
        if not payment_id:
            return None
        return (
            db.query(Payment)
            .filter(
                Payment.provider == provider,
                Payment.provider_payment_id == payment_id,
            )
            .first()
        )