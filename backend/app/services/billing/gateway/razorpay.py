import hashlib
import json
from typing import Any
from app.core.config import settings
from groq import BadRequestError
from app.models.workspace import Workspace
from app.services.billing.gateway.base import BillingPlanConfig, GatewayPayment, GatewaySubscription, GatewayWebhookEvent, PaymentGateway


class RazorpayGateway(PaymentGateway):
    provider = "razorpay"

    def __init__(self, client: Any, webhook_secret: str | None, public_key: str | None):
        self.client = client
        self.webhook_secret = webhook_secret
        self.public_key = public_key

    @classmethod
    def from_env(cls) -> "RazorpayGateway":
        import razorpay

        key = settings.RAZORPAY_KEY
        secret = settings.RAZORPAY_SECRET
        if not key or not secret:
            raise ValueError("Razorpay is not configured")

        client = razorpay.Client(auth=(key, secret))
        return cls(
            client=client,
            webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET,
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


        try:
            existing = self.client.customer.all({
                "email": user_email
            })

            if existing.get("items"):
                return existing["items"][0]["id"]

        except Exception:
            pass 


   
        try:
            customer = self.client.customer.create({
                "name": user_name or workspace.name,
                "email": user_email,
                "notes": {"workspace_id": str(workspace.id)},
            })
            return customer["id"]

        except BadRequestError as e:
           
            if "Customer already exists" in str(e):
                existing = self.client.customer.all({
                    "email": user_email
                })

                if existing.get("items"):
                    return existing["items"][0]["id"]

        raise
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
