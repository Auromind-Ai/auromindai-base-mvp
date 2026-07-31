import pytest
import uuid
from decimal import Decimal
from sqlalchemy.orm import Session
from app.services.billing.gst_service import GSTService
from app.services.billing.invoice_service import InvoiceService
from app.models.workspace import Workspace
from app.models.invoice import Invoice
from app.models.invoice_sequence import InvoiceSequence
from app.core.enums import InvoiceStatus

def test_gst_calculations_intra_state():
    """
    Test CGST + SGST calculations for intra-state order (Tamil Nadu -> Tamil Nadu).
    """
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal("1000.00"),
        customer_state="Tamil Nadu",
        customer_country="IN",
        product_type="subscription",
        tax_inclusive=False
    )
    
    assert gst_calcs["subtotal"] == Decimal("1000.00")
    assert gst_calcs["gst_rate"] == Decimal("18.00")
    assert gst_calcs["gst_amount"] == Decimal("180.00")
    assert gst_calcs["cgst"] == Decimal("90.00")
    assert gst_calcs["sgst"] == Decimal("90.00")
    assert gst_calcs["igst"] == Decimal("0.00")
    assert gst_calcs["total_amount"] == Decimal("1180.00")

def test_gst_calculations_inter_state():
    """
    Test IGST calculations for inter-state order (Tamil Nadu -> Karnataka).
    """
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal("1000.00"),
        customer_state="Karnataka",
        customer_country="IN",
        product_type="subscription",
        tax_inclusive=False
    )
    
    assert gst_calcs["subtotal"] == Decimal("1000.00")
    assert gst_calcs["gst_rate"] == Decimal("18.00")
    assert gst_calcs["gst_amount"] == Decimal("180.00")
    assert gst_calcs["cgst"] == Decimal("0.00")
    assert gst_calcs["sgst"] == Decimal("0.00")
    assert gst_calcs["igst"] == Decimal("180.00")
    assert gst_calcs["total_amount"] == Decimal("1180.00")

def test_gst_calculations_export():
    """
    Test 0% GST and Export classification (Tamil Nadu -> US).
    """
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal("1000.00"),
        customer_state="California",
        customer_country="US",
        product_type="subscription",
        tax_inclusive=False
    )
    
    assert gst_calcs["subtotal"] == Decimal("1000.00")
    assert gst_calcs["gst_rate"] == Decimal("0.00")
    assert gst_calcs["gst_amount"] == Decimal("0.00")
    assert gst_calcs["cgst"] == Decimal("0.00")
    assert gst_calcs["sgst"] == Decimal("0.00")
    assert gst_calcs["igst"] == Decimal("0.00")
    assert gst_calcs["total_amount"] == Decimal("1000.00")

def test_gst_calculations_tax_inclusive():
    """
    Test tax-inclusive subtotal and GST derivation.
    """
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal("1180.00"),
        customer_state="Karnataka",
        customer_country="IN",
        product_type="subscription",
        tax_inclusive=True
    )
    
    assert gst_calcs["subtotal"] == Decimal("1000.00")
    assert gst_calcs["gst_rate"] == Decimal("18.00")
    assert gst_calcs["gst_amount"] == Decimal("180.00")
    assert gst_calcs["total_amount"] == Decimal("1180.00")


def test_pdf_invoice_generation():
    """
    Test PDF invoice compile using reportlab.
    """
    import datetime
    invoice = Invoice(
        invoice_number="AUR/2026-27/000001",
        invoice_type="tax_invoice",
        product_type="subscription",
        issued_at=datetime.datetime.now(datetime.timezone.utc),
        total_amount=Decimal("1180.00"),
        taxable_amount=Decimal("1000.00"),
        gst_rate=Decimal("18.00"),
        gst_amount=Decimal("180.00"),
        cgst=Decimal("90.00"),
        sgst=Decimal("90.00"),
        igst=Decimal("0.00"),
        place_of_supply="Tamil Nadu",
        supplier_name="Auromind AI Private Limited",
        supplier_gstin="33ABCDE1234F1Z5",
        supplier_address="123, FinTech Hub, Chennai, Tamil Nadu",
        supplier_state="Tamil Nadu",
        supplier_country="IN",
        customer_name="Test Customer",
        customer_gstin="33FGHIJ5678K2Z9",
        customer_address="456, GST Road, Chennai",
        customer_state="Tamil Nadu",
        customer_country="IN",
        currency="INR"
    )
    
    pdf_bytes = InvoiceService.generate_pdf_invoice(invoice)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    # PDF files start with %PDF
    assert pdf_bytes.startswith(b"%PDF")


def test_concurrent_invoice_number_generation():
    """
    Test atomic sequential number generation under concurrent threads.
    Spawns 25 concurrent threads to generate numbers for the same prefix and year.
    """
    import threading
    from app.database import SessionLocal
    from app.services.billing.invoice_service import InvoiceService
    from app.models.invoice_sequence import InvoiceSequence

    # Clean previous test sequence if any
    db = SessionLocal()
    is_sqlite = db.bind.dialect.name == "sqlite"
    try:
        db.query(InvoiceSequence).filter(InvoiceSequence.year == "2029-30").delete()
        db.commit()
    finally:
        db.close()

    generated_numbers = []
    errors = []
    
    # SQLite does not support row locks (SELECT FOR UPDATE) to block concurrent sessions.
    # We serialize the test workers with a python lock when SQLite is used.
    lock = threading.Lock() if is_sqlite else None

    def worker():
        session = SessionLocal()
        try:
            if lock:
                lock.acquire()
            try:
                invoice_num = InvoiceService.generate_invoice_number(session, "CONF", "2029-30")
                session.commit()
                generated_numbers.append(invoice_num)
            finally:
                if lock:
                    lock.release()
        except Exception as e:
            session.rollback()
            errors.append(str(e))
        finally:
            session.close()

    threads = [threading.Thread(target=worker) for _ in range(25)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Errors occurred during concurrent generation: {errors}"
    assert len(generated_numbers) == 25
    assert len(set(generated_numbers)) == 25, "Duplicate invoice numbers detected!"
    
    # Check that they are correctly ordered from 1 to 25
    expected = [f"CONF/2029-30/{str(i).zfill(6)}" for i in range(1, 26)]
    assert sorted(generated_numbers) == expected


def test_refund_webhook_idempotency():
    """
    Test that refund webhook processing is idempotent.
    """
    import datetime
    from app.database import SessionLocal
    from app.services.billing.webhook_service import WebhookService
    from app.models.invoice import Invoice
    from app.models.billing import Payment
    from app.core.enums import InvoiceStatus, PaymentStatus
    from app.services.billing.token_service import TokenService
    from unittest.mock import MagicMock

    db = SessionLocal()
    try:
        # 1. Create unique workspace and payment
        workspace_id = uuid.uuid4()
        workspace = Workspace(
            id=workspace_id,
            name="Test Workspace",
            billing_address="Address",
            billing_state="Tamil Nadu",
            billing_country="IN",
            billing_gstin="33ABCDE1234F1Z5"
        )
        db.add(workspace)
        db.flush()

        provider_payment_id = f"pay_{uuid.uuid4().hex[:10]}"
        payment = Payment(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            amount=1000,
            currency="INR",
            provider="razorpay",
            payment_type="subscription",
            status=PaymentStatus.paid,
            provider_payment_id=provider_payment_id
        )
        db.add(payment)
        db.flush()

        # 2. Create corresponding Invoice in paid status
        invoice = Invoice(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            payment_id=payment.id,
            amount=Decimal("1180.00"),
            currency="INR",
            status=InvoiceStatus.paid,
            invoice_number=f"TEST-CN-{uuid.uuid4().hex[:6]}",
            invoice_type="tax_invoice",
            product_type="subscription",
            subtotal=Decimal("1000.00"),
            gst_rate=Decimal("18.00"),
            gst_amount=Decimal("180.00"),
            cgst=Decimal("90.00"),
            sgst=Decimal("90.00"),
            igst=Decimal("0.00"),
            taxable_amount=Decimal("1000.00"),
            total_amount=Decimal("1180.00"),
            place_of_supply="Tamil Nadu",
            supplier_name="Test Supplier",
            customer_name="Test Customer",
            customer_address="Address",
            customer_state="Tamil Nadu",
            customer_country="IN",
            issued_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(invoice)
        db.flush()
        db.commit()

        # Mock TokenService
        token_service = MagicMock(spec=TokenService)
        webhook_service = WebhookService(token_service=token_service)

        # 3. Simulate first refund webhook event
        webhook_entity = {
            "refund": {
                "entity": {
                    "payment_id": provider_payment_id,
                    "amount": 100000,
                    "id": "rfnd_123"
                }
            }
        }

        # Process first time
        webhook_service._handle_refund_webhook(db, "razorpay", webhook_entity)
        db.commit()

        # Assert Invoice is now refunded and credit note created
        db.refresh(invoice)
        assert invoice.status == InvoiceStatus.refunded
        
        # Check how many Credit Notes exist for this payment
        cns = db.query(Invoice).filter(
            Invoice.payment_id == payment.id,
            Invoice.invoice_type == "credit_note"
        ).all()
        assert len(cns) == 1

        # 4. Process second time (simulate replay/retry)
        webhook_service._handle_refund_webhook(db, "razorpay", webhook_entity)
        db.commit()

        # Assert NO duplicate credit note was created
        cns_after = db.query(Invoice).filter(
            Invoice.payment_id == payment.id,
            Invoice.invoice_type == "credit_note"
        ).all()
        assert len(cns_after) == 1

    finally:
        # Cleanup
        db.close()


def test_payment_service_record_successful_payment_gst_base():
    """
    Test that purchasing a starter pack for ₹99 base + ₹17.82 GST = ₹116.82 total
    correctly sets taxable_amount = ₹99.00 and total_amount = ₹116.82 in payment & invoice.
    """
    from app.database import SessionLocal
    from app.services.billing.payment_service import PaymentService
    from app.models.credit_pack import CreditPack

    db = SessionLocal()
    try:
        workspace_id = uuid.uuid4()
        workspace = Workspace(
            id=workspace_id,
            name="Starter Test Workspace",
            billing_address="Address",
            billing_state="Tamil Nadu",
            billing_country="IN",
            billing_gstin="33ABCDE1234F1Z5"
        )
        db.add(workspace)
        db.flush()

        class DummyPlanConfig:
            amount = Decimal("99.00")
            currency = "INR"

        provider_payment_id = f"pay_{uuid.uuid4().hex[:10]}"
        payment_payload = {
            "id": provider_payment_id,
            "amount": 11682, # 11682 paise = 116.82 INR paid at Razorpay checkout
            "currency": "INR",
            "method": "upi"
        }

        service = PaymentService()
        payment = service._record_successful_payment(
            db=db,
            provider="razorpay",
            payment_payload=payment_payload,
            plan_config=DummyPlanConfig(),
            workspace_id=str(workspace_id),
            payment_type="ai_credit_recharge",
            description="AI Credit Pack (Starter)"
        )
        db.commit()

        # Verify Payment record GST numbers
        assert payment.taxable_amount == Decimal("99.00")
        assert payment.gst_amount == Decimal("17.82")
        assert payment.total_amount == Decimal("116.82")

        # Verify generated Invoice GST numbers
        invoice = db.query(Invoice).filter(Invoice.payment_id == payment.id).first()
        assert invoice is not None
        assert invoice.taxable_amount == Decimal("99.00")
        assert invoice.gst_amount == Decimal("17.82")
        assert invoice.total_amount == Decimal("116.82")

    finally:
        db.close()


def test_optional_gst_profile_and_invoice_rendering():
    """
    Test that GSTIN is optional in workspace profile and when omitted,
    PDF invoice renders without any GSTIN line for customer.
    """
    import datetime
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        workspace_id = uuid.uuid4()
        workspace = Workspace(
            id=workspace_id,
            name="No GST Tech Pvt Ltd",
            billing_contact_name="Jane Doe",
            billing_email="jane@notech.com",
            billing_phone="+91 99999 88888",
            billing_address="789 Innovation Way",
            billing_city="Bengaluru",
            billing_state="Karnataka",
            billing_country="IN",
            billing_postal_code="560001",
            has_gst_registration=False,
            billing_gstin=None
        )
        db.add(workspace)
        db.commit()

        # Generate invoice without GSTIN
        invoice = Invoice(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            amount=Decimal("118.00"),
            currency="INR",
            status=InvoiceStatus.paid,
            invoice_number="NOGST/2026-27/000001",
            invoice_type="tax_invoice",
            product_type="subscription",
            subtotal=Decimal("100.00"),
            gst_rate=Decimal("18.00"),
            gst_amount=Decimal("18.00"),
            cgst=Decimal("0.00"),
            sgst=Decimal("0.00"),
            igst=Decimal("18.00"),
            taxable_amount=Decimal("100.00"),
            total_amount=Decimal("118.00"),
            place_of_supply="Karnataka",
            supplier_name="Auromind AI Private Limited",
            supplier_gstin="33ABCDE1234F1Z5",
            supplier_address="123, FinTech Hub, Chennai, Tamil Nadu",
            supplier_state="Tamil Nadu",
            supplier_country="IN",
            customer_name=workspace.name,
            customer_gstin=workspace.billing_gstin, # None
            customer_address=workspace.billing_address,
            customer_state=workspace.billing_state,
            customer_country=workspace.billing_country,
            issued_at=datetime.datetime.now(datetime.timezone.utc)
        )

        pdf_bytes = InvoiceService.generate_pdf_invoice(invoice)
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF")
        # Ensure 'Unregistered (B2C)' text is not forced into the document
        assert b"GSTIN: Unregistered" not in pdf_bytes

    finally:
        db.close()


