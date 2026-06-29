import uuid
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy import update, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.wcc import WCCWallet, WCCRateCard, WCCTransaction, WCCRechargeLog
from app.services.billing.gateway import get_gateway
from app.services.billing import normalize_workspace_id
from app.core.logger import logger


class WCCService:
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
        return wallet

    @classmethod
    def get_rates(cls, db: Session) -> List[WCCRateCard]:
        """
        Query active WCC rate cards.
        """
        return db.query(WCCRateCard).filter(WCCRateCard.is_active == True).all()

    @classmethod
    def get_active_rate(cls, db: Session, category: str, region: str = "IN") -> WCCRateCard:
        """
        Lookup the single active rate card matching category, region, and current time.
        Raises ValueError if none are found or if overlapping ranges exist.
        """
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
        required_amount: Decimal
    ) -> None:
        """
        Verify that the wallet balance is sufficient for the given required amount.
        If insufficient, raise a ValueError.
        """
        workspace_id = normalize_workspace_id(workspace_id)
        wallet = cls.get_balance(db, workspace_id)
        if wallet.balance < required_amount:
            raise ValueError(
                f"Insufficient WCC balance. Required: INR {required_amount}, Available: INR {wallet.balance}"
            )

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
        recharge_log = WCCRechargeLog(
            workspace_id=workspace_id,
            amount=amount,
            currency="INR",
            status="pending"
        )
        db.add(recharge_log)
        db.flush()  # Flush instead of commit to avoid transaction ownership

        try:
            # Get Razorpay gateway
            gateway = get_gateway("razorpay")
            # Razorpay expects amount in paise (integer)
            amount_paise = int(amount * Decimal("100.00"))

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

        if webhook_event.event_type != "payment.captured":
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

        if recharge_log.status == "success":
            return {
                "status": "duplicate",
                "recharge_log_id": str(recharge_log.id),
                "gateway_payment_id": gateway_payment_id
            }

        # Verify amount matches (convert paise to Decimal)
        expected_amount = recharge_log.amount
        received_amount = Decimal(amount_paise) / Decimal("100.00")
        if abs(expected_amount - received_amount) > Decimal("0.01"):
            logger.warning(
                f"Amount mismatch for WCC recharge. Expected: {expected_amount}, Received: {received_amount}"
            )

        # Update recharge log
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

        wallet.balance += received_amount
        wallet.updated_at = func.now()

        db.flush()  # Flush instead of commit

        logger.info(
            f"Successfully credited {received_amount} INR to workspace {recharge_log.workspace_id} "
            f"via Razorpay payment {gateway_payment_id}"
        )

        return {
            "status": "success",
            "recharge_log_id": str(recharge_log.id),
            "amount_credited": float(received_amount),
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
                "amount_credited": float(recharge_log.amount),
                "new_balance": float(wallet.balance)
            }

        # Update status
        recharge_log.gateway_payment_id = payment_id
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

        wallet.balance += recharge_log.amount
        wallet.updated_at = func.now()

        db.flush()

        logger.info(
            f"Successfully verified WCC recharge of {recharge_log.amount} INR for workspace {workspace_id} "
            f"via Razorpay payment {payment_id}"
        )

        return {
            "status": "success",
            "message": "Recharge successfully verified",
            "recharge_log_id": str(recharge_log.id),
            "amount_credited": float(recharge_log.amount),
            "new_balance": float(wallet.balance)
        }

    @classmethod
    def debit_conversation_charge(
        cls,
        db: Session,
        workspace_id: uuid.UUID | str,
        meta_session_id: str,
        category: str,
        meta_cost: Decimal,
        customer_price: Decimal,
        raw_payload: dict,
        rate_applied: Optional[Decimal] = None
    ) -> WCCTransaction:
        """
        Atomically debit the wallet for a WhatsApp conversation.
        Guarantees idempotency via unique constraints on (workspace_id, meta_session_id).
        """
        workspace_id = normalize_workspace_id(workspace_id)
        # 1. First ensure the wallet exists (or create one with 0 balance using savepoint)
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).first()
        if not wallet:
            nested_wallet = db.begin_nested()
            try:
                wallet = WCCWallet(
                    workspace_id=workspace_id,
                    balance=Decimal("0.00"),
                    currency="INR"
                )
                db.add(wallet)
                db.flush()
                nested_wallet.commit()
            except IntegrityError:
                nested_wallet.rollback()

        # Fallback logic for backward compatibility
        if customer_price is None and rate_applied is not None:
            customer_price = rate_applied
        if meta_cost is None:
            meta_cost = Decimal("0.00")

        # 2. Use a savepoint to isolate transaction insert & debit logic
        nested_tx = db.begin_nested()
        try:
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
                raw_payload=raw_payload
            )
            db.add(transaction)
            db.flush()  # Throws IntegrityError if unique constraint is violated

            # 3. Perform atomic wallet debit
            # We allow the balance to go negative for Meta webhook debits to handle race conditions safely,
            # ensuring all sent conversations are eventually billed, while future checks will immediately fail.
            if customer_price > Decimal("0.00"):
                stmt = (
                    update(WCCWallet)
                    .where(WCCWallet.workspace_id == workspace_id)
                    .values(balance=WCCWallet.balance - customer_price, updated_at=func.now())
                )
                db.execute(stmt)

            nested_tx.commit()
            return transaction

        except IntegrityError:
            nested_tx.rollback()
            # If the transaction was already inserted, fetch and return it for idempotency (successful no-op).
            existing = db.query(WCCTransaction).filter(
                WCCTransaction.workspace_id == workspace_id,
                WCCTransaction.meta_session_id == meta_session_id
            ).first()
            if existing:
                return existing
            raise
        except Exception as e:
            nested_tx.rollback()
            raise e
