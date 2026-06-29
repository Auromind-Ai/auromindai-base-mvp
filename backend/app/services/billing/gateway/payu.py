from typing import Any
from app.models.workspace import Workspace
from app.services.billing.gateway.base import BillingPlanConfig, GatewayPayment, GatewaySubscription, GatewayWebhookEvent, PaymentGateway


class PayUGateway(PaymentGateway):
    provider = "payu"

    def __init__(self, merchant_key: str | None, salt: str | None, webhook_secret: str | None):
        self.merchant_key = merchant_key
        self.salt = salt
        self.webhook_secret = webhook_secret or salt

    @classmethod
    def from_env(cls) -> "PayUGateway":
        from app.services.config_service import config_service
        key = config_service.get("payu_merchant_key")
        salt = config_service.get("payu_salt")
        webhook_secret = config_service.get("payu_webhook_secret")
        if not key or not salt:
            raise ValueError("PayU is not configured")
        return cls(
            merchant_key=key,
            salt=salt,
            webhook_secret=webhook_secret or salt,
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
        raise ValueError("PayU webhooks are not production-ready and is disabled")

    def fetch_subscription(self, subscription_id: str) -> GatewaySubscription:
        raise ValueError("PayU subscription fetch is not production-ready and is disabled")

    def fetch_payment(self, payment_id: str) -> GatewayPayment:
        raise ValueError("PayU payment fetch is not production-ready and is disabled")
