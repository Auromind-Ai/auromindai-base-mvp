import uuid
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.flow_pack import FlowPack, FlowPackPurchase, PurchaseStatus
from app.models.workspace import Workspace, WorkspaceMember
from app.services.billing.gateway import get_gateway
from app.utils.money import to_paise, verify_paise_amount
from app.services.billing.entitlement_service import EntitlementService

class FlowPackService:
    def list_options(self, db: Session) -> List[FlowPack]:
        return (
            db.query(FlowPack)
            .filter(FlowPack.is_active == True)
            .order_by(FlowPack.display_order.asc())
            .all()
        )

    def _get_workspace_for_user(self, db: Session, workspace_id: str | uuid.UUID, user_id: str | uuid.UUID) -> Workspace:
        if isinstance(workspace_id, str):
            workspace_id = uuid.UUID(workspace_id)
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)

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


        check = EntitlementService.check_entitlement(db, workspace.id, "can_purchase_flow_addon")
        if not check["allowed"]:
            raise ValueError(check.get("reason") or "Flow pack add-on purchase is not available for your current plan. Please upgrade to Pro.")

        gateway = get_gateway(provider)

        # Calculate GST on backend
        from app.services.billing.gst_service import GSTService
        from decimal import Decimal
        gst_calcs = GSTService.calculate_gst(
            amount=Decimal(str(pack.price)),
            customer_state=workspace.billing_state,
            customer_country=workspace.billing_country or "IN",
            product_type="flow_packs",
            db=db
        )

   
        amount_paise = to_paise(gst_calcs["total_amount"])

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
            status=PurchaseStatus.INITIATED.value,
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
            expected_amount_paise = to_paise(purchase.total_amount)
            if not verify_paise_amount(fetched_payment.amount, expected_amount_paise, max_tolerance_paise=2):
                raise ValueError(
                    f"Payment amount mismatch. Expected {expected_amount_paise} paise, got {fetched_payment.amount} paise (includes GST)."
                )

            # Verify purchase status is still initiated
            if purchase.status != PurchaseStatus.INITIATED.value:
                raise ValueError("Purchase is not in initiated status")

            # Update purchase status to success and save gateway payment details
            purchase.status = PurchaseStatus.SUCCESS.value
            purchase.gateway_payment_id = payment_id
            purchase.gateway_signature = signature
            purchase.verified_at = func.now()
            db.flush()

            # Generate Tax Invoice for Flow Pack purchase
            try:
                from app.services.billing.invoice_service import InvoiceService
                gst_calcs = {
                    "subtotal": purchase.subtotal,
                    "gst_rate": purchase.gst_rate,
                    "gst_amount": purchase.gst_amount,
                    "cgst": purchase.cgst,
                    "sgst": purchase.sgst,
                    "igst": purchase.igst,
                    "taxable_amount": purchase.taxable_amount,
                    "total_amount": purchase.total_amount,
                    "place_of_supply": purchase.place_of_supply,
                    "customer_state": purchase.customer_state,
                    "customer_country": purchase.customer_country
                }
                InvoiceService.create_invoice(
                    db=db,
                    workspace_id=purchase.workspace_id,
                    amount=purchase.total_amount,
                    currency=purchase.currency,
                    gst_calculations=gst_calcs,
                    product_type="flow_packs",
                    flow_pack_purchase_id=purchase.id
                )
            except Exception as invoice_err:
                import logging
                logging.getLogger("auromind").error(f"Failed to generate Invoice for flow pack purchase {purchase.id}: {invoice_err}")

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
