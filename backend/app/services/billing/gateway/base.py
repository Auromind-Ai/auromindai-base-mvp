import hashlib
import hmac
import json
import os
import uuid
import tiktoken
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import case, func,or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.enums import PaymentStatus, SubscriptionStatus
from app.models.billing import Payment
from app.models.token_ledger import TokenLedger
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.usage import Usage
from app.models.webhook_event import WebhookEvent
from app.models.workspace import Workspace, WorkspaceMember
from app.services.platform_settings_service import get_setting

RESERVATION_TTL_MINUTES = int(os.getenv("BILLING_RESERVATION_TTL_MINUTES", "30"))
RESERVATION_MAX_PER_WORKSPACE = int(os.getenv("BILLING_MAX_CONCURRENT_RESERVATIONS", "10"))
TOKENS_PER_CREDIT = int(os.getenv("TOKENS_PER_CREDIT", "1000"))


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
    tokens_added: int
    tokens_used: int
    tokens_reserved: int
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