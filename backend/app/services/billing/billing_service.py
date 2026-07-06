import hashlib
import hmac
import tiktoken
import uuid
from datetime import datetime
from typing import Any
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from app.core.enums import PaymentStatus, SubscriptionStatus
from app.models.billing import Payment
from app.models.token_ledger import TokenLedger
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.workspace import Workspace, WorkspaceMember
from app.models.credit_pack import CreditPack
from .gateway.base import TOKENS_PER_CREDIT, PaymentGateway, TokenBalance, TokenLimitStatus

from .gateway import get_gateway
from .token_service import TokenService
from .usage_service import UsageService
from .subscription_service import SubscriptionService
from .payment_service import PaymentService
from .webhook_service import WebhookService
from .plan_service import PlanService


def check_tokens(db: Session, workspace_id: str) -> bool:
    return BillingService().get_token_balance(db, workspace_id).balance > 0


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

def enforce_execution_policy(db: Session, workspace_id: str, amount: int = 0) -> bool:
    # 1. Check if overage billing is allowed
    subscription = SubscriptionService()._get_active_subscription(db, workspace_id)
    if not subscription:
        return False
        
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return False
        
    overage_enabled = getattr(workspace, "overage_enabled", False)
    has_payment_method = bool(workspace.provider_customer_id)
    
    if overage_enabled and has_payment_method:
        return True
        
    # 2. If overages are not enabled/valid, enforce ledger limits
    balance_info = BillingService().token_service.get_token_balance(db, workspace_id)
    if amount > 0:
        return balance_info.balance >= amount
    return balance_info.balance > 0


class BillingService:

    def __init__(self, gateway: PaymentGateway | None = None):
        self.gateway = gateway
        self.usage_service = UsageService()
        self.token_service = TokenService(self.usage_service)
        self.subscription_service = SubscriptionService()
        self.payment_service = PaymentService()
        self.webhook_service = WebhookService(self.token_service)
        self.plan_service = PlanService()

    @staticmethod
    def credits_to_tokens(credits: float) -> int:
       
        return int(credits * TOKENS_PER_CREDIT)
    
    @staticmethod
    def tokens_to_credits(tokens: int) -> float:
        
        return float(tokens) / TOKENS_PER_CREDIT
    
    @staticmethod
    def estimate_reservation_amount(message: str, use_rag: bool = True) -> int:
        
    
        input_tokens = BillingService.estimate_tokens(message)

        if use_rag:
            buffer = input_tokens + 2000 + 500  
        else:
            buffer = input_tokens + 500  
        
        # Add 20% safety margin
        return int(buffer * 1.2)
    
    @staticmethod
    def estimate_tokens(*parts: Any) -> int:
        text = " ".join(str(part).strip() for part in parts if part)
        if not text:
            return 0

        # Prefer accurate tokenization when available
        try:
            try:
                enc = tiktoken.encoding_for_model("gpt-4")
            except Exception:
                enc = tiktoken.get_encoding("cl100k_base")

            return len(enc.encode(text))
        except Exception:
            # Fallback heuristic (approx 4 chars per token)
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
            plan_config = self.plan_service._get_plan_config(db, plan_key)
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

            local_plan = self.plan_service._get_or_create_plan(db, plan_config)
            self.subscription_service._upsert_subscription(
                db=db,
                workspace_id=str(workspace.id),
                provider=gateway.provider,
                plan=local_plan,
                subscription_data=raw_subscription,
                override_status=SubscriptionStatus.pending,
            )
            db.commit()

            response = {
                "provider": gateway.provider,
                "subscription_id": gateway_response["subscription_id"],
                "plan": plan_config.key,
                "plan_label": plan_config.label,
                "amount": plan_config.amount,
                "currency": plan_config.currency,
                "credits": float(plan_config.tokens) / TOKENS_PER_CREDIT,
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

            plan_config = self.plan_service._get_plan_config(db, provider_plan_key)
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

            local_plan = self.plan_service._get_or_create_plan(db, plan_config)
            subscription = self.subscription_service._upsert_subscription(
                db=db,
                workspace_id=workspace_id,
                provider=gateway.provider,
                plan=local_plan,
                subscription_data=fetched_subscription.raw or {
                    "id": fetched_subscription.subscription_id,
                    "status": fetched_subscription.status,
                    "provider": gateway.provider,
                },
                override_status=SubscriptionStatus.active,
            )

            payment = self.payment_service._record_successful_payment(
                db=db,
                provider=gateway.provider,
                subscription=subscription,
                payment_payload=fetched_payment.raw or {},
                plan_config=plan_config,
            )
            from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator
            EntitlementOrchestrator.renew_subscription(
                db=db,
                workspace_id=uuid.UUID(str(workspace_id)),
                payment=payment,
            )
            db.commit()

            return {
                "status": "ACTIVE",
                "provider": gateway.provider,
                "plan": plan_config.key,
                "credits": float(plan_config.tokens) / TOKENS_PER_CREDIT,
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

    def initiate_credit_pack_purchase(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
        pack_id: str,
        provider: str = "razorpay",
    ) -> dict[str, Any]:
        pack = db.query(CreditPack).filter(CreditPack.pack_id == pack_id, CreditPack.is_active == True).first()
        if not pack:
            raise ValueError(f"Unknown credit pack: {pack_id}")

        workspace = self._get_workspace_for_user(db, workspace_id, user_id)
        gateway = self._resolve_gateway(provider)

        # Razorpay expects amount in paise (integer)
        amount_paise = int(pack.amount * 100)

        order_payload = {
            "amount": amount_paise,
            "currency": pack.currency,
            "payment_capture": 1,
            "notes": {
                "workspace_id": str(workspace.id),
                "pack_id": pack_id,
                "type": "credit_pack_purchase"
            }
        }

        # Create Razorpay order
        order_data = gateway.client.order.create(order_payload)

        return {
            "provider": gateway.provider,
            "gateway_order_id": order_data["id"],
            "pack_id": pack_id,
            "amount": amount_paise,
            "currency": pack.currency,
            "public_key": gateway.get_public_key(),
        }

    def verify_credit_pack_payment(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
        order_id: str,
        payment_id: str,
        signature: str,
        provider: str = "razorpay",
    ) -> dict[str, Any]:
        workspace = self._get_workspace_for_user(db, workspace_id, user_id)
        gateway = self._resolve_gateway(provider)

        # Verify signature
        payload = {
            "order_id": order_id,
            "payment_id": payment_id,
            "signature": signature,
        }
        gateway.verify_payment(payload)

        # Fetch payment details to verify metadata and amount
        fetched_payment = gateway.fetch_payment(payment_id)
        if fetched_payment.status != "captured":
            raise ValueError("Payment not captured")

        notes = fetched_payment.raw.get("notes", {}) if fetched_payment.raw else {}
        pack_id = notes.get("pack_id")
        if not pack_id:
            raise ValueError("Missing pack_id in payment metadata")

        # Record payment transaction in DB
        pack = db.query(CreditPack).filter(CreditPack.pack_id == pack_id, CreditPack.is_active == True).first()
        if not pack:
            raise ValueError(f"Unknown credit pack: {pack_id}")

        # Check if already processed (idempotency check)
        from app.models.token_ledger import TokenLedger
        reference_key = f"purchase:{workspace_id}:{payment_id}"
        existing = db.query(TokenLedger).filter(TokenLedger.reference_key == reference_key).first()
        if existing:
            return {
                "status": "success",
                "message": "Payment verified, credits already granted",
                "payment_id": payment_id,
            }

        # Create mock PlanConfig for successful payment record helper
        class DummyPlanConfig:
            amount = pack.amount
            currency = pack.currency

        subscription = self.subscription_service._get_active_subscription(db, workspace_id)
        if not subscription:
            raise ValueError("No active subscription found for workspace to attach payment to")

        payment = self.payment_service._record_successful_payment(
            db=db,
            provider=provider,
            subscription=subscription,
            payment_payload=fetched_payment.raw or {},
            plan_config=DummyPlanConfig(),
        )

        # Grant credits
        self.token_service.grant_purchased_credits(
            db=db,
            workspace_id=workspace_id,
            credits=float(pack.credits),
            payment_id=str(payment.id),
            gateway_order_id=order_id,
            description=f"Purchased AI Credit Pack: {pack.name}"
        )
        db.commit()

        return {
            "status": "success",
            "message": f"Successfully purchased {pack.name}",
            "payment_id": payment_id,
            "credits_granted": pack.credits,
        }


    def handle_webhook(
        self,
        db: Session,
        body: bytes,
        signature: str,
        provider: str = "razorpay",
    ) -> dict[str, Any]:
        return self.webhook_service.handle_webhook(db, body, signature, provider)

    def reserve_tokens(
        self,
        db: Session,
        workspace_id: str,
        amount: int,
        reference_key: str,
        description: str,
    ) -> TokenLedger:
        return self.token_service.reserve_tokens(db, workspace_id, amount, reference_key, description)

    def finalize_token_usage(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        tokens_used: int = 0,
    ) -> TokenLedger:
        return self.token_service.finalize_token_usage(db, reservation_id, tokens_used)

    def settle_from_provider_usage(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        usage: dict,
        feature_key: str,
        execution_id: str,
        request_id: str | None = None,
    ) -> TokenLedger:
       
        return self.token_service.settle_from_provider_usage(
            db=db,
            reservation_id=reservation_id,
            usage=usage,
            feature_key=feature_key,
            execution_id=execution_id,
            request_id=request_id,
        )

    def release_token_reservation(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        reason: str,
    ) -> TokenLedger | None:
        return self.token_service.release_token_reservation(db, reservation_id, reason)

    def get_token_balance(self, db: Session, workspace_id: str) -> TokenBalance:
        return self.token_service.get_token_balance(db, workspace_id)

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
        
        payments = (
            db.query(Payment)
            .filter(Payment.workspace_id == workspace.id)
            .order_by(Payment.created_at.desc())
            .limit(50)
            .all()
        )
        latest_payment = payments[0] if payments else None

        # Get the plan key
        current_plan_key = "free"
        if subscription and subscription.plan_id:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if plan and plan.name:
                current_plan_key = plan.name.lower()

       
        plan_config = self.plan_service._get_plan_config(db, current_plan_key)
        total_tokens = plan_config.tokens 
        token_status = self.check_token_limit(db, str(workspace.id))
        used_tokens = token_status.tokens_used

        # 3. Credits Calculation from ledger balance
        balance_info = self.token_service.get_token_balance(db, str(workspace.id))
        credits_total_limit = balance_info.tokens_added
        credits_used = balance_info.tokens_used
        credits_remaining = balance_info.balance

        
        usage_percent = round((used_tokens / total_tokens) * 100, 1) if total_tokens > 0 else 0

        # billing_status logic remains the same
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
            
            # Token values
            "token_limit": total_tokens,
            "tokens_used": used_tokens,
            "tokens_remaining": max(total_tokens - used_tokens, 0),
            
            # Credit values 
            "credits_remaining": credits_remaining,
            "credits_used": credits_used,
            "total_limit": credits_total_limit, 
            "percent_used": usage_percent,
            
            "subscription": {
                "id": str(subscription.id) if subscription else None,
                "status": subscription.status.value.upper() if subscription else None,
                "current_period_start": self._serialize_datetime(subscription.current_period_start if subscription else None),
                "current_period_end": self._serialize_datetime(subscription.current_period_end if subscription else None),
                "provider": subscription.provider if subscription else None,
            },
            "payments": [
                {
                    "id": str(p.id),
                    "date": self._serialize_datetime(p.created_at),
                    "amount": p.amount,
                    "status": p.status.value.upper(),
                    "payment_id": p.provider_payment_id,
                } for p in payments
            ],
            "plans": [self.plan_service._serialize_plan(db, key) for key in ("free", "pro", "enterprise")],
        }
    def check_token_limit(self, db: Session, workspace_id: str) -> TokenLimitStatus:
        subscription = self.subscription_service._get_active_subscription(db, workspace_id)
        if subscription is None or subscription.plan_id is None:
            # Fall back to free plan
            plan = db.query(Plan).filter(Plan.name == "free").first()
            token_limit = plan.token_limit if plan else 100000
            price_per_extra_token = 0
            
            from sqlalchemy import func
            from datetime import timezone
            now = datetime.now(timezone.utc)
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            tokens_used = (
                db.query(func.sum(TokenLedger.tokens_used))
                .filter(
                    TokenLedger.workspace_id == workspace_id,
                    TokenLedger.status == "posted",
                    TokenLedger.entry_type == "usage",
                    TokenLedger.created_at >= period_start,
                )
                .scalar() or 0
            )
            tokens_used = int(tokens_used)
            
            overage_tokens = max(tokens_used - token_limit, 0)
            within_limit = tokens_used < token_limit
            
            return TokenLimitStatus(
                token_limit=token_limit,
                tokens_used=tokens_used,
                overage_tokens=overage_tokens,
                within_limit=within_limit,
                excess_tokens=overage_tokens,
                price_per_extra_token=price_per_extra_token,
                estimated_overage_cost=0,
            )

        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
        token_limit = plan.token_limit if plan else 0
        price_per_extra_token = int(plan.price_per_extra_token or 0) if plan else 0
        
        usage = self.usage_service._get_period_usage_readonly(
            db=db,
            workspace_id=workspace_id,
            subscription=subscription,
        )
        tokens_used = int(usage.tokens_used or 0) if usage else 0
        
        if token_limit is None:
            # Unlimited
            overage_tokens = 0
            within_limit = True
        else:
            token_limit = int(token_limit)
            overage_tokens = max(tokens_used - token_limit, 0)
            within_limit = tokens_used < token_limit
            
        return TokenLimitStatus(
            token_limit=token_limit if token_limit is not None else 0, # type compatibility
            tokens_used=tokens_used,
            overage_tokens=overage_tokens,
            within_limit=within_limit,
            excess_tokens=overage_tokens,
            price_per_extra_token=price_per_extra_token,
            estimated_overage_cost=overage_tokens * price_per_extra_token,
        )

    def get_credit_summary(self, db: Session, workspace_id: str, user_id: str) -> dict[str, Any]:
        """Return real-time credit balance, burn rate, and estimated days remaining."""
        workspace = self._get_workspace_for_user(db, workspace_id, user_id)
        balance = self.token_service.get_token_balance(db, str(workspace.id))
        burn_rate = self.token_service.get_burn_rate(db, str(workspace.id))
        daily_usage = self.token_service.get_daily_usage(db, str(workspace.id), days=30)

        credits_balance = float(balance.balance)
        credits_added = float(balance.tokens_added)
        credits_used = float(balance.tokens_used)
        credits_reserved = float(balance.tokens_reserved)

        days_remaining = float(credits_balance / burn_rate) if burn_rate > 0 else -1.0

        # Determine health status
        if credits_added > 0:
            usage_pct = float((credits_used / credits_added) * 100)
        else:
            usage_pct = 0.0

        if usage_pct >= 80:
            health = "critical"
        elif usage_pct >= 50:
            health = "warning"
        else:
            health = "healthy"

        return {
            "credits_balance": credits_balance,
            "credits_added": credits_added,
            "credits_used": credits_used,
            "credits_reserved": credits_reserved,
            "burn_rate": burn_rate,
            "days_remaining": days_remaining,
            "usage_percent": usage_pct,
            "health": health,
            "daily_usage": daily_usage,
        }

    def get_credit_history(self, db: Session, workspace_id: str, user_id: str, page: int = 1, limit: int = 20) -> dict:
        """Return paginated credit transaction history."""
        self._get_workspace_for_user(db, workspace_id, user_id)
        return self.token_service.get_transaction_history(db, workspace_id, page, limit)

    def list_credit_packs(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
    ) -> list[dict[str, Any]]:
        """Return active AI credit packs available to the workspace."""
        self._get_workspace_for_user(db, workspace_id, user_id)
        packs = (
            db.query(CreditPack)
            .filter(CreditPack.is_active == True)
            .order_by(CreditPack.amount.asc(), CreditPack.created_at.asc())
            .all()
        )
        return [
            {
                "id": str(pack.id),
                "pack_id": pack.pack_id,
                "name": pack.name,
                "amount": float(pack.amount),
                "credits": int(pack.credits),
                "currency": pack.currency,
            }
            for pack in packs
        ]


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

        # Already exists → return
        if workspace.provider_customer_id:
            return workspace.provider_customer_id

        try:
            # Try create / fetch from gateway
            customer_id = gateway.create_customer(
                workspace,
                user_email,
                user_name,
            )

        except Exception as e:
            # log this properly
            raise ValueError(f"Failed to create or fetch customer: {str(e)}")

        if not customer_id:
            return None

        # Save safely 
        try:
            workspace.provider_customer_id = customer_id
            db.flush()
        except Exception:
            db.rollback()

            # 4. Re-fetch 
            refreshed = (
                db.query(Workspace)
                .filter(Workspace.id == workspace.id)
                .first()
            )

            if refreshed and refreshed.provider_customer_id:
                return refreshed.provider_customer_id

            raise

        return customer_id


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

    def _to_provider_minor_units(self, amount_major: int) -> int:
        return int(amount_major * 100)

    def _serialize_datetime(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()


def verify_webhook_hmac_signature(body: bytes, signature: str, secret: str) -> bool:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)
