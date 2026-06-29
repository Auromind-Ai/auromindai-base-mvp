import uuid
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.flow_pack import FlowPack, FlowPackPurchase, PurchaseStatus
from app.models.workspace import Workspace, WorkspaceMember
from app.services.billing.gateway import get_gateway

class FlowPackService:
    def list_options(self, db: Session) -> List[FlowPack]:
        return (
            db.query(FlowPack)
            .filter(FlowPack.is_active == True)
            .order_by(FlowPack.display_order.asc())
            .all()
        )

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

    def initiate_purchase(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
        pack_id: str,
        provider: str = "razorpay",
    ) -> Dict[str, Any]:
        # Look up pack from database catalog
        pack = (
            db.query(FlowPack)
            .filter(FlowPack.pack_id == pack_id, FlowPack.is_active == True)
            .first()
        )
        if not pack:
            raise ValueError(f"Flow pack not found or inactive: {pack_id}")

        workspace = self._get_workspace_for_user(db, workspace_id, user_id)
        gateway = get_gateway(provider)

        # Razorpay expects amount in paise (integer)
        amount_paise = int(pack.price * 100)

        order_payload = {
            "amount": amount_paise,
            "currency": pack.currency,
            "payment_capture": 1,
            "notes": {
                "workspace_id": str(workspace.id),
                "user_id": str(user_id),
                "pack_id": pack_id,
                "type": "flow_pack_purchase"
            }
        }

        # Create Razorpay order
        order_data = gateway.client.order.create(order_payload)

        # Record initiated payment transaction in DB
        purchase = FlowPackPurchase(
            workspace_id=uuid.UUID(workspace_id),
            user_id=uuid.UUID(user_id) if user_id else None,
            flow_pack_id=pack.id,
            flows_count=pack.flows_count,
            amount_paid=pack.price,
            currency=pack.currency,
            provider=provider,
            gateway_order_id=order_data["id"],
            status=PurchaseStatus.INITIATED.value
        )
        db.add(purchase)
        db.commit()

        return {
            "provider": gateway.provider,
            "gateway_order_id": order_data["id"],
            "pack_id": pack_id,
            "amount": amount_paise,
            "currency": pack.currency,
            "public_key": gateway.get_public_key(),
        }

    def verify_purchase(
        self,
        db: Session,
        workspace_id: str,
        user_id: str,
        order_id: str,
        payment_id: str,
        signature: str,
        provider: str = "razorpay",
    ) -> Dict[str, Any]:
        # Verify user has access to workspace
        self._get_workspace_for_user(db, workspace_id, user_id)

        # Idempotency check 1: already processed payment
        existing = (
            db.query(FlowPackPurchase)
            .filter(
                FlowPackPurchase.gateway_payment_id == payment_id,
                FlowPackPurchase.status == PurchaseStatus.SUCCESS.value
            )
            .first()
        )
        if existing:
            return {
                "status": "success",
                "message": "Payment verified, flows already granted",
                "payment_id": payment_id,
            }

        # Find the initiated FlowPackPurchase record
        purchase = (
            db.query(FlowPackPurchase)
            .filter(
                FlowPackPurchase.gateway_order_id == order_id,
                FlowPackPurchase.workspace_id == uuid.UUID(workspace_id)
            )
            .first()
        )

        if not purchase:
            raise ValueError("Purchase record not found for this order ID")

        # Idempotency check 2: already marked success
        if purchase.status == PurchaseStatus.SUCCESS.value:
            return {
                "status": "success",
                "message": "Payment already verified",
                "payment_id": purchase.gateway_payment_id,
            }

        # Check if already marked failed
        if purchase.status == PurchaseStatus.FAILED.value:
            raise ValueError(f"Purchase has already failed: {purchase.failure_reason}")

        try:
            gateway = get_gateway(provider)

            # Verify signature
            payload = {
                "order_id": order_id,
                "payment_id": payment_id,
                "signature": signature,
            }
            gateway.verify_payment(payload)

            # Fetch payment details to verify metadata and status
            fetched_payment = gateway.fetch_payment(payment_id)
            if fetched_payment.status != "captured":
                raise ValueError(f"Payment not captured. Status: {fetched_payment.status}")

            # Verify amount matches (Razorpay amount is in paise)
            expected_amount_paise = int(purchase.amount_paid * 100)
            if int(fetched_payment.amount) != expected_amount_paise:
                raise ValueError(
                    f"Payment amount mismatch. Expected {expected_amount_paise} paise, got {fetched_payment.amount} paise."
                )

            # Verify purchase status is still initiated
            if purchase.status != PurchaseStatus.INITIATED.value:
                raise ValueError("Purchase is not in initiated status")

            # Update purchase status to success and save gateway payment details
            purchase.status = PurchaseStatus.SUCCESS.value
            purchase.gateway_payment_id = payment_id
            purchase.gateway_signature = signature
            purchase.verified_at = func.now()
            db.commit()

            return {
                "status": "success",
                "message": f"Successfully purchased {purchase.flows_count} flows",
                "payment_id": payment_id,
            }
        except Exception as e:
            # Mark purchase as failed in DB
            purchase.status = PurchaseStatus.FAILED.value
            purchase.failure_reason = str(e)
            db.commit()
            raise ValueError(f"Payment verification failed: {str(e)}")
