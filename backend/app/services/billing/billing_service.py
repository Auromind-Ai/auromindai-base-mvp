import hashlib
import hmac
import tiktoken
import uuid
from datetime import datetime, timezone
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
      
from app.services.billing.entitlement_service import EntitlementService
from .gateway import get_gateway
from .token_service import TokenService
from .usage_service import UsageService
from .subscription_service import SubscriptionService
from .payment_service import PaymentService
from .webhook_service import WebhookService
from .plan_service import PlanService
from app.utils.money import to_paise, verify_paise_amount


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

def enforce_execution_policy(db: Session, workspace_id: str | uuid.UUID, amount: float = 0.0) -> bool:
    if isinstance(workspace_id, str):
        try:
            workspace_id = uuid.UUID(workspace_id)
        except ValueError:
            pass

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return False

    overage_enabled = getattr(workspace, "overage_enabled", False)
    has_payment_method = bool(workspace.provider_customer_id)

    if overage_enabled and has_payment_method:
        return True

    # Single canonical source of truth for AI credit spending permission & usable balance
    credit_summary = BillingService().get_credit_summary(db, workspace_id)
    if not credit_summary.get("spending_allowed", False):
        return False

    credits_balance = float(credit_summary.get("credits_balance", 0.0))
    if amount > 0:
        return credits_balance >= float(amount)
    return credits_balance > 0


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
        billing_cycle: str = "monthly",
        provider: str = "razorpay",
    ) -> dict[str, Any]:
        try:
            workspace = self._get_workspace_for_user(db, workspace_id, user_id)
            plan_config = self.plan_service._get_plan_config(db, plan_key, billing_cycle=billing_cycle)
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
                    "billing_cycle": billing_cycle,
                    "user_id": str(user_id),
                },
            }

            local_plan = self.plan_service._get_or_create_plan(db, plan_config, billing_cycle=billing_cycle)
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
                "billing_cycle": billing_cycle,
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
        billing_cycle: str = "monthly",
        provider: str = "razorpay",
        subscription_id: str | None = None,
        payment_id: str | None = None,
        signature: str | None = None,
    ) -> dict[str, Any]:
        try:
            workspace = self._get_workspace_for_user(db, workspace_id, user_id)
            plan_config = self.plan_service._get_plan_config(db, plan_key, billing_cycle=billing_cycle)
            local_plan = self.plan_service._get_or_create_plan(db, plan_config, billing_cycle=billing_cycle)
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
            from app.services.billing.gst_service import GSTService
            from decimal import Decimal
            gst_calcs = GSTService.calculate_gst(
                amount=Decimal(str(plan_config.amount)),
                customer_state=workspace.billing_state,
                customer_country=workspace.billing_country or "IN",
                product_type="subscription",
                db=db
            )
            expected_amount = to_paise(gst_calcs["total_amount"])
            
            if not verify_paise_amount(fetched_payment.amount, expected_amount, max_tolerance_paise=2):
                raise ValueError(
                    f"Payment amount mismatch: got {fetched_payment.amount} paise, "
                    f"expected {expected_amount} paise (includes GST)"
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

        # Calculate GST on backend
        from app.services.billing.gst_service import GSTService
        from decimal import Decimal
        gst_calcs = GSTService.calculate_gst(
            amount=Decimal(str(pack.amount)),
            customer_state=workspace.billing_state,
            customer_country=workspace.billing_country or "IN",
            product_type="ai_credits",
            db=db
        )
        # Razorpay expects amount in paise (integer)
        amount_paise = to_paise(gst_calcs["total_amount"])

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
        
        # Verify workspace context (Issue #2)
        notes_workspace_id = notes.get("workspace_id")
        if not notes_workspace_id or str(notes_workspace_id) != str(workspace.id):
            raise ValueError("Payment does not belong to this workspace")

        pack_id = notes.get("pack_id")
        if not pack_id:
            raise ValueError("Missing pack_id in payment metadata")

        # Record payment transaction in DB
        pack = db.query(CreditPack).filter(CreditPack.pack_id == pack_id, CreditPack.is_active == True).first()
        if not pack:
            raise ValueError(f"Unknown credit pack: {pack_id}")

        # Calculate GST on backend
        from app.services.billing.gst_service import GSTService
        from decimal import Decimal
        gst_calcs = GSTService.calculate_gst(
            amount=Decimal(str(pack.amount)),
            customer_state=workspace.billing_state,
            customer_country=workspace.billing_country or "IN",
            product_type="ai_credits",
            db=db
        )
        expected_amount = to_paise(gst_calcs["total_amount"])
        if not verify_paise_amount(fetched_payment.amount, expected_amount, max_tolerance_paise=2):
            raise ValueError(f"Payment amount mismatch: got {fetched_payment.amount} paise, expected {expected_amount} paise")

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

        payment = self.payment_service._record_successful_payment(
            db=db,
            provider=provider,
            payment_payload=fetched_payment.raw or {},
            plan_config=DummyPlanConfig(),
            workspace_id=workspace_id,
            subscription=subscription,
            payment_type="ai_credit_recharge",
            description=f"AI Credit Pack ({pack.name})",
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
        workspace_id: str | uuid.UUID,
        user_id: str | uuid.UUID | None = None,
    ) -> dict[str, Any]:
        if user_id:
            workspace = self._get_workspace_for_user(db, workspace_id, user_id)
        else:
            ws_uuid = workspace_id if isinstance(workspace_id, uuid.UUID) else uuid.UUID(str(workspace_id))
            workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
            if not workspace:
                raise ValueError("Workspace not found")

        subscription = (
            db.query(Subscription)
            .options(joinedload(Subscription.workspace))
            .filter(
                Subscription.workspace_id == workspace.id,
                Subscription.status == SubscriptionStatus.active,
            )
            .first()
        )
                # Query Payments
        db_payments = (
            db.query(Payment)
            .filter(Payment.workspace_id == workspace.id)
            .order_by(Payment.created_at.desc())
            .all()
        )
        # Query WCC Recharge Logs
        from app.models.wcc import WCCRechargeLog
        wcc_recharges = (
            db.query(WCCRechargeLog)
            .filter(WCCRechargeLog.workspace_id == workspace.id)
            .order_by(WCCRechargeLog.created_at.desc())
            .all()
        )

        from app.models.invoice import Invoice
        invoices = db.query(Invoice).filter(Invoice.workspace_id == workspace.id).all()
        payment_to_invoice = {inv.payment_id: inv for inv in invoices if inv.payment_id}
        wcc_to_invoice = {inv.wcc_recharge_log_id: inv for inv in invoices if inv.wcc_recharge_log_id}

        all_items = []
        for p in db_payments:
            linked_inv = payment_to_invoice.get(p.id)
            p_type = getattr(p, "payment_type", None) or ("subscription" if p.subscription_id else "ai_credit_recharge")
            p_desc = getattr(p, "description", None) or ("Pro Plan Subscription" if p_type == "subscription" else "AI Credit Recharge")
            
            gst_amount = float(p.gst_amount) if p.gst_amount is not None else 0.0
            total_amount = float(p.total_amount) if p.total_amount is not None else (float(p.amount) / 100.0 if p.amount else 0.0)
            if linked_inv:
                gst_amount = float(linked_inv.gst_amount or 0.0)
                total_amount = float(linked_inv.total_amount or 0.0)

            all_items.append({
                "id": str(p.id),
                "date": self._serialize_datetime(p.created_at),
                "amount": total_amount,
                "gst_amount": gst_amount,
                "status": p.status.value.upper() if hasattr(p.status, "value") else str(p.status).upper(),
                "payment_id": p.provider_payment_id or "N/A",
                "payment_type": p_type,
                "payment_method": getattr(p, 'payment_method', None) or "card",
                "provider": p.provider or "razorpay",
                "description": p_desc,
                "invoice_available": True if (linked_inv and linked_inv.pdf_url) else False,
                "invoice_id": str(linked_inv.id) if linked_inv else None,
                "invoice_number": linked_inv.invoice_number if linked_inv else None,
                "created_at_dt": p.created_at
            })

        for r in wcc_recharges:
            linked_inv = wcc_to_invoice.get(r.id)
            gst_amount = float(r.gst_amount) if getattr(r, 'gst_amount', None) is not None else 0.0
            total_amount = float(r.total_amount) if getattr(r, 'total_amount', None) is not None else float(r.amount)
            if linked_inv:
                gst_amount = float(linked_inv.gst_amount or 0.0)
                total_amount = float(linked_inv.total_amount or 0.0)

            all_items.append({
                "id": str(r.id),
                "date": self._serialize_datetime(r.created_at),
                "amount": total_amount,
                "gst_amount": gst_amount,
                "status": r.status.upper(),
                "payment_id": r.gateway_payment_id or r.gateway_order_id or "N/A",
                "payment_type": "wallet_recharge",
                "payment_method": getattr(r, 'payment_method', None) or "upi",
                "provider": "razorpay",
                "description": f"WhatsApp Wallet Recharge (₹{r.amount})",
                "invoice_available": True if (linked_inv and linked_inv.pdf_url) else False,
                "invoice_id": str(linked_inv.id) if linked_inv else None,
                "invoice_number": linked_inv.invoice_number if linked_inv else None,
                "created_at_dt": r.created_at
            })

        # Sort all items descending by date
        all_items.sort(key=lambda x: x["created_at_dt"].timestamp() if x["created_at_dt"] else 0, reverse=True)
        recent_items = all_items[:50]

        # Clean temporary sorting key
        for item in recent_items:
            item.pop("created_at_dt", None)

        latest_payment = recent_items[0] if recent_items else None

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
        # 3. Credits Calculation from canonical credit summary
        credit_summary = self.get_credit_summary(db, workspace.id)
        credits_total_limit = credit_summary["quota_limit"]
        credits_used = credit_summary["cycle_used"]
        credits_remaining = credit_summary["credits_balance"]
        usage_percent = credit_summary["usage_percent"]

        # Check period end expiration
        is_expired = False
        if subscription and subscription.current_period_end:
            now_utc = datetime.now(timezone.utc)
            end_utc = subscription.current_period_end
            if end_utc.tzinfo is None:
                end_utc = end_utc.replace(tzinfo=timezone.utc)
            if end_utc < now_utc:
                is_expired = True

        if is_expired:
            current_plan_key = "free"
            plan_config = self.plan_service._get_plan_config(db, "free")

        # billing_status logic
        if latest_payment and latest_payment["status"] in ("FAILED", "PAYMENT_FAILED"):
            billing_status = "FAILED"
        elif subscription and subscription.status == SubscriptionStatus.cancelled:
            billing_status = "CANCELLED"
        elif is_expired:
            billing_status = "EXPIRED"
        elif subscription and subscription.status == SubscriptionStatus.active:
            billing_status = "ACTIVE"
        else:
            billing_status = "FREE"

        from app.services.billing.entitlement_service import EntitlementService
        flow_quota = EntitlementService.get_flow_quota(db, str(workspace.id))

        # Handle Free / Expired plan: no recurring paid billing date
        is_free_plan = (current_plan_key == "free") or is_expired
        period_end = None if is_free_plan else (subscription.current_period_end if subscription else None)

        from app.services.wcc_service import WCCService
        wcc_ent = WCCService.check_wcc_entitlement(db, str(workspace.id))

        return {
            "workspace_id": str(workspace.id),
            "current_plan": current_plan_key,
            "plan_label": plan_config.label,
            "billing_status": billing_status,
            "billing_cycle": (subscription.billing_cycle or "monthly").lower() if subscription else None,
            
            # WCC Entitlement canonical fields
            "wcc_locked": wcc_ent["wcc_locked"],
            "wcc_spending_allowed": wcc_ent["spending_allowed"],
            "wcc_status_message": wcc_ent["status_message"],

            # Token values
            "token_limit": total_tokens,
            "tokens_used": used_tokens,
            "tokens_remaining": max(total_tokens - used_tokens, 0),
            
            # Credit values (canonical single source of truth)
            "credits_remaining": credits_remaining,
            "credits_balance": credits_remaining,
            "credits_used": credits_used,
            "cycle_used": credits_used,
            "total_limit": credits_total_limit, 
            "quota_limit": credits_total_limit,
            "percent_used": usage_percent,
            "usage_percent": usage_percent,
            "included_credits": credit_summary["included_credits"],
            "included_remaining": credit_summary["included_remaining"],
            "purchased_credits": credit_summary["purchased_credits"],
            "purchased_remaining": credit_summary["purchased_remaining"],
            "purchased_credits_locked": credit_summary["purchased_credits_locked"],
            "spending_allowed": credit_summary["spending_allowed"],
            "status_message": credit_summary["status_message"],
            "allow_purchased_ai_usage": credit_summary["allow_purchased_ai_usage"],
            "allow_purchased_wcc_usage": credit_summary["allow_purchased_wcc_usage"],
            "allow_purchased_flow_usage": credit_summary["allow_purchased_flow_usage"],
            "allow_ai_topup": credit_summary["allow_ai_topup"],
            
            # Flow Quota values (single source of truth)
            "flow_quota": flow_quota,
            "flows_used": flow_quota["used_quota"],
            "flows_total": flow_quota["total_quota"],
            
            "subscription": {
                "id": str(subscription.id) if subscription else None,
                "status": subscription.status.value.upper() if subscription else None,
                "billing_cycle": (subscription.billing_cycle or "monthly").lower() if subscription else None,
                "current_period_start": self._serialize_datetime(subscription.current_period_start if subscription else None),
                "current_period_end": self._serialize_datetime(period_end),
                "provider": subscription.provider if subscription else None,
            },
            "payments": recent_items,
            "plans": [self.plan_service._serialize_plan(db, p.name) for p in db.query(Plan).filter(Plan.is_active == True).order_by(Plan.display_order.asc(), Plan.created_at.asc()).all()] or [self.plan_service._serialize_plan(db, key) for key in ("free", "solo", "pro", "enterprise")],
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

    def get_credit_summary(self, db: Session, workspace_id: str | uuid.UUID, user_id: str | uuid.UUID | None = None) -> dict[str, Any]:
        """Return real-time credit balance, burn rate, and estimated days remaining based on CURRENT PLAN."""
        if user_id:
            workspace = self._get_workspace_for_user(db, workspace_id, user_id)
        else:
            ws_uuid = workspace_id if isinstance(workspace_id, uuid.UUID) else uuid.UUID(str(workspace_id))
            workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
            if not workspace:
                raise ValueError("Workspace not found")
        
        ws_id = workspace.id



        # 1. Resolve active subscription & period validity
        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == ws_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .order_by(Subscription.created_at.desc())
            .first()
        )

        is_active_paid = False
        plan_name = "free"

        if subscription and subscription.plan_id:
            plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if plan:
                raw_name = (plan.name or "free").lower().strip()
                if raw_name != "free":
                    if subscription.current_period_end:
                        now_utc = datetime.now(timezone.utc)
                        end_utc = subscription.current_period_end
                        if end_utc.tzinfo is None:
                            end_utc = end_utc.replace(tzinfo=timezone.utc)
                        if end_utc > now_utc:
                            is_active_paid = True
                            plan_name = raw_name
                    else:
                        is_active_paid = True
                        plan_name = raw_name
                else:
                    plan_name = "free"

        # 2. Resolve Effective Entitlements (Workspace Overrides -> PlanEntitlement fallback)
        ws_ent = EntitlementService.get_workspace_entitlement(db, ws_id)
        allow_purchased_ai_usage = getattr(ws_ent, "allow_purchased_ai_usage", False) if ws_ent else False
        allow_purchased_wcc_usage = getattr(ws_ent, "allow_purchased_wcc_usage", False) if ws_ent else False
        allow_purchased_flow_usage = getattr(ws_ent, "allow_purchased_flow_usage", False) if ws_ent else False
        allow_ai_topup = getattr(ws_ent, "allow_ai_topup", True) if ws_ent else True

        # 3. Determine current cycle boundaries
        cycle_start = None
        cycle_reset_date = None
        if is_active_paid and subscription:
            cycle_start = subscription.current_period_start
            if subscription.next_entitlement_reset_at:
                cycle_reset_date = subscription.next_entitlement_reset_at.isoformat()
            elif subscription.current_period_end:
                cycle_reset_date = subscription.current_period_end.isoformat()

        # 4. Usage in current cycle
        cycle_used = self.token_service.get_cycle_usage(db, ws_id, cycle_start)
        cycle_inc_used = self.token_service.get_cycle_included_usage(db, ws_id, cycle_start) if is_active_paid else 0.0
        total_reserved = self.token_service.get_active_reservations(db, ws_id)

        # 5. Purchased Grants & Usable Remaining Wallet (Plan-Independent)
        purchased_grants = self.token_service.get_purchased_grants(db, ws_id)
        purchased_used = self.token_service.get_purchased_usage(db, ws_id)
        purchased_raw_remaining = max(0.0, purchased_grants - purchased_used)

        # 6. Current Plan Included Entitlement & Remaining
        if is_active_paid and ws_ent:
            included_credits = float(getattr(ws_ent, "included_ai_credits", 0) or 0)
        else:
            included_credits = 0.0

        included_pool = max(0.0, included_credits - cycle_inc_used)

        # Active reservations allocate against INCLUDED first (if active paid), then PURCHASED
        reserved_on_inc = min(total_reserved, included_pool) if is_active_paid else 0.0
        reserved_on_pur = min(total_reserved - reserved_on_inc, purchased_raw_remaining)

        included_remaining = max(0.0, included_pool - reserved_on_inc)
        purchased_remaining = max(0.0, purchased_raw_remaining - reserved_on_pur)

        # 7. Usable Balance, Quota Limit & Locking
        if is_active_paid:
            if allow_purchased_ai_usage or purchased_grants == 0:
                purchased_credits_locked = False
                credits_balance = included_remaining + purchased_remaining
                quota_limit = included_credits + purchased_grants
                spending_allowed = (credits_balance > 0)
                status_message = None
            else:
                purchased_credits_locked = (purchased_grants > 0)
                credits_balance = included_remaining
                quota_limit = included_credits
                spending_allowed = (credits_balance > 0)
                status_message = "🔒 Purchased AI credits locked — Upgrade to Pro to use purchased credits" if (purchased_grants > 0) else None
        else:
            # Free or Expired workspace
            included_credits = 0.0
            included_remaining = 0.0
            if allow_purchased_ai_usage:
                purchased_credits_locked = False
                credits_balance = purchased_remaining
                quota_limit = purchased_grants
                spending_allowed = (purchased_remaining > 0)
                status_message = None
            else:
                purchased_credits_locked = (purchased_grants > 0)
                credits_balance = 0.0
                quota_limit = 0.0
                spending_allowed = False
                status_message = "🔒 AI credits locked — Upgrade to Pro to use purchased credits" if (purchased_grants > 0) else None

        burn_rate = self.token_service.get_burn_rate(db, ws_id)
        days_remaining = round(float(credits_balance / burn_rate), 2) if burn_rate > 0 else -1.0

        if quota_limit > 0:
            usage_pct = float((cycle_used / quota_limit) * 100.0)
        else:
            usage_pct = 0.0

        if usage_pct >= 80:
            health = "critical"
        elif usage_pct >= 50:
            health = "warning"
        else:
            health = "healthy"

        daily_usage = self.token_service.get_daily_usage(db, ws_id, days=30)
        credit_distribution = self.token_service.get_credit_distribution(db, ws_id, cycle_start)

        return {
            "plan": plan_name,
            "included_credits": included_credits,
            "included_remaining": included_remaining,
            "purchased_credits": purchased_grants,
            "purchased_remaining": purchased_remaining,
            "credits_balance": credits_balance,
            "cycle_used": cycle_used,
            "quota_limit": quota_limit,
            "spending_allowed": spending_allowed,
            "purchased_credits_locked": purchased_credits_locked,
            "allow_purchased_ai_usage": allow_purchased_ai_usage,
            "allow_purchased_wcc_usage": allow_purchased_wcc_usage,
            "allow_purchased_flow_usage": allow_purchased_flow_usage,
            "allow_ai_topup": allow_ai_topup,
            "status_message": status_message,
            "cycle_reset_date": cycle_reset_date,
            "burn_rate": burn_rate,
            "days_remaining": days_remaining,
            "usage_percent": usage_pct,
            "health": health,
            "daily_usage": daily_usage,
            "credit_distribution": credit_distribution,

            # Backward compatibility aliases
            "monthly_grant": included_credits,
            "credits_added": quota_limit,
            "credits_used": cycle_used,
            "credits_reserved": total_reserved,
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


    def _get_workspace_for_user(self, db: Session, workspace_id: str | uuid.UUID, user_id: str | uuid.UUID) -> Workspace:
        import uuid
        ws_uuid = workspace_id if isinstance(workspace_id, uuid.UUID) else uuid.UUID(str(workspace_id))
        u_uuid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))

        membership = (
            db.query(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .filter(
                Workspace.id == ws_uuid,
                WorkspaceMember.user_id == u_uuid,
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
            if subscription.current_period_end:
                now_utc = datetime.now(timezone.utc)
                end_utc = subscription.current_period_end
                if end_utc.tzinfo is None:
                    end_utc = end_utc.replace(tzinfo=timezone.utc)
                if end_utc < now_utc:
                    return "free"  # Expired subscription -> Free plan
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
