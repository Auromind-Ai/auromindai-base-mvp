import uuid
from typing import Any
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.enums import PaymentStatus, SubscriptionStatus
from app.models.billing import Payment
from app.models.subscription import Subscription
from app.models.workspace import Workspace
from app.services.billing.gst_service import GSTService
from app.services.billing.invoice_service import InvoiceService


class PaymentService:
    def _record_successful_payment(
        self,
        db: Session,
        provider: str,
        payment_payload: dict[str, Any],
        plan_config: Any,
        workspace_id: str | None = None,
        subscription: Subscription | None = None,
        payment_type: str = "subscription",
        description: str | None = None,
    ) -> Payment:
        if not workspace_id and subscription:
            workspace_id = str(subscription.workspace_id)
        if not workspace_id:
            raise ValueError("workspace_id or subscription must be provided to record payment")

        provider_payment_id = payment_payload.get("id")
        if not provider_payment_id:
            raise ValueError("Successful payment payload missing provider payment id")

        payment = (
            db.query(Payment)
            .filter(
                Payment.provider == provider,
                Payment.provider_payment_id == provider_payment_id,
            )
            .with_for_update()
            .first()
        )
        currency = (payment_payload.get("currency") or (plan_config.currency if plan_config else "INR") or "INR").upper()
        raw_method = payment_payload.get("method")

        ws_uuid = uuid.UUID(workspace_id) if isinstance(workspace_id, str) else workspace_id
        sub_id = subscription.id if subscription else None
        prov_order_id = payment_payload.get("subscription_id") or (subscription.provider_subscription_id if subscription else None)
        b_start = subscription.current_period_start if subscription else None
        b_end = subscription.current_period_end if subscription else None

        # Fetch workspace to get customer GST billing details
        workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not workspace:
            raise ValueError(f"Workspace {workspace_id} not found")

        # Perform GST calculation using plan base price (tax-exclusive) or paid total (tax-inclusive)
        if plan_config and getattr(plan_config, "amount", None) is not None:
            base_amount = Decimal(str(plan_config.amount))
            gst_calcs = GSTService.calculate_gst(
                amount=base_amount,
                customer_state=workspace.billing_state,
                customer_country=workspace.billing_country or "IN",
                product_type=payment_type,
                db=db,
                tax_inclusive=False
            )
        else:
            paid_total = Decimal(str(payment_payload.get("amount") or 0)) / Decimal("100.00")
            gst_calcs = GSTService.calculate_gst(
                amount=paid_total,
                customer_state=workspace.billing_state,
                customer_country=workspace.billing_country or "IN",
                product_type=payment_type,
                db=db,
                tax_inclusive=True
            )

        amount_major = int(gst_calcs["taxable_amount"])

        if payment is None:
            payment = Payment(
                id=uuid.uuid4(),
                workspace_id=ws_uuid,
                subscription_id=sub_id,
                amount=amount_major,
                currency=currency,
                provider=provider,
                payment_method=str(raw_method) if raw_method else None,
                payment_type=payment_type,
                description=description or ("Pro Plan Subscription" if payment_type == "subscription" else "AI Credit Pack Purchase"),
                status=PaymentStatus.paid,
                provider_payment_id=provider_payment_id,
                provider_order_id=prov_order_id,
                billing_start=b_start,
                billing_end=b_end,
                idempotency_key=f"{provider}:payment:{provider_payment_id}",
                # Save GST columns
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
                customer_gstin=workspace.billing_gstin,
            )
            db.add(payment)
        else:
            payment.workspace_id = ws_uuid
            payment.subscription_id = sub_id
            payment.amount = amount_major
            payment.currency = currency
            payment.payment_type = payment_type
            payment.description = description or payment.description
            if raw_method:
                payment.payment_method = str(raw_method)
            payment.status = PaymentStatus.paid
            payment.provider_order_id = prov_order_id
            payment.billing_start = b_start
            payment.billing_end = b_end
            # Save GST columns
            payment.subtotal = gst_calcs["subtotal"]
            payment.gst_rate = gst_calcs["gst_rate"]
            payment.gst_amount = gst_calcs["gst_amount"]
            payment.cgst = gst_calcs["cgst"]
            payment.sgst = gst_calcs["sgst"]
            payment.igst = gst_calcs["igst"]
            payment.taxable_amount = gst_calcs["taxable_amount"]
            payment.total_amount = gst_calcs["total_amount"]
            payment.place_of_supply = gst_calcs["place_of_supply"]
            payment.customer_state = gst_calcs["customer_state"]
            payment.customer_country = gst_calcs["customer_country"]
            payment.customer_gstin = workspace.billing_gstin

        if subscription:
            subscription.status = SubscriptionStatus.active
        db.flush()

        # Generate GST Tax Invoice for this payment
        try:
            # Check if invoice already exists for this payment (idempotency check)
            from app.models.invoice import Invoice
            existing_invoice = db.query(Invoice).filter(Invoice.payment_id == payment.id).first()
            if not existing_invoice:
                InvoiceService.create_invoice(
                    db=db,
                    workspace_id=ws_uuid,
                    amount=gst_calcs["total_amount"],
                    currency=currency,
                    gst_calculations=gst_calcs,
                    product_type=payment_type,
                    payment_id=payment.id,
                    subscription_id=sub_id
                )
        except Exception as invoice_err:
            import logging
            logging.getLogger("auromind").error(f"Failed to generate Invoice for payment {payment.id}: {invoice_err}")

        return payment

    def _get_payment_by_payment_id(
        self,
        db: Session,
        provider: str,
        payment_id: str | None,
    ) -> Payment | None:
        if not payment_id:
            return None
        return (
            db.query(Payment)
            .filter(
                Payment.provider == provider,
                Payment.provider_payment_id == payment_id,
            )
            .first()
        )