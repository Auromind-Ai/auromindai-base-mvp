import hashlib
import hmac
import json
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import case, func,or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.enums import PaymentStatus, SubscriptionStatus
from app.models.billing import Payment
from app.models.credit_ledger import CreditLedger
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.usage import Usage
from app.models.webhook_event import WebhookEvent
from app.models.workspace import Workspace, WorkspaceMember
from app.services.platform_settings_service import get_setting

RESERVATION_TTL_MINUTES = int(os.getenv("BILLING_RESERVATION_TTL_MINUTES", "30"))


@dataclass
class BillingPlanConfig:
    key: str
    label: str
    amount: int
    currency: str
    credits: int
    provider_plan_ids: dict[str, str | None]
    description: str
    features: list[str]



@dataclass
class GatewaySubscription:
    provider: str
    subscription_id: str
    status: str
    customer_id: str | None = None
    start_at: Any = None
    end_at: Any = None
    current_start: Any = None
    current_end: Any = None
    plan_reference: str | None = None
    raw: dict[str, Any] | None = None


@dataclass
class GatewayPayment:
    provider: str
    payment_id: str
    amount: int
    currency: str
    status: str
    subscription_id: str | None = None
    customer_id: str | None = None
    raw: dict[str, Any] | None = None


@dataclass
class GatewayWebhookEvent:
    provider: str
    event_id: str
    event_type: str
    entity: dict[str, Any]
    raw_event: dict[str, Any]


@dataclass
class CreditBalance:
    credits_added: int
    credits_used: int
    credits_reserved: int
    balance: int


@dataclass
class TokenLimitStatus:
    token_limit: int
    tokens_used: int
    overage_tokens: int
    within_limit: bool
    excess_tokens: int
    price_per_extra_token: int
    estimated_overage_cost: int


class PaymentGateway(ABC):
    provider: str

    @abstractmethod
    def create_subscription(
        self,
        plan_config: BillingPlanConfig,
        workspace: Workspace,
        user_id: str,
        user_email: str,
        user_name: str | None,
    ) -> dict[str, Any]:
        pass

    @abstractmethod
    def verify_payment(self, payload: dict[str, Any]) -> dict[str, str]:
        pass

    @abstractmethod
    def handle_webhook(self, body: bytes, signature: str) -> GatewayWebhookEvent:
        pass

    @abstractmethod
    def fetch_subscription(self, subscription_id: str) -> GatewaySubscription:
        pass

    @abstractmethod
    def fetch_payment(self, payment_id: str) -> GatewayPayment:
        pass

    def create_customer(
        self,
        workspace: Workspace,
        user_email: str,
        user_name: str | None,
    ) -> str | None:
        return None

    def get_public_key(self) -> str | None:
        return None


class RazorpayGateway(PaymentGateway):
    provider = "razorpay"

    def __init__(self, client: Any, webhook_secret: str | None, public_key: str | None):
        self.client = client
        self.webhook_secret = webhook_secret
        self.public_key = public_key

    @classmethod
    def from_env(cls) -> "RazorpayGateway":
        import razorpay

        key = os.getenv("RAZORPAY_KEY")
        secret = os.getenv("RAZORPAY_SECRET")
        if not key or not secret:
            raise ValueError("Razorpay is not configured")

        client = razorpay.Client(auth=(key, secret))
        return cls(
            client=client,
            webhook_secret=os.getenv("RAZORPAY_WEBHOOK_SECRET"),
            public_key=key,
        )

    def get_public_key(self) -> str | None:
        return self.public_key

    def create_customer(
        self,
        workspace: Workspace,
        user_email: str,
        user_name: str | None,
    ) -> str | None:
        customer = self.client.customer.create(
            {
                "name": user_name or workspace.name,
                "email": user_email,
                "notes": {"workspace_id": str(workspace.id)},
            }
        )
        return customer["id"]

    def create_subscription(
        self,
        plan_config: BillingPlanConfig,
        workspace: Workspace,
        user_id: str,
        user_email: str,
        user_name: str | None,
    ) -> dict[str, Any]:
        plan_id = plan_config.provider_plan_ids.get(self.provider)
        if not plan_id:
            raise ValueError(f"Razorpay plan is not configured for {plan_config.label}")
        if not self.public_key:
            raise ValueError("Razorpay public key not configured")

        payload = {
            "plan_id": plan_id,
            "total_count": 12,
            "quantity": 1,
            "customer_notify": 1,
            "notes": {
                "workspace_id": str(workspace.id),
                "plan_key": plan_config.key,
                "user_id": str(user_id),
            },
        }
        subscription_data = self.client.subscription.create(payload)
        return {
            "provider": self.provider,
            "subscription_id": subscription_data["id"],
            "public_key": self.public_key,
            "plan_reference": plan_id,
            "prefill": {
                "email": user_email,
                "name": user_name or user_email,
            },
            "raw": subscription_data,
        }

    def verify_payment(self, payload: dict[str, Any]) -> dict[str, str]:
        verification = {
            "razorpay_payment_id": payload["payment_id"],
            "razorpay_subscription_id": payload["subscription_id"],
            "razorpay_signature": payload["signature"],
        }
        self.client.utility.verify_subscription_payment_signature(verification)
        return {
            "payment_id": payload["payment_id"],
            "subscription_id": payload["subscription_id"],
            "signature": payload["signature"],
        }

    def handle_webhook(self, body: bytes, signature: str) -> GatewayWebhookEvent:
        if not self.webhook_secret:
            raise ValueError("Razorpay webhook secret not configured")

        self.client.utility.verify_webhook_signature(
            body.decode("utf-8"),
            signature,
            self.webhook_secret,
        )

        event = json.loads(body.decode("utf-8"))
        event_name = event.get("event", "")
        payload = event.get("payload", {})
        entity: dict[str, Any]

        if event_name.startswith("subscription."):
            entity = {
                "subscription": payload.get("subscription", {}).get("entity", {}),
                "payment": payload.get("payment", {}).get("entity", {}),
            }
        elif event_name in {"payment.captured", "payment.failed"}:
            entity = {
                "payment": payload.get("payment", {}).get("entity", {}),
                "subscription": payload.get("subscription", {}).get("entity", {}),
            }
        else:
            entity = payload

        event_id = event.get("id") or hashlib.sha256(body).hexdigest()

        return GatewayWebhookEvent(
            provider=self.provider,
            event_id=event_id,
            event_type=event_name,
            entity=entity,
            raw_event=event,
        )

    def fetch_subscription(self, subscription_id: str) -> GatewaySubscription:
        data = self.client.subscription.fetch(subscription_id)
        return GatewaySubscription(
            provider=self.provider,
            subscription_id=data["id"],
            status=data.get("status", ""),
            customer_id=data.get("customer_id"),
            start_at=data.get("start_at"),
            end_at=data.get("end_at"),
            current_start=data.get("current_start"),
            current_end=data.get("current_end"),
            plan_reference=data.get("plan_id"),
            raw=data,
        )

    def fetch_payment(self, payment_id: str) -> GatewayPayment:
        data = self.client.payment.fetch(payment_id)
        return GatewayPayment(
            provider=self.provider,
            payment_id=data["id"],
            amount=int(data.get("amount") or 0),
            currency=(data.get("currency") or "INR").upper(),
            status=(data.get("status") or "").lower(),
            subscription_id=data.get("subscription_id"),
            customer_id=data.get("customer_id"),
            raw=data,
        )


class PayUGateway(PaymentGateway):
    provider = "payu"

    def __init__(self, merchant_key: str | None, salt: str | None, webhook_secret: str | None):
        self.merchant_key = merchant_key
        self.salt = salt
        self.webhook_secret = webhook_secret or salt

    @classmethod
    def from_env(cls) -> "PayUGateway":
        key = os.getenv("PAYU_MERCHANT_KEY")
        salt = os.getenv("PAYU_SALT")
        if not key or not salt:
            raise ValueError("PayU is not configured")
        return cls(
            merchant_key=key,
            salt=salt,
            webhook_secret=os.getenv("PAYU_WEBHOOK_SECRET") or salt,
        )

    def get_public_key(self) -> str | None:
        return self.merchant_key

    def create_subscription(
        self,
        plan_config: BillingPlanConfig,
        workspace: Workspace,
        user_id: str,
        user_email: str,
        user_name: str | None,
    ) -> dict[str, Any]:
        raise ValueError("PayU subscription flow is not production-ready and is disabled")

    def verify_payment(self, payload: dict[str, Any]) -> dict[str, str]:
        raise ValueError("PayU verification is not production-ready and is disabled")

    def handle_webhook(self, body: bytes, signature: str) -> GatewayWebhookEvent:
        raise ValueError("PayU webhooks are not production-ready and are disabled")

    def fetch_subscription(self, subscription_id: str) -> GatewaySubscription:
        raise ValueError("PayU subscription fetch is not production-ready and is disabled")

    def fetch_payment(self, payment_id: str) -> GatewayPayment:
        raise ValueError("PayU payment fetch is not production-ready and is disabled")


def get_gateway(provider: str = "razorpay") -> PaymentGateway:
    normalized = (provider or "razorpay").lower()
    if normalized == "razorpay":
        return RazorpayGateway.from_env()
    if normalized == "payu":
        return PayUGateway.from_env()
    raise ValueError(f"Unsupported payment provider: {provider}")


def check_credits(db: Session, workspace_id: str) -> bool:
    return BillingService().get_credit_balance(db, workspace_id).balance > 0


def check_token_limit(db: Session, workspace_id: str) -> dict[str, Any]:
    status = BillingService().check_token_limit(db, workspace_id)
    return {
        "within_limit": status.within_limit,
        "excess_tokens": status.excess_tokens,
        "token_limit": status.token_limit,
        "tokens_used": status.tokens_used,
        "tokens_remaining": max(status.token_limit - status.tokens_used, 0),
        "overage_tokens": status.overage_tokens,
        "price_per_extra_token": status.price_per_extra_token,
        "estimated_overage_cost": status.estimated_overage_cost,
    }


class BillingService:
    def __init__(self, gateway: PaymentGateway | None = None):
        self.gateway = gateway

    @staticmethod
    def estimate_tokens(*parts: Any) -> int:
        text = " ".join(str(part).strip() for part in parts if part)
        if not text:
            return 0
        return max(len(text) // 4, 1)

    def _resolve_gateway(self, provider: str = "razorpay") -> PaymentGateway:
        if self.gateway is not None:
            return self.gateway
        return get_gateway(provider)

    def create_subscription(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
        user_email: str,
        user_name: str | None,
        plan_key: str,
        provider: str = "razorpay",
    ) -> dict[str, Any]:
        try:
            workspace = self._get_workspace_for_user(db, workspace_id, user_id)
            plan_config = self._get_plan_config(db, plan_key)
            gateway = self._resolve_gateway(provider)

            if plan_config.key == "free":
                raise ValueError("Free plan does not require a paid subscription")

            customer_id = self._ensure_customer(
                db=db,
                workspace=workspace,
                gateway=gateway,
                user_email=user_email,
                user_name=user_name,
            )

            gateway_response = gateway.create_subscription(
                plan_config=plan_config,
                workspace=workspace,
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
            )
            raw_subscription = gateway_response.get("raw") or {
                "id": gateway_response["subscription_id"],
                "status": "created",
                "provider": gateway.provider,
                "plan_id": gateway_response.get("plan_reference"),
                "notes": {
                    "workspace_id": str(workspace.id),
                    "plan_key": plan_config.key,
                    "user_id": str(user_id),
                },
            }

            local_plan = self._get_or_create_plan(db, plan_config)
            self._upsert_subscription(
                db=db,
                workspace_id=str(workspace.id),
                provider=gateway.provider,
                plan=local_plan,
                subscription_data=raw_subscription,
                override_status=SubscriptionStatus.trialing,
            )
            db.commit()

            response = {
                "provider": gateway.provider,
                "subscription_id": gateway_response["subscription_id"],
                "plan": plan_config.key,
                "plan_label": plan_config.label,
                "amount": plan_config.amount,
                "currency": plan_config.currency,
                "credits": plan_config.credits,
                "customer_id": customer_id,
                "prefill": gateway_response.get("prefill", {}),
            }
            if gateway.get_public_key():
                response["public_key"] = gateway.get_public_key()
            if gateway_response.get("payment_id"):
                response["payment_id"] = gateway_response["payment_id"]
            return response
        except Exception:
            db.rollback()
            raise

    def verify_payment(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
        plan_key: str,
        provider: str = "razorpay",
        subscription_id: str | None = None,
        payment_id: str | None = None,
        signature: str | None = None,
    ) -> dict[str, Any]:
        try:
            workspace = self._get_workspace_for_user(db, workspace_id, user_id)
            if str(workspace.id) != str(workspace_id):
                raise ValueError("Authenticated workspace mismatch")
            gateway = self._resolve_gateway(provider)

            verification = gateway.verify_payment(
                {
                    "subscription_id": subscription_id,
                    "payment_id": payment_id,
                    "signature": signature,
                }
            )

            existing_payment = (
                db.query(Payment)
                .filter(
                    Payment.provider == gateway.provider,
                    Payment.provider_payment_id == verification["payment_id"],
                )
                .with_for_update()
                .first()
            )
            if existing_payment and existing_payment.status == PaymentStatus.paid:
                db.commit()
                return {
                    "status": "already_verified",
                    "payment": {
                        "id": str(existing_payment.id),
                        "status": existing_payment.status,
                        "amount": existing_payment.amount,
                    },
                }

            fetched_subscription = gateway.fetch_subscription(verification["subscription_id"])
            fetched_payment = gateway.fetch_payment(verification["payment_id"])

            # Razorpay's payment object doesn't always return subscription_id.
            # Since the cryptographic signature was already verified above, it is safe.
            # We only check if the provider explicitly returned a mismatched ID.
            if fetched_payment.subscription_id and fetched_payment.subscription_id != fetched_subscription.subscription_id:
                raise ValueError("Payment does not belong to the subscription")

            notes = (fetched_subscription.raw or {}).get("notes") or {}
            subscription_workspace_id = str(notes.get("workspace_id") or "")
            if subscription_workspace_id != str(workspace.id):
                raise ValueError("Payment does not belong to this workspace")

            provider_plan_key = self._plan_key_from_subscription_payload(
                db=db,
                provider=provider,
                subscription_payload=fetched_subscription.raw or {},
            )
            if plan_key and plan_key.lower() != provider_plan_key:
                raise ValueError("Requested plan does not match provider subscription")

            plan_config = self._get_plan_config(db, provider_plan_key)
            expected_amount = self._to_provider_minor_units(plan_config.amount)
            if fetched_payment.amount != expected_amount:
                raise ValueError(
        f"Payment amount mismatch: got {fetched_payment.amount} paise "
        f"({fetched_payment.amount / 100}), "
        f"expected {expected_amount} paise "
        f"({plan_config.amount}) — check Razorpay plan vs DB pro_plan_price"
    )

            if fetched_payment.status not in {"captured", "authorized"}:
                raise ValueError("Payment is not in a successful state")

            if workspace.provider_customer_id and fetched_subscription.customer_id:
                if workspace.provider_customer_id != fetched_subscription.customer_id:
                    raise ValueError("Subscription customer does not match workspace")

            local_plan = self._get_or_create_plan(db, plan_config)
            subscription = self._upsert_subscription(
                db=db,
                workspace_id=workspace_id,
                provider=gateway.provider,
                plan=local_plan,
                subscription_data=fetched_subscription.raw or {
                    "id": fetched_subscription.subscription_id,
                    "status": fetched_subscription.status,
                    "provider": gateway.provider,
                    "plan_id": fetched_subscription.plan_reference,
                },
                override_status=SubscriptionStatus.active,
            )

            payment = self._record_successful_payment(
                db=db,
                provider=gateway.provider,
                subscription=subscription,
                payment_payload=fetched_payment.raw or {},
                plan_config=plan_config,
            )
            self._grant_plan_credits(
                db=db,
                workspace_id=workspace_id,
                subscription=subscription,
                payment=payment,
                plan_config=plan_config,
            )
            db.commit()

            return {
                "status": "ACTIVE",
                "provider": gateway.provider,
                "plan": plan_config.key,
                "credits": plan_config.credits,
                "payment_id": verification["payment_id"],
                "subscription_id": verification["subscription_id"],
            }
        except IntegrityError:
            db.rollback()
            existing_payment = (
                db.query(Payment)
                .filter(
                    Payment.provider == provider,
                    Payment.provider_payment_id == payment_id,
                )
                .first()
            )
            if existing_payment and existing_payment.status == PaymentStatus.paid:
                return {
                    "status": "already_verified",
                    "payment": {
                        "id": str(existing_payment.id),
                        "status": existing_payment.status,
                        "amount": existing_payment.amount,
                    },
                }
            raise
        except Exception:
            db.rollback()
            raise

    def handle_webhook(
        self,
        db: Session,
        body: bytes,
        signature: str,
        provider: str = "razorpay",
    ) -> dict[str, Any]:
        try:
            gateway = self._resolve_gateway(provider)
            webhook = gateway.handle_webhook(body, signature)

            existing_event = (
                db.query(WebhookEvent)
                .filter(
                    WebhookEvent.provider == gateway.provider,
                    WebhookEvent.provider_event_id == webhook.event_id,
                )
                .with_for_update()
                .first()
            )

            if existing_event and existing_event.processed:
                db.commit()
                return {
                    "status": "duplicate",
                    "event": webhook.event_type,
                    "event_id": webhook.event_id,
                    "provider": gateway.provider,
                }

            if existing_event is not None:
                webhook_event = existing_event
                webhook_event.payload = webhook.raw_event
                webhook_event.event_type = webhook.event_type
            else:
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
                    db.flush()
                except IntegrityError:
                    db.rollback()
                    existing_event = (
                        db.query(WebhookEvent)
                        .filter(
                            WebhookEvent.provider == gateway.provider,
                            WebhookEvent.provider_event_id == webhook.event_id,
                        )
                        .with_for_update()
                        .first()
                    )
                    if existing_event and existing_event.processed:
                        db.commit()
                        return {
                            "status": "duplicate",
                            "event": webhook.event_type,
                            "event_id": webhook.event_id,
                            "provider": gateway.provider,
                        }
                    webhook_event = existing_event

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

            webhook_event.processed = True
            webhook_event.processed_at = datetime.now(timezone.utc)
            db.flush()
            db.commit()

            return {
                "status": "ok",
                "event": webhook.event_type,
                "event_id": webhook.event_id,
                "provider": gateway.provider,
            }
        except Exception:
            db.rollback()
            raise

    def reserve_credits(
        self,
        db: Session,
        workspace_id: str,
        amount: int,
        reference_key: str,
        description: str,
    ) -> CreditLedger:
        """Reserve credits for a workspace.
        """
        try:
            if amount <= 0:
                raise ValueError("Credit reservation amount must be positive")

            self._lock_workspace(db, workspace_id)

            existing = (
                db.query(CreditLedger)
                .filter(CreditLedger.reference_key == reference_key)
                .with_for_update()
                .first()
            )
            if existing:
                if existing.status == "reserved":
                    db.commit()
                    return existing
                raise ValueError("Reference key has already been finalized")

            balance = self._get_credit_balance_locked(db, workspace_id)
            if balance.balance < amount:
                raise ValueError("Insufficient credits. Please upgrade your plan.")

            active_subscription = self._get_active_subscription(db, workspace_id)
            reservation = CreditLedger(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                subscription_id=active_subscription.id if active_subscription else None,
                entry_type="usage_reservation",
                status="reserved",
                credits_delta=-amount,
                reference_key=reference_key,
                description=description,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESERVATION_TTL_MINUTES),
            )
            db.add(reservation)
            db.flush()
            db.commit()
            return reservation
        except Exception:
            db.rollback()
            raise

    def finalize_credit_usage(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        tokens_used: int = 0,
    ) -> CreditLedger:
        try:
            reservation = (
                db.query(CreditLedger)
                .filter(CreditLedger.id == reservation_id)
                .with_for_update()
                .first()
            )
            if not reservation:
                raise ValueError("Billing reservation not found")
            if reservation.status == "posted":
                db.commit()
                return reservation
            if reservation.status != "reserved":
                raise ValueError("Billing reservation is not active")

            reservation.status = "posted"
            reservation.entry_type = "usage"
            reservation.description = reservation.description or "AI usage"
            usage = self._record_usage_snapshot(
                db=db,
                workspace_id=reservation.workspace_id,
                subscription_id=reservation.subscription_id,
                credits_used=abs(reservation.credits_delta),
                tokens_used=tokens_used,
            )
            self._apply_token_overage(db=db, reservation=reservation, usage=usage)
            db.flush()
            db.commit()
            return reservation
        except Exception:
            db.rollback()
            raise

    def release_credit_reservation(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        reason: str,
    ) -> CreditLedger | None:
        try:
            reservation = (
                db.query(CreditLedger)
                .filter(CreditLedger.id == reservation_id)
                .with_for_update()
                .first()
            )
            if reservation is None:
                db.commit()
                return None
            if reservation.status != "reserved":
                db.commit()
                return reservation

            reservation.status = "released"
            reservation.description = reason
            db.flush()
            db.commit()
            return reservation
        except Exception:
            db.rollback()
            raise

    def get_credit_balance(self, db: Session, workspace_id: str) -> CreditBalance:
        return self._get_credit_balance_locked(db, workspace_id)

    def get_status(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
    ) -> dict[str, Any]:
        workspace = self._get_workspace_for_user(db, workspace_id, user_id)
        subscription = (
            db.query(Subscription)
            .options(joinedload(Subscription.workspace))
            .filter(
                Subscription.workspace_id == workspace.id,
                Subscription.status == SubscriptionStatus.active,
            )
            .first()
        )
        latest_payment = (
            db.query(Payment)
            .filter(Payment.workspace_id == workspace.id)
            .order_by(Payment.created_at.desc())
            .first()
        )

        current_plan_key = "free"
        if subscription and subscription.plan_id:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if plan and plan.name:
                current_plan_key = plan.name.lower()

        plan_config = self._get_plan_config(db, current_plan_key)
        balance = self.get_credit_balance(db, str(workspace.id))
        total_limit = plan_config.credits
        usage_percent = round((balance.credits_used / total_limit) * 100, 1) if total_limit else 0
        token_status = self.check_token_limit(db, str(workspace.id))

        if latest_payment and latest_payment.status == PaymentStatus.failed:
            billing_status = "FAILED"
        elif subscription and subscription.status == SubscriptionStatus.cancelled:
            billing_status = "CANCELLED"
        elif subscription and subscription.status == SubscriptionStatus.active:
            billing_status = "ACTIVE"
        else:
            billing_status = "FREE"

        return {
            "workspace_id": str(workspace.id),
            "current_plan": current_plan_key,
            "plan_label": plan_config.label,
            "billing_status": billing_status,
            "credits_remaining": balance.balance,
            "credits_used": balance.credits_used,
            "credits_added": balance.credits_added,
            "credits_reserved": balance.credits_reserved,
            "total_limit": total_limit,
            "percent_used": usage_percent,
            "token_limit": token_status.token_limit,
            "tokens_used": token_status.tokens_used,
            "tokens_remaining": max(token_status.token_limit - token_status.tokens_used, 0),
            "overage_tokens": token_status.overage_tokens,
            "estimated_overage_cost": token_status.estimated_overage_cost,
            "subscription": {
                "id": str(subscription.id) if subscription else None,
                "provider_subscription_id": (
                    subscription.provider_subscription_id if subscription else None
                ),
                "status": subscription.status.value.upper() if subscription else None,
                "current_period_start": self._serialize_datetime(
                    subscription.current_period_start if subscription else None
                ),
                "current_period_end": self._serialize_datetime(
                    subscription.current_period_end if subscription else None
                ),
                "provider": subscription.provider if subscription else None,
            },
            "latest_payment": {
                "id": str(latest_payment.id) if latest_payment else None,
                "status": latest_payment.status.value.upper() if latest_payment else None,
                "amount": latest_payment.amount if latest_payment else None,
                "payment_id": latest_payment.provider_payment_id if latest_payment else None,
                "failure_reason": latest_payment.failure_reason if latest_payment else None,
                "provider": latest_payment.provider if latest_payment else None,
            },
            "plans": [self._serialize_plan(db, key) for key in ("free", "pro", "enterprise")],
        }

    def check_token_limit(self, db: Session, workspace_id: str) -> TokenLimitStatus:
        subscription = self._get_active_subscription(db, workspace_id)
        if subscription is None or subscription.plan_id is None:
            return TokenLimitStatus(
                token_limit=0,
                tokens_used=0,
                overage_tokens=0,
                within_limit=True,
                excess_tokens=0,
                price_per_extra_token=0,
                estimated_overage_cost=0,
            )

        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
        token_limit = int(plan.token_limit or 0) if plan else 0
        price_per_extra_token = int(plan.price_per_extra_token or 0) if plan else 0
        usage = self._get_period_usage_readonly(
            db=db,
            workspace_id=workspace_id,
            subscription=subscription,
        )
        tokens_used = int(usage.tokens_used or 0) if usage else 0
        overage_tokens = max(tokens_used - token_limit, 0) if token_limit > 0 else 0
        return TokenLimitStatus(
            token_limit=token_limit,
            tokens_used=tokens_used,
            overage_tokens=overage_tokens,
            within_limit=overage_tokens == 0,
            excess_tokens=overage_tokens,
            price_per_extra_token=price_per_extra_token,
            estimated_overage_cost=overage_tokens * price_per_extra_token,
        )

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
        plan_config = self._get_plan_config(db, plan_key)
        local_plan = self._get_or_create_plan(db, plan_config)
        self._upsert_subscription(
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
        plan_config = self._get_plan_config(db, plan_key)
        local_plan = self._get_or_create_plan(db, plan_config)
        self._upsert_subscription(
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

        subscription = self._get_subscription_by_provider_id(db, provider, provider_subscription_id)
        if subscription is None:
            workspace_id = self._extract_workspace_id(subscription_payload)
            if not workspace_id:
                return
            plan_key = self._plan_key_from_subscription_payload(db, provider, subscription_payload)
            plan = self._get_or_create_plan(db, self._get_plan_config(db, plan_key))
            subscription = self._upsert_subscription(
                db=db,
                workspace_id=workspace_id,
                provider=provider,
                plan=plan,
                subscription_data=subscription_payload or {"id": provider_subscription_id, "status": "active"},
                override_status=SubscriptionStatus.active,
            )

        plan_key = self._plan_key_from_subscription(db, subscription)
        plan_config = self._get_plan_config(db, plan_key)
        payment = self._record_successful_payment(
            db=db,
            provider=provider,
            subscription=subscription,
            payment_payload=payment_payload,
            plan_config=plan_config,
        )
        self._grant_plan_credits(
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

        subscription = self._get_subscription_by_provider_id(db, provider, provider_subscription_id)
        if subscription is None:
            workspace_id = self._extract_workspace_id(subscription_payload)
            if not workspace_id:
                return
            plan_key = self._plan_key_from_subscription_payload(db, provider, subscription_payload)
            plan = self._get_or_create_plan(db, self._get_plan_config(db, plan_key))
            subscription = self._upsert_subscription(
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
            self._get_subscription_by_provider_id(db, provider, provider_subscription_id)
            if provider_subscription_id
            else None
        )
        if subscription:
            subscription.status = SubscriptionStatus.past_due

        payment = self._get_payment_by_payment_id(db, provider, payment_payload.get("id"))
        if payment is None and subscription is None:
            return

        amount = int((payment_payload.get("amount") or 0) / 100)
        currency = (payment_payload.get("currency") or "INR").upper()
        failure_reason = payment_payload.get("error_description") or payment_payload.get("error_reason")

        if payment is None:
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

    def _record_successful_payment(
        self,
        db: Session,
        provider: str,
        subscription: Subscription,
        payment_payload: dict[str, Any],
        plan_config: BillingPlanConfig,
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

    def _grant_plan_credits(
        self,
        db: Session,
        workspace_id: str,
        subscription: Subscription,
        payment: Payment,
        plan_config: BillingPlanConfig,
    ) -> CreditLedger:
        reference_key = f"credit_grant:{payment.provider}:{payment.provider_payment_id}"
        existing = (
            db.query(CreditLedger)
            .filter(CreditLedger.reference_key == reference_key)
            .with_for_update()
            .first()
        )
        if existing:
            return existing

        entry = CreditLedger(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            subscription_id=subscription.id,
            payment_id=payment.id,
            entry_type="credit_grant",
            status="posted",
            credits_delta=plan_config.credits,
            reference_key=reference_key,
            description=f"{plan_config.label} subscription credits",
        )
        db.add(entry)
        db.flush()
        return entry

    def _record_usage_snapshot(
        self,
        db: Session,
        workspace_id: str,
        subscription_id: uuid.UUID | None,
        credits_used: int,
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
        usage.messages_used = (usage.messages_used or 0) + credits_used
        usage.tokens_used = (usage.tokens_used or 0) + max(tokens_used, 0)
        db.flush()
        return usage

    def _get_workspace_for_user(self, db: Session, workspace_id: str, user_id: str) -> Workspace:
        membership = (
            db.query(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .filter(
                Workspace.id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
            .first()
        )
        if not membership:
            raise ValueError("Workspace not found or access denied")
        return membership

    def _ensure_customer(
        self,
        db: Session,
        workspace: Workspace,
        gateway: PaymentGateway,
        user_email: str,
        user_name: str | None,
    ) -> str | None:
        if workspace.provider_customer_id:
            return workspace.provider_customer_id

        customer_id = gateway.create_customer(workspace, user_email, user_name)
        if customer_id:
            workspace.provider_customer_id = customer_id
            db.flush()
        return customer_id

    def _get_or_create_plan(self, db: Session, config: BillingPlanConfig) -> Plan:
        billing_cycle = "monthly"
        plan = (
            db.query(Plan)
            .filter(
                Plan.name == config.key,
                Plan.billing_cycle == billing_cycle,
                Plan.currency == config.currency,
            )
            .first()
        )
        if plan:
            plan.price = config.amount
            plan.message_limit = config.credits
            plan.token_limit = config.credits
            plan.features = config.features
            plan.is_active = True
            return plan

        plan = Plan(
            id=uuid.uuid4(),
            name=config.key,
            price=config.amount,
            message_limit=config.credits,
            token_limit=config.credits,
            workspace_limit=1,
            billing_cycle=billing_cycle,
            currency=config.currency,
            is_active=True,
            features=config.features,
        )
        db.add(plan)
        db.flush()
        return plan

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

        # 🔥 1. Try existing by provider_subscription_id
        subscription = self._get_subscription_by_provider_id(db, provider, provider_id)

        status = override_status or self._map_subscription_status(subscription_data.get("status"))

        # 🔥 2. Handle ACTIVE constraint (VERY IMPORTANT)
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

        # 🔥 3. CREATE OR UPDATE
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
            # 🔥 idempotent update
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

    def _serialize_plan(self, db: Session, key: str) -> dict[str, Any]:
        config = self._get_plan_config(db, key)
        return {
            "key": config.key,
            "label": config.label,
            "amount": config.amount,
            "currency": config.currency,
            "credits": config.credits,
            "description": config.description,
            "features": config.features,
            "providers": {
                name: bool(plan_id) for name, plan_id in config.provider_plan_ids.items()
            },
            "is_upgradeable": any(config.provider_plan_ids.values()) and config.key != "free",
        }

    def _get_plan_config(self, db: Session, plan_key: str) -> BillingPlanConfig:
        key = (plan_key or "free").lower()
        if key not in ["free", "pro", "enterprise"]:
            raise ValueError(f"Unsupported plan: {plan_key}")

        label = (get_setting(db, f"{key}_plan_name", key.title()) or key.title()).strip()
        amount = int(float(get_setting(db, f"{key}_plan_price", 0) or 0))
        description = get_setting(db, f"{key}_plan_desc", "") or ""
        features = get_setting(db, f"{key}_plan_features", []) or []

        token_limits = get_setting(db, "token_limit_per_plan", {})
        credits = token_limits.get(key) or token_limits.get("free", 100)

        provider_plan_ids = {
            "razorpay": os.getenv(f"RAZORPAY_{key.upper()}_PLAN_ID") if key != "free" else None,
            "payu": os.getenv(f"PAYU_{key.upper()}_PLAN_ID") if key != "free" else None,
        }

        return BillingPlanConfig(
            key=key,
            label=label,
            amount=amount,
            currency="INR",
            credits=credits,
            provider_plan_ids=provider_plan_ids,
            description=description,
            features=features,
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
            plan_config = self._get_plan_config(db, key)
            if provider_plan_id and provider_plan_id == plan_config.provider_plan_ids.get(provider):
                return key

        subscription = self._get_subscription_by_provider_id(db, provider, subscription_payload.get("id"))
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

    def _get_credit_balance_locked(self, db: Session, workspace_id: str) -> CreditBalance:
        added_expr = func.coalesce(
            func.sum(
                case(
                    (
                        CreditLedger.status == "posted",
                        case((CreditLedger.credits_delta > 0, CreditLedger.credits_delta), else_=0),
                    ),
                    else_=0,
                )
            ),
            0,
        )
        used_expr = func.coalesce(
            func.sum(
                case(
                    (
                        CreditLedger.status == "posted",
                        case((CreditLedger.credits_delta < 0, -CreditLedger.credits_delta), else_=0),
                    ),
                    else_=0,
                )
            ),
            0,
        )
        reserved_expr = func.coalesce(
            func.sum(
                case(
                    (
                        CreditLedger.status == "reserved",
                        case((CreditLedger.credits_delta < 0, -CreditLedger.credits_delta), else_=0),
                    ),
                    else_=0,
                )
            ),
            0,
        )
        net_expr = func.coalesce(
            func.sum(
                case(
                    (CreditLedger.status.in_(["posted", "reserved"]), CreditLedger.credits_delta),
                    else_=0,
                )
            ),
            0,
        )
        added, used, reserved, net = (
            db.query(added_expr, used_expr, reserved_expr, net_expr)
            .filter(CreditLedger.workspace_id == workspace_id)
            .one()
        )
        return CreditBalance(
            credits_added=int(added or 0),
            credits_used=int(used or 0),
            credits_reserved=int(reserved or 0),
            balance=int(net or 0),
        )

    def _lock_workspace(self, db: Session, workspace_id: str, nowait: bool = False) -> Workspace:
        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == workspace_id)
            .with_for_update(nowait=nowait)
            .first()
        )
        if workspace is None:
            raise ValueError("Workspace not found")
        return workspace

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

    def _apply_token_overage(
        self,
        db: Session,
        reservation: CreditLedger,
        usage: Usage | None,
    ) -> CreditLedger | None:
        if usage is None or reservation.subscription_id is None:
            return None

        subscription = (
            db.query(Subscription)
            .filter(Subscription.id == reservation.subscription_id)
            .with_for_update()
            .first()
        )
        if subscription is None or subscription.plan_id is None:
            return None

        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
        if plan is None:
            return None

        token_limit = int(plan.token_limit or 0)
        price_per_extra_token = int(plan.price_per_extra_token or 0)
        current_tokens_used = int(usage.tokens_used or 0)
        total_overage_tokens = max(current_tokens_used - token_limit, 0) if token_limit > 0 else 0
        previously_billed_overage = int(usage.overage_tokens or 0)
        incremental_overage_tokens = max(total_overage_tokens - previously_billed_overage, 0)

        usage.overage_tokens = total_overage_tokens
        if incremental_overage_tokens <= 0 or price_per_extra_token <= 0:
            db.flush()
            return None

        overage_credits = incremental_overage_tokens * price_per_extra_token
        period_start_ts = int(usage.period_start.timestamp()) if usage.period_start is not None else 0
        reference_key = f"overage:{period_start_ts}:{reservation.reference_key}"
        existing = (
            db.query(CreditLedger)
            .filter(CreditLedger.reference_key == reference_key)
            .with_for_update()
            .first()
        )
        if existing:
            return existing

        overage_entry = CreditLedger(
            id=uuid.uuid4(),
            workspace_id=reservation.workspace_id,
            subscription_id=reservation.subscription_id,
            payment_id=reservation.payment_id,
            entry_type="overage",
            status="posted",
            credits_delta=-overage_credits,
            reference_key=reference_key,
            description="Token overage charge",
            metadata_json=json.dumps(
                {
                    "reservation_reference_key": reservation.reference_key,
                    "incremental_overage_tokens": incremental_overage_tokens,
                    "total_overage_tokens": total_overage_tokens,
                    "price_per_extra_token": price_per_extra_token,
                    "overage_credits": overage_credits,
                }
            ),
        )
        db.add(overage_entry)
        db.flush()
        return overage_entry

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

    def _serialize_datetime(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()


def verify_webhook_hmac_signature(body: bytes, signature: str, secret: str) -> bool:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)
