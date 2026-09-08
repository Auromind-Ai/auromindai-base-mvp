import uuid
import pytest
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock

from app.database import engine, Base, SessionLocal
from app.models.workspace import Workspace, WorkspaceMember
from app.models.user import User
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.billing import Payment
from app.models.invoice import Invoice
from app.core.enums import SubscriptionStatus, PaymentStatus
from app.services.billing.entitlement_service import EntitlementService
from app.services.billing.billing_service import BillingService
from app.routers.admin.billing import (
    override_subscription,
    OverrideSubscriptionRequest,
    repair_billing_op,
    RepairBillingOpRequest,
)


@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    EntitlementService.seed_default_entitlements(session)
    yield session
    session.close()


@pytest.mark.anyio
async def test_admin_manual_override_creates_invoice_and_gst(db):
    # Setup workspace & user
    ws = Workspace(
        id=uuid.uuid4(),
        name="TechCorp India",
        plan_type="free",
        billing_state="Tamil Nadu",
        billing_country="IN",
        billing_gstin="33AAAAA0000A1Z5",
        billing_address="100 Tech Park, Chennai"
    )
    user = User(id=uuid.uuid4(), email="admin@techcorp.com", full_name="Admin User")
    db.add_all([ws, user])
    db.commit()

    payload = OverrideSubscriptionRequest(
        plan_name="pro",
        status="active",
        reason="Manual enterprise upgrade approved"
    )

    # Mock storage service to simulate saving PDF
    with patch("app.services.billing.invoice_service.get_storage") as mock_storage:
        mock_provider = MagicMock()
        mock_provider._save_file_sync.return_value = "https://storage.example.com/invoices/test.pdf"
        mock_storage.return_value.provider = mock_provider

        res = await override_subscription(
            workspace_id=ws.id,
            payload=payload,
            db=db,
            admin_user="super_admin",
            request=None
        )

    assert "Subscription successfully overridden to pro" in res["message"]
    assert res["invoice_number"] is not None
    assert res["gst_amount"] > 0
    assert res["total_amount"] > 0

    # Verify Subscription in DB
    sub = db.query(Subscription).filter(Subscription.workspace_id == ws.id, Subscription.status == SubscriptionStatus.active).first()
    assert sub is not None
    assert sub.provider == "manual"
    assert sub.is_admin_override is True

    # Verify Workspace plan sync
    db.refresh(ws)
    assert ws.plan_type == "pro"

    # Verify Payment in DB
    payment = db.query(Payment).filter(Payment.workspace_id == ws.id).first()
    assert payment is not None
    assert payment.status == PaymentStatus.paid
    assert payment.payment_type == "subscription"
    assert payment.gst_amount is not None and payment.gst_amount > 0
    assert payment.subtotal is not None and payment.subtotal > 0
    assert payment.total_amount is not None and payment.total_amount > 0
    assert payment.invoice_id is not None
    assert payment.customer_state == "Tamil Nadu"

    # Verify Invoice in DB
    invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).first()
    assert invoice is not None
    assert invoice.invoice_number == res["invoice_number"]
    assert invoice.workspace_id == ws.id
    assert invoice.payment_id == payment.id
    assert invoice.pdf_url is not None
    assert invoice.gst_amount == payment.gst_amount
    assert invoice.total_amount == payment.total_amount

    # Verify BillingService.get_status (Payment History view)
    billing_svc = BillingService()
    status_data = billing_svc.get_status(db=db, workspace_id=ws.id)
    payments_list = status_data.get("payments", [])
    assert len(payments_list) >= 1
    target_p = next(p for p in payments_list if p["id"] == str(payment.id))
    assert target_p["invoice_number"] == invoice.invoice_number
    assert target_p["invoice_available"] is True
    assert target_p["gst_amount"] == float(payment.gst_amount)
    assert target_p["amount"] == float(payment.total_amount)


@pytest.mark.anyio
async def test_repair_missing_invoice_for_legacy_manual_payment(db):
    # Setup legacy payment without GST and without invoice
    ws = Workspace(
        id=uuid.uuid4(),
        name="Legacy Workspace",
        plan_type="solo",
        billing_state="Maharashtra",
        billing_country="IN"
    )
    db.add(ws)
    db.commit()

    solo_plan = db.query(Plan).filter(Plan.name == "solo").first()
    sub = Subscription(
        workspace_id=ws.id,
        plan_id=solo_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        provider="manual"
    )
    db.add(sub)
    db.flush()

    legacy_payment = Payment(
        workspace_id=ws.id,
        subscription_id=sub.id,
        amount=int(solo_plan.price),
        currency="INR",
        status=PaymentStatus.paid,
        provider="manual",
        payment_type="subscription"
        # Notice: subtotal, gst_amount, invoice_id are all None!
    )
    db.add(legacy_payment)
    db.commit()

    assert legacy_payment.invoice_id is None
    assert legacy_payment.gst_amount is None

    # Run repair for missing invoices
    with patch("app.services.billing.invoice_service.get_storage") as mock_storage:
        mock_provider = MagicMock()
        mock_provider._save_file_sync.return_value = "https://storage.example.com/invoices/repaired.pdf"
        mock_storage.return_value.provider = mock_provider

        repair_payload = RepairBillingOpRequest(
            issue_type="missing_invoice",
            workspace_id=str(ws.id)
        )
        res = await repair_billing_op(
            payload=repair_payload,
            db=db,
            admin_user="super_admin",
            request=None
        )

    assert res["status"] == "success"
    assert res["repaired_details"]["repaired_invoices_count"] == 1

    # Verify payment now has GST and invoice_id
    db.refresh(legacy_payment)
    assert legacy_payment.invoice_id is not None
    assert legacy_payment.gst_amount is not None and legacy_payment.gst_amount > 0

    # Verify invoice was created
    inv = db.query(Invoice).filter(Invoice.id == legacy_payment.invoice_id).first()
    assert inv is not None
    assert inv.invoice_number is not None
    assert inv.pdf_url is not None
