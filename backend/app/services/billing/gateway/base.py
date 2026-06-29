from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any
from app.models.workspace import Workspace


def __getattr__(name: str) -> Any:
    if name == "RESERVATION_TTL_MINUTES":
        try:
            from app.services.config_service import config_service
            ttl = config_service.get("billing_reservation_ttl_seconds")
            if ttl is not None:
                return int(ttl / 60)
        except Exception:
            pass
        return 30

    if name == "RESERVATION_MAX_PER_WORKSPACE":
        try:
            from app.services.config_service import config_service
            val = config_service.get("billing_max_concurrent_reservations")
            if val is not None:
                return val
        except Exception:
            pass
        return 10

    if name == "TOKENS_PER_CREDIT":
        try:
            from app.services.config_service import config_service
            val = config_service.get("tokens_per_credit")
            if val is not None:
                return val
        except Exception:
            pass
        return 1000

    raise AttributeError(f"module {__name__} has no attribute {name}")


@dataclass
class BillingPlanConfig:
    key: str
    label: str
    amount: int
    currency: str
    tokens: int
    provider_plan_ids: dict[str, str | None]
    description: str
    features: list[str]

    @property
    def get_display_credits(self) -> float:
        return self.tokens / TOKENS_PER_CREDIT



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
class TokenBalance:
    tokens_added: float
    tokens_used: float
    tokens_reserved: float
    balance: float



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