import uuid
import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from app.database import engine, Base, SessionLocal
from app.models.workspace import Workspace, WorkspaceMember
from app.models.user import User
from app.models.plan import Plan
from app.models.plan_entitlement import PlanEntitlement
from app.models.subscription import Subscription
from app.models.billing import Payment
from app.models.invoice import Invoice
from app.models.token_ledger import TokenLedger
from app.models.wcc import WCCWallet, WCCRechargeLog
from app.core.enums import SubscriptionStatus, PaymentStatus
from app.services.billing.billing_service import BillingService
from app.services.billing.webhook_service import WebhookService
from app.services.billing.token_service import TokenService
from app.services.billing.entitlement_service import EntitlementService
from app.services.billing.gst_service import GSTService
from app.services.billing.gateway.base import GatewayPayment
from app.utils.money import to_paise


@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    EntitlementService.seed_default_entitlements(session)
    yield session
    session.close()


def test_initiate_plan_purchase_order(db):
    user = User(id=uuid.uuid4(), email="testowner@example.com", full_name="Test Owner")
    ws = Workspace(id=uuid.uuid4(), name="Test Company", billing_state="Tamil Nadu", billing_country="IN")
    db.add_all([user, ws])
    db.flush()

    member = WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner")
    db.add(member)
    db.commit()

    pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal(str(pro_plan.monthly_price)),
        customer_state=ws.billing_state,
        customer_country=ws.billing_country,
        product_type="subscription",
        db=db
    )
    expected_paise = to_paise(gst_calcs["total_amount"])

    service = BillingService()
    mock_gateway = MagicMock()
    mock_gateway.provider = "razorpay"
    mock_gateway.get_public_key.return_value = "rzp_test_key"
    mock_gateway.client.order.create.return_value = {"id": "order_plan_12345"}

    with patch.object(service, "_resolve_gateway", return_value=mock_gateway):
        res = service.initiate_plan_purchase(
            db=db,
            workspace_id=str(ws.id),
            user_id=str(user.id),
            user_email=user.email,
            user_name=user.full_name,
            plan_key="pro",
            billing_cycle="monthly",
            provider="razorpay",
        )

    assert res["provider"] == "razorpay"
    assert res["gateway_order_id"] == "order_plan_12345"
    assert res["plan"] == "pro"
    assert res["amount"] == expected_paise
    mock_gateway.client.order.create.assert_called_once()


def test_verify_plan_payment_and_entitlements(db):
    user = User(id=uuid.uuid4(), email="user1@example.com", full_name="User One")
    ws = Workspace(id=uuid.uuid4(), name="Workspace One", plan_type="free", billing_state="Karnataka", billing_country="IN")
    db.add_all([user, ws])
    db.flush()

    member = WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner")
    db.add(member)
    db.commit()

    pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal(str(pro_plan.monthly_price)),
        customer_state=ws.billing_state,
        customer_country=ws.billing_country,
        product_type="subscription",
        db=db
    )
    expected_paise = to_paise(gst_calcs["total_amount"])

    service = BillingService()
    mock_gateway = MagicMock()
    mock_gateway.provider = "razorpay"
    mock_gateway.verify_payment.return_value = {
        "order_id": "order_xyz123",
        "payment_id": "pay_plan_abc123",
        "signature": "sig_valid_123"
    }

    mock_fetched_payment = GatewayPayment(
        provider="razorpay",
        payment_id="pay_plan_abc123",
        amount=expected_paise,
        currency="INR",
        status="captured",
        raw={
            "id": "pay_plan_abc123",
            "amount": expected_paise,
            "currency": "INR",
            "status": "captured",
            "method": "upi",
            "notes": {
                "workspace_id": str(ws.id),
                "plan_key": "pro",
                "billing_cycle": "monthly",
                "type": "plan_purchase"
            }
        }
    )
    mock_gateway.fetch_payment.return_value = mock_fetched_payment

    with patch.object(service, "_resolve_gateway", return_value=mock_gateway):
        result = service.verify_plan_payment(
            db=db,
            workspace_id=str(ws.id),
            user_id=str(user.id),
            plan_key="pro",
            billing_cycle="monthly",
            order_id="order_xyz123",
            payment_id="pay_plan_abc123",
            signature="sig_valid_123",
            provider="razorpay"
        )

    assert result["status"] == "ACTIVE"
    assert result["plan"] == "pro"
    assert result["payment_id"] == "pay_plan_abc123"

    # Verify Database state
    db.refresh(ws)
    assert ws.plan_type == "pro"

    # Verify Payment record
    payment = db.query(Payment).filter(Payment.provider_payment_id == "pay_plan_abc123").first()
    assert payment is not None
    assert payment.status == PaymentStatus.paid

    # Verify Tax Invoice created
    invoice = db.query(Invoice).filter(Invoice.payment_id == payment.id).first()
    assert invoice is not None
    assert invoice.workspace_id == ws.id

    # Verify Included AI Credits granted (250,000 credits for Pro seed)
    token_grant = db.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws.id,
        TokenLedger.entry_type == "token_grant",
        TokenLedger.balance_source == "INCLUDED"
    ).first()
    assert token_grant is not None
    assert token_grant.credits_delta == Decimal("250000")

    # Verify Included WCC Promo balance granted (500 INR)
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert wallet is not None
    assert float(wallet.included_balance) == 500.00

    # Verify Idempotent Re-verification does not duplicate grants
    with patch.object(service, "_resolve_gateway", return_value=mock_gateway):
        re_verify = service.verify_plan_payment(
            db=db,
            workspace_id=str(ws.id),
            user_id=str(user.id),
            plan_key="pro",
            billing_cycle="monthly",
            order_id="order_xyz123",
            payment_id="pay_plan_abc123",
            signature="sig_valid_123",
            provider="razorpay"
        )
    assert re_verify["status"] == "already_verified"

    # Ensure still only 1 token grant and 1 invoice
    total_grants = db.query(TokenLedger).filter(TokenLedger.workspace_id == ws.id, TokenLedger.entry_type == "token_grant").count()
    assert total_grants == 1
    total_invoices = db.query(Invoice).filter(Invoice.payment_id == payment.id).count()
    assert total_invoices == 1
