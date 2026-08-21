import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Any
from sqlalchemy.orm import Session
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.workspace import Workspace
from app.core.enums import SubscriptionStatus
from app.models.plan_entitlement import PlanEntitlement
from app.services.billing.entitlement_service import EntitlementService
from app.services.billing.provisioning_contract import IAIBillingProvisioner, IWCCBillingProvisioner
from app.services.billing.gateway.base import TOKENS_PER_CREDIT
from app.models.wcc import WCCWallet, WCCRechargeLog
from app.services.wcc_service import WCCService
from app.services.billing.usage_service import UsageService
from app.services.billing.token_service import TokenService
from app.services.wcc_service import WCCService
from app.models.wcc import WCCRechargeLog
from app.models.token_ledger import TokenLedger
from app.models.billing import Payment
from sqlalchemy import func, or_

class AIBillingProvisioner(IAIBillingProvisioner):
    def initialize(self, db: Session, workspace_id: uuid.UUID, entitlement: PlanEntitlement) -> None:
        from app.models.token_ledger import TokenLedger
        
        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active
            )
            .order_by(Subscription.created_at.desc())
            .first()
        )
        if not subscription:
            raise ValueError(f"No active subscription found for workspace {workspace_id}")

        ref_key = f"token_grant:{workspace_id}:{subscription.id}"
        # Check if already granted
        existing = db.query(TokenLedger).filter(TokenLedger.reference_key == ref_key).first()
        if not existing:
            grant = TokenLedger(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                subscription_id=subscription.id,
                entry_type="token_grant",
                status="posted",
                tokens_delta=0,
                credits_delta=entitlement.included_ai_credits,
                balance_source="INCLUDED",
                reference_key=ref_key,
                description="Included plan AI credits"
            )
            db.add(grant)
            db.flush()



class WCCBillingProvisioner(IWCCBillingProvisioner):
    def initialize(self, db: Session, workspace_id: uuid.UUID, entitlement: PlanEntitlement) -> None:
       
        
        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active
            )
            .order_by(Subscription.created_at.desc())
            .first()
        )
        if not subscription:
            raise ValueError(f"No active subscription found for workspace {workspace_id}")

        # Get or create wallet
        WCCService.get_balance(db, workspace_id)
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).with_for_update().first()
        
        promo_amount = entitlement.included_wcc_wallet
        if promo_amount > 0:
            payment_id = f"promo_grant:{workspace_id}:{subscription.id}"
            existing = db.query(WCCRechargeLog).filter(WCCRechargeLog.gateway_payment_id == payment_id).first()
            if not existing:
                recharge = WCCRechargeLog(
                    id=uuid.uuid4(),
                    workspace_id=workspace_id,
                    amount=promo_amount,
                    currency="INR",
                    gateway_order_id=f"promo_grant:{subscription.id}",
                    gateway_payment_id=payment_id,
                    status="success"
                )
                db.add(recharge)
                wallet.included_balance = (wallet.included_balance or Decimal("0.00")) + promo_amount
                wallet.balance = (wallet.included_balance or Decimal("0.00")) + (wallet.purchased_balance or Decimal("0.00"))
                db.flush()


class EntitlementOrchestrator:
    @classmethod
    def on_workspace_created(cls, db: Session, workspace_id: uuid.UUID) -> None:
   
        # 1. Fetch default free plan
        plan = db.query(Plan).filter(Plan.name == "free").first()
        if not plan:
            raise ValueError("No default 'free' plan found in database. Run seeds first.")

        # 2. Check if subscription already exists (idempotency check)
        existing_sub = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active
            )
            .first()
        )
        if not existing_sub:
            # Create subscription
            subscription = Subscription(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                plan_id=plan.id,
                status=SubscriptionStatus.active,
                billing_cycle="monthly",
                start_date=datetime.now(timezone.utc),
                end_date=datetime.now(timezone.utc) + timedelta(days=3650),
                current_period_start=datetime.now(timezone.utc),
                current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
                provider="system",
                provider_subscription_id=f"sub_free_{workspace_id}"
            )
            db.add(subscription)
            db.flush()


        entitlement = EntitlementService.ensure_plan_entitlement(db, plan)

        # 4. Provision resources (AI & WCC)
        cls.provision_resources(db, workspace_id, entitlement)

        # 5. Sync plan type on workspace
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if workspace:
            workspace.plan_type = plan.name
            db.flush()

    @classmethod
    def provision_resources(cls, db: Session, workspace_id: uuid.UUID, entitlement: PlanEntitlement) -> None:
        # AI Billing
        AIBillingProvisioner().initialize(db, workspace_id, entitlement)

        # WCC Billing
        WCCBillingProvisioner().initialize(db, workspace_id, entitlement)

    @classmethod
    def renew_subscription(cls, db: Session, workspace_id: uuid.UUID, payment: Any | None = None) -> None:
        
        if isinstance(workspace_id, str):
            workspace_id = uuid.UUID(workspace_id)

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active
            )
            .order_by(Subscription.created_at.desc())
            .first()
        )
        if not subscription:
            return

        # Payment-level idempotency guard: If this exact payment was already processed, exit immediately!
        if payment and getattr(payment, "provider_payment_id", None):
            grant_ref_key = f"token_grant:{payment.provider}:{payment.provider_payment_id}"
            already_processed = db.query(TokenLedger).filter(TokenLedger.reference_key == grant_ref_key).first()
            if already_processed:
                import logging
                logging.getLogger("app").info(f"Payment {payment.provider_payment_id} already processed for workspace {workspace_id}. Skipping duplicate entitlement renewal.")
                return

        entitlement = EntitlementService.get_workspace_entitlement(db, workspace_id)

        # 1. AI Credits Reset Policy
        included_pool = db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(
            TokenLedger.workspace_id == workspace_id,
            TokenLedger.status == "posted",
            TokenLedger.balance_source == "INCLUDED"
        ).scalar() or Decimal("0.0000")

        if entitlement.included_credit_reset_policy == "EXPIRE" and included_pool > 0:
            expire_entry = TokenLedger(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                subscription_id=subscription.id,
                entry_type="token_expiration",
                status="posted",
                tokens_delta=0,
                credits_delta=-Decimal(str(included_pool)),
                balance_source="INCLUDED",
                reference_key=f"token_expire:{workspace_id}:{subscription.id}:{datetime.now(timezone.utc).timestamp()}",
                description="Expired unused plan credits on renewal"
            )
            db.add(expire_entry)
            db.flush()

        if payment:
            grant_ref_key = f"token_grant:{payment.provider}:{payment.provider_payment_id}"
        else:
            grant_ref_key = f"token_grant:{workspace_id}:{subscription.id}:{datetime.now(timezone.utc).timestamp()}"

        # Check if already granted to prevent double-granting on concurrent webhook/payment flow
        existing = db.query(TokenLedger).filter(TokenLedger.reference_key == grant_ref_key).first()
        if not existing:
            grant = TokenLedger(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                subscription_id=subscription.id,
                payment_id=payment.id if payment else None,
                entry_type="token_grant",
                status="posted",
                tokens_delta=0,
                credits_delta=entitlement.included_ai_credits,
                balance_source="INCLUDED",
                reference_key=grant_ref_key,
                description="Renewed plan AI credits"
            )
            db.add(grant)
            db.flush()


        # 2. WCC Wallet Reset Policy (Only reset INCLUDED promo balance, NEVER touch purchased_balance!)
        WCCService.get_balance(db, workspace_id)
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).with_for_update().first()
        if wallet:
            if payment:
                wcc_ref_key = f"promo_grant:{payment.provider}:{payment.provider_payment_id}"
            else:
                wcc_ref_key = f"promo_grant:{workspace_id}:{subscription.id}:{datetime.now(timezone.utc).timestamp()}"

            existing_wcc = db.query(WCCRechargeLog).filter(WCCRechargeLog.gateway_payment_id == wcc_ref_key).first()
            if not existing_wcc:
                if entitlement.included_wallet_reset_policy == "EXPIRE":
                    wallet.included_balance = Decimal("0.00")
                    db.flush()

                promo_amount = entitlement.included_wcc_wallet
                if promo_amount > 0:
                    recharge = WCCRechargeLog(
                        id=uuid.uuid4(),
                        workspace_id=workspace_id,
                        amount=promo_amount,
                        currency="INR",
                        gateway_order_id=f"promo_grant:{subscription.id}",
                        gateway_payment_id=wcc_ref_key,
                        status="success"
                    )
                    db.add(recharge)
                    wallet.included_balance += promo_amount
                    db.flush()

                wallet.balance = (wallet.included_balance or Decimal("0.00")) + (wallet.purchased_balance or Decimal("0.00"))
                db.flush()

        # Update reset timestamps with calendar month math
        import calendar
        dt = datetime.now(timezone.utc)
        month = dt.month % 12 + 1
        year = dt.year + (dt.month // 12)
        max_day = calendar.monthrange(year, month)[1]
        next_dt = dt.replace(year=year, month=month, day=min(dt.day, max_day))

        subscription.last_entitlement_reset_at = dt
        subscription.next_entitlement_reset_at = next_dt
        db.flush()

    @classmethod
    def upgrade_subscription(cls, db: Session, workspace_id: uuid.UUID, new_plan_id: uuid.UUID) -> None:
        cls._change_subscription_plan(db, workspace_id, new_plan_id)

    @classmethod
    def downgrade_subscription(cls, db: Session, workspace_id: uuid.UUID, new_plan_id: uuid.UUID) -> None:
        cls._change_subscription_plan(db, workspace_id, new_plan_id)

    @classmethod
    def _change_subscription_plan(cls, db: Session, workspace_id: uuid.UUID, new_plan_id: uuid.UUID) -> None:
        # 1. Cancel previous active subscription
        active_sub = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active
            )
            .first()
        )
        if active_sub:
            current_entitlement = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == active_sub.plan_id).first()
            if current_entitlement:
                included_pool = db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(
                    TokenLedger.workspace_id == workspace_id,
                    TokenLedger.status == "posted",
                    TokenLedger.balance_source == "INCLUDED"
                ).scalar() or Decimal("0.0000")

                if current_entitlement.included_credit_reset_policy == "EXPIRE" and included_pool > 0:
                    expire_entry = TokenLedger(
                        id=uuid.uuid4(),
                        workspace_id=workspace_id,
                        subscription_id=active_sub.id,
                        entry_type="token_expiration",
                        status="posted",
                        tokens_delta=0,
                        credits_delta=-Decimal(str(included_pool)),
                        balance_source="INCLUDED",
                        reference_key=f"token_expire:{workspace_id}:{active_sub.id}:{datetime.now(timezone.utc).timestamp()}",
                        description="Expired unused plan credits on plan change"
                    )
                    db.add(expire_entry)
                    db.flush()

                if current_entitlement.included_wallet_reset_policy == "EXPIRE":
                    WCCService.get_balance(db, workspace_id)
                    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).with_for_update().first()
                    if wallet:
                        wallet.included_balance = Decimal("0.00")
                        wallet.balance = (wallet.included_balance or Decimal("0.00")) + (wallet.purchased_balance or Decimal("0.00"))
                        db.flush()

            active_sub.status = SubscriptionStatus.cancelled
            active_sub.canceled_at = datetime.now(timezone.utc)
            db.flush()

        # 2. Fetch new plan
        new_plan = db.query(Plan).filter(Plan.id == new_plan_id).first()
        if not new_plan:
            raise ValueError(f"Plan {new_plan_id} not found in database.")

        # 3. Update active subscription in-place or create new
        if active_sub:
            active_sub.plan_id = new_plan.id
            active_sub.status = SubscriptionStatus.active
            active_sub.billing_cycle = getattr(new_plan, "billing_cycle", "monthly") or "monthly"
            active_sub.current_period_start = datetime.now(timezone.utc)
            active_sub.current_period_end = datetime.now(timezone.utc) + timedelta(days=365 if getattr(new_plan, "billing_cycle", "monthly") == "yearly" else 30)
            active_sub.canceled_at = None
            active_sub.cancel_at_period_end = False
            active_sub.provider_subscription_id = f"sub_{new_plan.name}_{workspace_id}_{datetime.now(timezone.utc).timestamp()}"
            db.flush()
        else:
            new_sub = Subscription(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                plan_id=new_plan.id,
                status=SubscriptionStatus.active,
                billing_cycle=getattr(new_plan, "billing_cycle", "monthly") or "monthly",
                start_date=datetime.now(timezone.utc),
                end_date=datetime.now(timezone.utc) + timedelta(days=365 if getattr(new_plan, "billing_cycle", "monthly") == "yearly" else 30),
                current_period_start=datetime.now(timezone.utc),
                current_period_end=datetime.now(timezone.utc) + timedelta(days=365 if getattr(new_plan, "billing_cycle", "monthly") == "yearly" else 30),
                provider="system",
                provider_subscription_id=f"sub_{new_plan.name}_{workspace_id}_{datetime.now(timezone.utc).timestamp()}"
            )
            db.add(new_sub)
            db.flush()

        entitlement = EntitlementService.ensure_plan_entitlement(db, new_plan)

        # 5. Provision resources
        cls.provision_resources(db, workspace_id, entitlement)

        # 6. Sync plan type on workspace
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if workspace:
            workspace.plan_type = new_plan.name
            db.flush()
