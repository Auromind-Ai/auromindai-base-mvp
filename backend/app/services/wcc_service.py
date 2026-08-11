import uuid
import threading
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy import update, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.wcc import WCCWallet, WCCRateCard, WCCTransaction, WCCRechargeLog
from app.models.workspace import Workspace
from app.services.billing.gateway import get_gateway
from app.services.billing import normalize_workspace_id
from app.core.logger import logger
from app.utils.money import to_paise, verify_paise_amount
from datetime import datetime, timezone
from app.core.enums import SubscriptionStatus
from app.models.subscription import Subscription
from app.models.plan import Plan

class InsufficientWCCBalanceError(Exception):
    def __init__(self, required: Decimal, available: Decimal, shortfall: Decimal):
        self.required = required
        self.available = available
        self.shortfall = shortfall
        super().__init__(
            f"Insufficient WCC balance. "
            f"Required: ₹{required:.2f}, Available: ₹{available:.2f}. "
            f"Please recharge ₹{shortfall:.2f} or more to continue."
        )


class WCCService:
    _debit_lock = threading.RLock()
    @classmethod
    def check_wcc_entitlement(cls, db: Session, workspace_id: uuid.UUID | str) -> dict:
       
    

        workspace_id = normalize_workspace_id(workspace_id)

        is_active_paid = False
        sub = (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .first()
        )
        if sub and sub.plan_id:
            plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
            if plan and plan.name and plan.name.lower() != "free":
                if sub.current_period_end:
                    now_utc = datetime.now(timezone.utc)
                    end_utc = sub.current_period_end
                    if end_utc.tzinfo is None:
                        end_utc = end_utc.replace(tzinfo=timezone.utc)
                    if end_utc >= now_utc:
                        is_active_paid = True
                else:
                    is_active_paid = True

        from app.services.billing.entitlement_service import EntitlementService
        ws_ent = EntitlementService.get_workspace_entitlement(db, workspace_id)
        allow_purchased_wcc_usage = getattr(ws_ent, "allow_purchased_wcc_usage", False) if ws_ent else False

        wallet = cls.get_balance(db, workspace_id)
        inc_val = Decimal(str(wallet.included_balance or "0.00"))
        purchased_val = Decimal(str(wallet.purchased_balance or "0.00"))
        total_val = Decimal(str(wallet.balance or "0.00"))
        has_purchased_value = (purchased_val > Decimal("0.00")) or (total_val > Decimal("0.00"))

        now_utc = datetime.now(timezone.utc)
        is_expired = bool(sub and sub.current_period_end and (
            sub.current_period_end if sub.current_period_end.tzinfo else sub.current_period_end.replace(tzinfo=timezone.utc)
        ) < now_utc)
        sub_state = "ACTIVE" if is_active_paid else ("EXPIRED" if is_expired else "FREE")

        if is_active_paid:
            if allow_purchased_wcc_usage or not has_purchased_value:
                return {
                    "wcc_locked": False,
                    "spending_allowed": True,
                    "subscription_state": "ACTIVE",
                    "status_message": None,
                    "is_active_paid": True,
                }
            else:
                return {
                    "wcc_locked": True,
                    "spending_allowed": False,
                    "subscription_state": "ACTIVE",
                    "status_message": "WCC wallet locked — Admin disabled purchased WCC usage for your plan",
                    "is_active_paid": True,
                }

        # Free or Expired Plan
        if allow_purchased_wcc_usage or inc_val > Decimal("0.00"):
            # Either admin explicitly granted purchased WCC usage OR workspace has included balance!
            spending_allowed = (inc_val > Decimal("0.00")) or (allow_purchased_wcc_usage and purchased_val > Decimal("0.00"))
            return {
                "wcc_locked": False if (allow_purchased_wcc_usage or inc_val > Decimal("0.00")) else True,
                "spending_allowed": spending_allowed,
                "subscription_state": sub_state,
                "status_message": None,
                "is_active_paid": False,
            }
        else:
            if has_purchased_value:
                return {
                    "wcc_locked": True,
                    "spending_allowed": False,
                    "subscription_state": sub_state,
                    "status_message": "WCC wallet locked — Upgrade to a paid plan to use your purchased balance",
                    "is_active_paid": False,
                }
            else:
                return {
                    "wcc_locked": False,
                    "spending_allowed": False,
                    "subscription_state": sub_state,
                    "status_message": None,
                    "is_active_paid": False,
                }

    @classmethod
    def get_balance(cls, db: Session, workspace_id: uuid.UUID | str) -> WCCWallet:
        """
        Retrieve WCC balance. Automatically initialize at ₹0.00 if it does not exist.
        """
        workspace_id = normalize_workspace_id(workspace_id)
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).first()
        if not wallet:
            # Use nested transaction (savepoint) to isolate insertion
            nested = db.begin_nested()
            try:
                wallet = WCCWallet(
                    workspace_id=workspace_id,
                    balance=Decimal("0.00"),
                    currency="INR"
                )
                db.add(wallet)
                db.flush()
                nested.commit()
            except IntegrityError:
                nested.rollback()
                wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).first()
        else:
            cls._reconcile_wallet_if_needed(db, wallet)
        return wallet

    @classmethod
    def _reconcile_wallet_if_needed(cls, db: Session, wallet: WCCWallet) -> None:
        if not wallet or not wallet.workspace_id:
            return

        promo_logs = (
            db.query(WCCRechargeLog)
            .filter(
                WCCRechargeLog.workspace_id == wallet.workspace_id,
                WCCRechargeLog.status == "success",
                WCCRechargeLog.gateway_payment_id.like("promo_grant:%")
            )
            .all()
        )
        if not promo_logs:
            return

        total_promo_granted = sum((Decimal(str(r.taxable_amount or r.amount or "0.00")) for r in promo_logs), Decimal("0.00"))

        total_debits = (
            db.query(func.coalesce(func.sum(WCCTransaction.customer_price_applied), func.sum(WCCTransaction.debit_amount), Decimal("0.00")))
            .filter(
                WCCTransaction.workspace_id == wallet.workspace_id,
                WCCTransaction.transaction_type == "debit",
                WCCTransaction.status.in_(["success", "free_session"])
            )
            .scalar() or Decimal("0.00")
        )
        total_debits = Decimal(str(total_debits))

        current_included = wallet.included_balance or Decimal("0.00")
        expected_included = max(Decimal("0.00"), total_promo_granted - total_debits)

        if expected_included > current_included:
            missing_promo = expected_included - current_included
            wallet.included_balance = expected_included
            wallet.balance = (wallet.included_balance or Decimal("0.00")) + (wallet.purchased_balance or Decimal("0.00"))
            
            # Update stale balance_after snapshots on previous recharge logs
            existing_recharge_logs = (
                db.query(WCCRechargeLog)
                .filter(
                    WCCRechargeLog.workspace_id == wallet.workspace_id,
                    WCCRechargeLog.balance_after != None
                )
                .all()
            )
            for rlog in existing_recharge_logs:
                rlog.balance_after = Decimal(str(rlog.balance_after)) + missing_promo

            logger.info(
                f"Self-healing WCC wallet for workspace {wallet.workspace_id}: "
                f"restored missing promo balance of {missing_promo} INR. "
                f"New included_balance: {wallet.included_balance}, new total balance: {wallet.balance}"
            )
            db.flush()

    @classmethod
    def get_fuel_gauge_data(cls, db: Session, workspace_id: uuid.UUID | str) -> dict:
    
        workspace_id = normalize_workspace_id(workspace_id)
        wallet = cls.get_balance(db, workspace_id)
        current_balance = Decimal(str(wallet.balance or "0.00"))

        # Find the most recent successful recharge transaction
        latest_recharge = (
            db.query(WCCRechargeLog)
            .filter(
                WCCRechargeLog.workspace_id == workspace_id,
                WCCRechargeLog.status == "success"
            )
            .order_by(WCCRechargeLog.created_at.desc())
            .first()
        )

        latest_recharge_tx = (
            db.query(WCCTransaction)
            .filter(
                WCCTransaction.workspace_id == workspace_id,
                WCCTransaction.transaction_type == "recharge"
            )
            .order_by(WCCTransaction.created_at.desc())
            .first()
        )

        reference_full_amount = Decimal("0.00")
        last_recharge_amount = None
        last_recharge_at = None

        if latest_recharge:
            recharge_amt = Decimal(str(latest_recharge.taxable_amount or latest_recharge.amount or "0.00"))
            last_recharge_amount = recharge_amt
            last_recharge_at = latest_recharge.created_at

           
            balance_after_stored = latest_recharge.balance_after
            if (
                balance_after_stored is not None
                and balance_after_stored > 0
                and Decimal(str(balance_after_stored)) >= current_balance
            ):
                reference_full_amount = Decimal(str(balance_after_stored))
            else:
                # Reconstruct: sum all debits after latest recharge + current balance
                debits_since = (
                    db.query(func.coalesce(func.sum(WCCTransaction.customer_price_applied), func.sum(WCCTransaction.debit_amount), 0))
                    .filter(
                        WCCTransaction.workspace_id == workspace_id,
                        WCCTransaction.status == "success",
                        WCCTransaction.created_at >= latest_recharge.created_at
                    )
                    .scalar() or Decimal("0.00")
                )
                debits_since = Decimal(str(debits_since))
                computed_snapshot = current_balance + debits_since
              
                reference_full_amount = max(computed_snapshot, current_balance, recharge_amt)

            # Ensure reference_full_amount is at least current_balance so bar never overflows past 100%
            reference_full_amount = max(reference_full_amount, current_balance)
        elif latest_recharge_tx:
            recharge_amt = Decimal(str(latest_recharge_tx.customer_price_applied or latest_recharge_tx.debit_amount or "0.00"))
            last_recharge_amount = recharge_amt
            last_recharge_at = latest_recharge_tx.created_at
            reference_full_amount = max(current_balance, recharge_amt)
        else:
            # Edge Case 3: First-time user / no recharge history yet (e.g. trial credit / onboarding promo)
            if current_balance > 0:
                reference_full_amount = current_balance
            else:
                reference_full_amount = Decimal("0.00")

        # Edge Case 4: Guard against division by zero
        if reference_full_amount > 0 and current_balance > 0:
            pct = (current_balance / reference_full_amount) * Decimal("100.0")
            fill_percentage = min(100.0, max(0.0, float(round(pct, 1))))
        elif current_balance <= 0:
            fill_percentage = 0.0
        else:
            fill_percentage = 0.0

        overage_balance = Decimal(str(wallet.overage_balance or "0.00"))

        # Fetch workspace overage policy
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        overage_enabled = getattr(workspace, "overage_enabled", False) if workspace else False

        # Canonical status calculation
        if current_balance <= Decimal("0.00"):
            status_label = "Empty"
        elif fill_percentage <= 25.0:
            status_label = "Low"
        elif fill_percentage < 90.0:
            status_label = "Healthy"
        else:
            status_label = "Full"

        ent = cls.check_wcc_entitlement(db, workspace_id)

        return {
            "balance": current_balance,
            "current_balance": current_balance,
            "currency": wallet.currency or "INR",
            "reference_full_amount": reference_full_amount,
            "fill_percentage": fill_percentage,
            "last_recharge_amount": last_recharge_amount,
            "last_recharge_at": last_recharge_at,
            "overage_balance": overage_balance,
            "overage_enabled": overage_enabled,
            "status": status_label,
            "wcc_locked": ent["wcc_locked"],
            "spending_allowed": ent["spending_allowed"],
            "subscription_state": ent["subscription_state"],
            "status_message": ent["status_message"],
        }

    @classmethod
    def get_rates(cls, db: Session) -> List[WCCRateCard]:
        """
        Query active WCC rate cards.
        """
        return db.query(WCCRateCard).filter(WCCRateCard.is_active == True).all()

    @classmethod
    def get_active_rate(cls, db: Session, category: str, region: str = "IN") -> WCCRateCard:
      
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        rate_cards = db.query(WCCRateCard).filter(
            WCCRateCard.category == category,
            WCCRateCard.region == region,
            WCCRateCard.is_active == True,
            WCCRateCard.effective_from <= now,
            (WCCRateCard.effective_to == None) | (WCCRateCard.effective_to > now)
        ).all()

        if not rate_cards:
            raise ValueError(f"No active WCC rate card found for category '{category}' in region '{region}' at this time.")

        if len(rate_cards) > 1:
            logger.error(f"Inconsistent pricing setup: Multiple overlapping active rate cards found for '{category}' in region '{region}'.")
            raise ValueError(f"Pricing configuration error: Overlapping rate cards found for category '{category}'.")

        return rate_cards[0]

    @classmethod
    def calculate_estimate(
        cls,
        db: Session,
        workspace_id: uuid.UUID | str,
        audience_size: int,
        category: str
    ) -> Dict[str, Any]:
        """
        Calculate estimated campaign cost based on active WCC rate card.
        """
        workspace_id = normalize_workspace_id(workspace_id)
        rate_card = cls.get_active_rate(db, category, "IN")

        customer_rate = rate_card.customer_price
        meta_rate = rate_card.meta_cost
        
        estimated_cost = Decimal(audience_size) * customer_rate
        estimated_meta_cost = Decimal(audience_size) * meta_rate

        wallet = cls.get_balance(db, workspace_id)
        balance_sufficient = wallet.balance >= estimated_cost

        return {
            "estimated_cost": estimated_cost,
            "estimated_meta_cost": estimated_meta_cost,
            "balance_sufficient": balance_sufficient,
            "rate_applied": customer_rate
        }

    @classmethod
    def check_preflight_balance(
        cls,
        db: Session,
        workspace_id: uuid.UUID | str,
        required_amount: Decimal,
        overage_enabled: bool = False
    ) -> dict:
        
        workspace_id = normalize_workspace_id(workspace_id)

        # 1. Resolve WCC subscription entitlement FIRST
        entitlement = cls.check_wcc_entitlement(db, workspace_id)
        if not entitlement["spending_allowed"]:
            wallet = cls.get_balance(db, workspace_id)
            raise InsufficientWCCBalanceError(
                required=required_amount,
                available=Decimal("0.00"),
                shortfall=required_amount
            )

        wallet = cls.get_balance(db, workspace_id)
        shortfall = required_amount - wallet.balance

        if shortfall > Decimal("0.00"):
            if overage_enabled:
                logger.info(
                    f"WCC preflight: overage allowed for workspace {workspace_id}. "
                    f"Balance \u20b9{wallet.balance}, required \u20b9{required_amount}, "
                    f"shortfall \u20b9{shortfall}"
                )
                return {"allowed": True, "overage": shortfall}
            else:
                raise InsufficientWCCBalanceError(
                    required=required_amount,
                    available=wallet.balance,
                    shortfall=shortfall
                )

        return {"allowed": True, "overage": Decimal("0.00")}

    @classmethod
    def initiate_recharge(
        cls,
        db: Session,
        workspace_id: uuid.UUID | str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """
        Create a recharge log and call Razorpay client to generate an order.
        """
        workspace_id = normalize_workspace_id(workspace_id)
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")

        # Entitlement Guard: Check if WCC recharge is allowed for plan
        from app.services.billing.entitlement_service import EntitlementService
        ent_check = EntitlementService.check_entitlement(db, workspace_id, "can_recharge_wcc")
        if not ent_check.get("allowed", True):
            raise ValueError(ent_check.get("message", "WCC recharge is disabled for your plan."))

        # Calculate GST on backend
        from app.services.billing.gst_service import GSTService
        gst_calcs = GSTService.calculate_gst(
            amount=amount,
            customer_state=workspace.billing_state,
            customer_country=workspace.billing_country or "IN",
            product_type="wcc_recharge",
            db=db
        )

        recharge_log = WCCRechargeLog(
            workspace_id=workspace_id,
            amount=amount,
            currency="INR",
            status="pending",
            # Save GST details
            subtotal=gst_calcs["subtotal"],
            gst_rate=gst_calcs["gst_rate"],
            gst_amount=gst_calcs["gst_amount"],
            cgst=gst_calcs["cgst"],
            sgst=gst_calcs["sgst"],
            igst=gst_calcs["igst"],
            taxable_amount=gst_calcs["taxable_amount"],
            total_amount=gst_calcs["total_amount"],
            place_of_supply=gst_calcs["place_of_supply"],
            customer_state=gst_calcs["customer_state"],
            customer_country=gst_calcs["customer_country"],
            customer_gstin=workspace.billing_gstin
        )
        db.add(recharge_log)
        db.flush()  # Flush instead of commit to avoid transaction ownership

        try:
            # Get Razorpay gateway
            gateway = get_gateway("razorpay")
            # Razorpay expects amount in paise (integer) - total_amount includes GST
            amount_paise = to_paise(gst_calcs["total_amount"])

            order_payload = {
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "workspace_id": str(workspace_id),
                    "recharge_log_id": str(recharge_log.id),
                    "type": "wcc_recharge"
                }
            }

            # Create Razorpay order
            order_data = gateway.client.order.create(order_payload)

            recharge_log.gateway_order_id = order_data["id"]
            db.flush()

            return {
                "gateway_order_id": order_data["id"],
                "amount": amount_paise,
                "currency": "INR",
                "public_key": gateway.get_public_key(),
                "recharge_log_id": str(recharge_log.id)
            }
        except Exception as e:
            logger.error(f"Error initiating WCC recharge: {str(e)}")
            recharge_log.status = "failed"
            db.flush()
            raise e

    @classmethod
    def process_recharge_webhook(
        cls,
        db: Session,
        body: bytes,
        signature: str
    ) -> Dict[str, Any]:
        """
        Verify Razorpay webhook signature, locate the pending recharge log,
        and atomically credit the wallet balance.
        """
        gateway = get_gateway("razorpay")
        webhook_event = gateway.handle_webhook(body, signature)

        if webhook_event.event_type not in ("payment.captured", "payment.failed"):
            return {"status": "ignored", "event_type": webhook_event.event_type}

        payment_data = webhook_event.entity.get("payment", {})
        gateway_order_id = payment_data.get("order_id")
        gateway_payment_id = payment_data.get("id")
        amount_paise = payment_data.get("amount")

        if not gateway_order_id or not gateway_payment_id:
            raise ValueError("Invalid payment payload from Razorpay webhook")

        # Find the recharge log
        recharge_log = db.query(WCCRechargeLog).filter(
            WCCRechargeLog.gateway_order_id == gateway_order_id
        ).with_for_update().first()

        if not recharge_log:
            raise ValueError(f"Recharge log not found for order {gateway_order_id}")

        if webhook_event.event_type == "payment.failed":
            if recharge_log.status == "pending":
                raw_method = payment_data.get("method")
                recharge_log.payment_method = str(raw_method) if raw_method else "upi"
                recharge_log.gateway_payment_id = gateway_payment_id
                recharge_log.status = "failed"
                recharge_log.updated_at = func.now()
                db.flush()
            return {
                "status": "failed",
                "recharge_log_id": str(recharge_log.id),
                "gateway_payment_id": gateway_payment_id
            }

        if recharge_log.status == "success":
            return {
                "status": "duplicate",
                "recharge_log_id": str(recharge_log.id),
                "gateway_payment_id": gateway_payment_id
            }

        # Verify amount matches (convert to paise and verify with <= 2 paise tolerance)
        expected_amount_paise = to_paise(recharge_log.total_amount)
        received_amount_paise = int(amount_paise or 0)
        if not verify_paise_amount(received_amount_paise, expected_amount_paise, max_tolerance_paise=2):
            logger.warning(
                f"Amount mismatch for WCC recharge. Expected: {expected_amount_paise} paise, Received: {received_amount_paise} paise"
            )

        # Update recharge log
        raw_method = payment_data.get("method")
        recharge_log.payment_method = str(raw_method) if raw_method else "upi"
        recharge_log.gateway_payment_id = gateway_payment_id
        recharge_log.status = "success"
        recharge_log.updated_at = func.now()

        # Update wallet balance atomically
        wallet = db.query(WCCWallet).filter(
            WCCWallet.workspace_id == recharge_log.workspace_id
        ).with_for_update().first()

        if not wallet:
            wallet = WCCWallet(
                workspace_id=recharge_log.workspace_id,
                balance=Decimal("0.00"),
                currency="INR"
            )
            db.add(wallet)
            db.flush()

        wallet.purchased_balance = (wallet.purchased_balance or Decimal("0.00")) + recharge_log.taxable_amount
        wallet.balance = (wallet.included_balance or Decimal("0.00")) + wallet.purchased_balance
        wallet.updated_at = func.now()
        recharge_log.balance_after = wallet.balance

        db.flush()  # Flush instead of commit

        # Generate Tax Invoice for WCC Recharge
        try:
            from app.services.billing.invoice_service import InvoiceService
            gst_calcs = {
                "subtotal": recharge_log.subtotal,
                "gst_rate": recharge_log.gst_rate,
                "gst_amount": recharge_log.gst_amount,
                "cgst": recharge_log.cgst,
                "sgst": recharge_log.sgst,
                "igst": recharge_log.igst,
                "taxable_amount": recharge_log.taxable_amount,
                "total_amount": recharge_log.total_amount,
                "place_of_supply": recharge_log.place_of_supply,
                "customer_state": recharge_log.customer_state,
                "customer_country": recharge_log.customer_country
            }
            # Check if invoice already exists for this recharge
            from app.models.invoice import Invoice
            existing_invoice = db.query(Invoice).filter(Invoice.wcc_recharge_log_id == recharge_log.id).first()
            if not existing_invoice:
                InvoiceService.create_invoice(
                    db=db,
                    workspace_id=recharge_log.workspace_id,
                    amount=recharge_log.total_amount,
                    currency=recharge_log.currency,
                    gst_calculations=gst_calcs,
                    product_type="wcc_recharge",
                    wcc_recharge_log_id=recharge_log.id
                )
        except Exception as invoice_err:
            logger.error(f"Failed to generate Invoice for WCC recharge {recharge_log.id}: {invoice_err}")

        logger.info(
            f"Successfully credited {recharge_log.taxable_amount} INR (taxable) to workspace {recharge_log.workspace_id} "
            f"via Razorpay payment {gateway_payment_id}"
        )

        return {
            "status": "success",
            "recharge_log_id": str(recharge_log.id),
            "amount_credited": float(recharge_log.taxable_amount),
            "new_balance": float(wallet.balance)
        }

    @classmethod
    def verify_recharge(
        cls,
        db: Session,
        workspace_id: uuid.UUID | str,
        order_id: str,
        payment_id: str,
        signature: str
    ) -> Dict[str, Any]:
        """
        Verify Razorpay signature for a WCC recharge, credit the wallet, and update logs.
        """
        workspace_id = normalize_workspace_id(workspace_id)
        # 1. Verify Razorpay Signature
        gateway = get_gateway("razorpay")
        gateway.verify_payment({
            "order_id": order_id,
            "payment_id": payment_id,
            "signature": signature
        })

        # 2. Query Razorpay to get the actual payment entity to ensure it is captured
        payment_data = gateway.fetch_payment(payment_id)
        if payment_data.status != "captured":
            raise ValueError(f"Payment status is '{payment_data.status}', not captured.")

        # 3. Locate recharge log (locking the row for update)
        recharge_log = db.query(WCCRechargeLog).filter(
            WCCRechargeLog.gateway_order_id == order_id
        ).with_for_update().first()

        if not recharge_log:
            raise ValueError(f"Recharge log not found for order {order_id}")

        # Check tenant isolation
        if recharge_log.workspace_id != workspace_id:
            raise ValueError("Workspace context mismatch for recharge log")
        if recharge_log.status == "success":
            # Idempotent response
            wallet = cls.get_balance(db, workspace_id)
            return {
                "status": "success",
                "message": "Recharge already successfully verified",
                "recharge_log_id": str(recharge_log.id),
                "amount_credited": float(recharge_log.taxable_amount),
                "new_balance": float(wallet.balance)
            }

        # Verify amount matches (convert paise to Decimal)
        expected_amount = recharge_log.total_amount
        received_amount = Decimal(payment_data.amount) / Decimal("100.00")
        if abs(expected_amount - received_amount) > Decimal("0.01"):
            raise ValueError(f"Payment amount mismatch: got {received_amount}, expected {expected_amount}")

        # Update status & payment method
        raw_method = getattr(payment_data, 'method', None) or (payment_data.get('method') if isinstance(payment_data, dict) else None)
        recharge_log.gateway_payment_id = payment_id
        recharge_log.payment_method = str(raw_method) if raw_method else "upi"
        recharge_log.status = "success"
        recharge_log.updated_at = func.now()

        # Update wallet balance
        wallet = db.query(WCCWallet).filter(
            WCCWallet.workspace_id == workspace_id
        ).with_for_update().first()

        if not wallet:
            wallet = WCCWallet(
                workspace_id=workspace_id,
                balance=Decimal("0.00"),
                currency="INR"
            )
            db.add(wallet)
            db.flush()

        recharge_amount = recharge_log.taxable_amount
        outstanding_overage = wallet.overage_balance or Decimal("0.00")

        # Settle any outstanding overage debt first, then credit remainder to wallet
        if outstanding_overage > Decimal("0.00"):
            settled = min(outstanding_overage, recharge_amount)
            recharge_amount = recharge_amount - settled
            wallet.overage_balance = outstanding_overage - settled
            logger.info(
                f"WCC recharge: settled \u20b9{settled} outstanding overage for workspace {workspace_id}. "
                f"Remaining overage: \u20b9{wallet.overage_balance}"
            )

        wallet.purchased_balance = (wallet.purchased_balance or Decimal("0.00")) + recharge_amount
        wallet.balance = (wallet.included_balance or Decimal("0.00")) + wallet.purchased_balance
        wallet.updated_at = func.now()
        recharge_log.balance_after = wallet.balance

        db.flush()

        # Generate Tax Invoice for WCC Recharge
        try:
            from app.services.billing.invoice_service import InvoiceService
            gst_calcs = {
                "subtotal": recharge_log.subtotal,
                "gst_rate": recharge_log.gst_rate,
                "gst_amount": recharge_log.gst_amount,
                "cgst": recharge_log.cgst,
                "sgst": recharge_log.sgst,
                "igst": recharge_log.igst,
                "taxable_amount": recharge_log.taxable_amount,
                "total_amount": recharge_log.total_amount,
                "place_of_supply": recharge_log.place_of_supply,
                "customer_state": recharge_log.customer_state,
                "customer_country": recharge_log.customer_country
            }
            # Check if invoice already exists for this recharge
            from app.models.invoice import Invoice
            existing_invoice = db.query(Invoice).filter(Invoice.wcc_recharge_log_id == recharge_log.id).first()
            if not existing_invoice:
                InvoiceService.create_invoice(
                    db=db,
                    workspace_id=recharge_log.workspace_id,
                    amount=recharge_log.total_amount,
                    currency=recharge_log.currency,
                    gst_calculations=gst_calcs,
                    product_type="wcc_recharge",
                    wcc_recharge_log_id=recharge_log.id
                )
        except Exception as invoice_err:
            logger.error(f"Failed to generate Invoice for WCC recharge {recharge_log.id}: {invoice_err}")

        logger.info(
            f"Successfully verified WCC recharge of {recharge_log.taxable_amount} INR (taxable) for workspace {workspace_id} "
            f"via Razorpay payment {payment_id}"
        )

        return {
            "status": "success",
            "message": "Recharge successfully verified",
            "recharge_log_id": str(recharge_log.id),
            "amount_credited": float(recharge_log.taxable_amount),
            "new_balance": float(wallet.balance)
        }

    @classmethod
    def record_transaction(
        cls,
        db: Session,
        workspace_id: uuid.UUID | str,
        meta_session_id: str,
        category: str,
        meta_cost: Optional[Decimal],
        customer_price: Decimal,
        raw_payload: dict,
        rate_applied: Optional[Decimal] = None
    ) -> WCCTransaction:
        """
        Atomically debit the wallet for a WhatsApp conversation.
        Guarantees idempotency via unique constraints on (workspace_id, meta_session_id).
        """
        workspace_id = normalize_workspace_id(workspace_id)
        with cls._debit_lock:
            # Check idempotency first: if transaction was already inserted, return it immediately
            existing = db.query(WCCTransaction).filter(
                WCCTransaction.workspace_id == workspace_id,
                WCCTransaction.meta_session_id == meta_session_id
            ).first()
            if existing:
                return existing

            # 1. First ensure the wallet exists (or create one with 0 balance)
            wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).first()
            if not wallet:
                wallet = WCCWallet(
                    workspace_id=workspace_id,
                    balance=Decimal("0.00"),
                    currency="INR"
                )
                db.add(wallet)
                db.flush()

            # Fallback logic for backward compatibility
            if customer_price is None and rate_applied is not None:
                customer_price = rate_applied
            if meta_cost is None:
                meta_cost = Decimal("0.00")

            transaction = WCCTransaction(
                workspace_id=workspace_id,
                meta_session_id=meta_session_id,
                category=category,
                status="success" if customer_price > Decimal("0.00") else "free_session",
                message_count=1,
                debit_amount=customer_price,  # Deprecated
                rate_applied=customer_price,  # Deprecated
                meta_cost_applied=meta_cost,
                customer_price_applied=customer_price,
                pricing_version=2,
                transaction_type="debit",
                raw_payload=raw_payload
            )
            db.add(transaction)
            db.flush()

         
            if customer_price > Decimal("0.00"):
                # Entitlement check guard: Reject debit if subscription is Free/Expired and spending is locked
                entitlement = cls.check_wcc_entitlement(db, workspace_id)
                if not entitlement["spending_allowed"]:
                    raise InsufficientWCCBalanceError(
                        required=customer_price,
                        available=Decimal("0.00"),
                        shortfall=customer_price
                    )

                w = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).with_for_update().first()
                if w:
                    inc_bal = w.included_balance or Decimal("0.00")
                    pur_bal = w.purchased_balance or Decimal("0.00")

                    # Draw from included first
                    drawn_inc = min(customer_price, inc_bal)
                    rem = customer_price - drawn_inc

                    # Then from purchased
                    drawn_pur = min(rem, pur_bal)
                    rem = rem - drawn_pur

                    # Remaining is overage (debt)
                    if rem > Decimal("0.00"):
                        # Look up workspace overage policy
                        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
                        overage_enabled = getattr(ws, "overage_enabled", False) if ws else False
                        if overage_enabled:
                            # Track explicit debt — balance stays at 0, never negative
                            w.overage_balance = (w.overage_balance or Decimal("0.00")) + rem
                            logger.warning(
                                f"WCC overage: workspace {workspace_id} incurred ₹{rem} debt. "
                                f"Total outstanding: ₹{w.overage_balance}"
                            )
                        else:
                            # Final protection: preflight was bypassed or balance changed concurrently
                            raise InsufficientWCCBalanceError(
                                required=customer_price,
                                available=inc_bal + pur_bal,
                                shortfall=rem
                            )

                    w.included_balance = inc_bal - drawn_inc
                    w.purchased_balance = pur_bal - drawn_pur
                    w.balance = w.included_balance + w.purchased_balance  # Never negative
                    w.updated_at = func.now()
                    db.flush()

            return transaction

    # Alias for backward compatibility with test suites
    debit_conversation_charge = record_transaction
