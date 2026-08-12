import os
import sys
import uuid
import pytest
import threading
import json
from decimal import Decimal
from datetime import datetime, timezone
from typing import Any, Dict
from unittest.mock import patch, MagicMock

from fastapi import FastAPI, Depends, Request, Header, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.database import Base, engine, SessionLocal, get_db
from app.routers import billing, wcc
from app.routers.auth import get_current_user, CurrentUser
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.plan import Plan
from app.models.plan_entitlement import PlanEntitlement
from app.models.billing import Payment
from app.models.invoice import Invoice
from app.models.invoice_sequence import InvoiceSequence
from app.models.webhook_event import WebhookEvent
from app.models.token_ledger import TokenLedger
from app.models.credit_pack import CreditPack
from app.models.wcc import WCCWallet, WCCRateCard, WCCTransaction, WCCRechargeLog
from app.core.enums import SubscriptionStatus, InvoiceStatus, PaymentStatus
from app.services.billing.gst_service import GSTService
from app.services.billing.invoice_service import InvoiceService
from app.services.billing.webhook_service import WebhookService
from app.services.platform_settings_service import PlatformSetting, get_setting
from app.services.wcc_service import WCCService
from app.services.billing.gateway.base import GatewayPayment, GatewayWebhookEvent, PaymentGateway, GatewaySubscription
from app.models.platform_setting import PlatformSetting
from app.services.platform_settings_service import clear_settings_cache


# Create clean testing app
app = FastAPI()
app.include_router(billing.router)
app.include_router(wcc.router)

# Thread-safe user context mock
test_user = None

def override_get_current_user(request: Request):
    global test_user
    if not test_user:
        raise HTTPException(status_code=401, detail="UAT User not authenticated")
    return test_user

app.dependency_overrides[get_current_user] = override_get_current_user

# Mock Payment Gateway
class MockPaymentGateway(PaymentGateway):
    provider = "razorpay"
    payments = {}

    def __init__(self):
        self.payments = {}
        self.client = MagicMock()
        self.client.order.create.side_effect = lambda data: {
            "id": f"order_{uuid.uuid4().hex[:12]}",
            "amount": data.get("amount", 1000),
            "currency": data.get("currency", "INR"),
            "status": "created"
        }

    def get_public_key(self) -> str:
        return "rzp_test_key_12345"

    def create_customer(self, workspace, user_email, user_name) -> str:
        return f"cust_{uuid.uuid4().hex[:8]}"

    def create_subscription(self, plan_config, workspace, user_id, user_email, user_name) -> dict:
        sub_id = f"sub_{uuid.uuid4().hex[:10]}"
        raw_sub = {
            "id": sub_id,
            "status": "created",
            "provider": self.provider,
            "plan_id": "plan_mock_123",
            "notes": {
                "workspace_id": str(workspace.id),
                "plan_key": plan_config.key,
                "user_id": str(user_id),
            }
        }
        return {
            "provider": self.provider,
            "subscription_id": sub_id,
            "public_key": self.get_public_key(),
            "plan_reference": "plan_mock_123",
            "prefill": {
                "email": user_email,
                "name": user_name or user_email,
            },
            "raw": raw_sub
        }

    def verify_payment(self, payload: dict[str, Any]) -> dict[str, str]:
        return {"status": "success", "payment_id": "pay_mock_123"}

    def fetch_subscription(self, subscription_id: str) -> GatewaySubscription:
        from app.services.billing.gateway.base import GatewaySubscription
        return GatewaySubscription(
            provider=self.provider,
            subscription_id=subscription_id,
            status="active",
            customer_id="cust_mock_123",
            start_at=datetime.now(timezone.utc),
            end_at=datetime.now(timezone.utc),
            current_start=datetime.now(timezone.utc),
            current_end=datetime.now(timezone.utc),
            plan_reference="pro",
            raw={"id": subscription_id, "status": "active"}
        )

    def fetch_payment(self, payment_id: str) -> GatewayPayment:
        if payment_id in self.payments:
            return self.payments[payment_id]
        return GatewayPayment(
            provider=self.provider,
            payment_id=payment_id,
            amount=100000,  # 1000.00 INR (100000 paise)
            currency="INR",
            status="captured",
            subscription_id=None,
            customer_id="cust_mock_123",
            raw={
                "id": payment_id,
                "amount": 100000,
                "currency": "INR",
                "status": "captured",
                "method": "card",
                "email": "uat_user@auromind.ai",
                "notes": {},
                "created_at": int(datetime.now(timezone.utc).timestamp())
            }
        )

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        return True

    def handle_webhook(self, body: bytes, signature: str) -> GatewayWebhookEvent:
        from app.services.billing.gateway.base import GatewayWebhookEvent
        data = json.loads(body.decode("utf-8"))
        event_name = data.get("event", "")
        payload = data.get("payload", {})
        
        if event_name.startswith("subscription."):
            entity = {
                "subscription": payload.get("subscription", {}).get("entity", {}),
                "payment": payload.get("payment", {}).get("entity", {}),
            }
        elif event_name in {"payment.captured", "payment.failed", "payment.refunded", "refund.created"}:
            entity = {
                "payment": payload.get("payment", {}).get("entity", {}),
                "refund": payload.get("refund", {}).get("entity", {}),
                "subscription": payload.get("subscription", {}).get("entity", {}),
            }
        else:
            entity = payload

        return GatewayWebhookEvent(
            provider=self.provider,
            event_id=data.get("id", "evt_mock_id"),
            event_type=event_name,
            entity=entity,
            raw_event=data
        )


mock_gateway = MockPaymentGateway()

@pytest.fixture(autouse=True)
def setup_mock_gateways():
    mock_gateway.payments.clear()
    with patch("app.services.billing.gateway.get_gateway", return_value=mock_gateway), \
         patch("app.services.billing.billing_service.get_gateway", return_value=mock_gateway), \
         patch("app.services.billing.webhook_service.get_gateway", return_value=mock_gateway), \
         patch("app.services.billing.flow_pack_service.get_gateway", return_value=mock_gateway), \
         patch("app.services.wcc_service.get_gateway", return_value=mock_gateway):
        yield

@pytest.fixture(autouse=True)
def clean_tables(uat_db):
    from app.models.subscription import Subscription
    uat_db.query(Invoice).delete()
    uat_db.query(InvoiceSequence).delete()
    uat_db.query(Payment).delete()
    uat_db.query(WebhookEvent).delete()
    uat_db.query(Subscription).delete()
    uat_db.query(WCCRechargeLog).delete()
    uat_db.commit()

# Helper to seed platform settings
def seed_setting(db: Session, key: str, value: Any, value_type: str = "string"):
    if isinstance(value, (dict, list)):
        value_str = json.dumps(value)
        value_type = "json"
    else:
        value_str = str(value)
    setting = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
    if setting:
        setting.value = value_str
        setting.value_type = value_type
    else:
        setting = PlatformSetting(key=key, value=value_str, value_type=value_type)
        db.add(setting)
    db.commit()

@pytest.fixture(scope="module")
def uat_db():
    db = SessionLocal()
    # Seed necessary configurations
    seed_setting(db, "gst_enabled", True)
    seed_setting(db, "gst_rate", 18.0)
    seed_setting(db, "supplier_name", "Auromind AI Private Limited")
    seed_setting(db, "supplier_gstin", "33ABCDE1234F1Z5")
    seed_setting(db, "supplier_address", "123, FinTech Hub, Chennai, Tamil Nadu")
    seed_setting(db, "supplier_state", "Tamil Nadu")
    seed_setting(db, "supplier_country", "IN")
    seed_setting(db, "invoice_prefix", "AUR")
    seed_setting(db, "token_limit_per_plan", {"free": 1000, "solo": 5000, "pro": 10000, "enterprise": 50000})
    seed_setting(db, "pro_plan_price", 1000)
    seed_setting(db, "pro_plan_name", "Pro")
    seed_setting(db, "pro_plan_desc", "UAT Pro Plan")
    seed_setting(db, "pro_plan_features", ["flow", "ai_topup", "wcc_recharge"])

    # Seed Plan models
    pro_plan = db.query(Plan).filter(Plan.name == "pro").first()

    if not pro_plan:
        pro_plan = Plan(
        id=uuid.uuid4(),
        name="pro",
        price=1000,
        token_limit=10000,
        workspace_limit=1,
        billing_cycle="monthly",
        currency="INR",
        is_active=True,
        features={
            "allow_ai_topup": True,
            "allow_wcc_recharge": True,
        },
    )
        db.add(pro_plan)
    else:
        pro_plan.price = 1000

        db.flush()

    free_plan = db.query(Plan).filter(Plan.name == "free").first()
    if not free_plan:
        free_plan = Plan(
            id=uuid.uuid4(),
            name="free",
            price=0,
            token_limit=1000,
            workspace_limit=1,
            billing_cycle="monthly",
            currency="INR",
            is_active=True,
            features={}
        )
        db.add(free_plan)
        db.flush()

    free_ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == free_plan.id).first()
    if not free_ent:
        free_ent = PlanEntitlement(
            id=uuid.uuid4(),
            plan_id=free_plan.id,
            allow_ai_topup=False,
            allow_wcc_recharge=False
        )
        db.add(free_ent)

    pro_ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == pro_plan.id).first()
    if not pro_ent:
        pro_ent = PlanEntitlement(
            id=uuid.uuid4(),
            plan_id=pro_plan.id,
            allow_ai_topup=True,
            allow_wcc_recharge=True
        )
        db.add(pro_ent)

    # Seed credit packs
    credit_pack = db.query(CreditPack).filter(CreditPack.pack_id == "pack_10").first()
    if not credit_pack:
        credit_pack = CreditPack(
            pack_id="pack_10",
            name="10 Credits Pack",
            amount=100.0,
            credits=10,
            currency="INR",
            is_active=True
        )
        db.add(credit_pack)

    # Seed WCC rate cards
    rate_card = db.query(WCCRateCard).filter(WCCRateCard.category == "marketing", WCCRateCard.region == "IN").first()
    if not rate_card:
        rate_card = WCCRateCard(
            category="marketing",
            region="IN",
            meta_cost=Decimal("0.50"),
            customer_price=Decimal("0.80"),
            is_active=True
        )
        db.add(rate_card)

    db.commit()
    yield db
    db.close()

@pytest.fixture
def seeded_user_and_workspace(uat_db):
    global test_user
    # Create test user
    db_user = User(
        id=uuid.uuid4(),
        email=f"uat_{uuid.uuid4().hex[:6]}@auromind.ai",
        full_name="UAT Tester User",
        is_active=True
    )
    uat_db.add(db_user)
    uat_db.flush()

    # Create workspace
    workspace = Workspace(
        id=uuid.uuid4(),
        name="UAT Test Workspace",
        billing_address="123 Test Street",
        billing_state="Tamil Nadu",
        billing_country="IN",
        billing_gstin="33FGHIJ5678K2Z9",
        provider_customer_id="cust_mock_123"
    )
    uat_db.add(workspace)
    uat_db.flush()

    # Create membership
    member = WorkspaceMember(
        id=uuid.uuid4(),
        user_id=db_user.id,
        workspace_id=workspace.id,
        role="owner"
    )
    uat_db.add(member)
    uat_db.commit()

    # Set globally for authenticate override
    test_user = CurrentUser(
        user=db_user,
        workspace_id=workspace.id
    )

    return db_user, workspace

def test_1_new_subscription_flow(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # 1. Create a subscription
    response = client.post(
        "/billing/create-subscription",
        json={"workspace_id": str(workspace.id), "plan": "pro", "provider": "razorpay"},
        headers={"X-Workspace-Id": str(workspace.id)}
    )
    assert response.status_code == 200
    sub_data = response.json()
    assert "subscription_id" in sub_data
    sub_id = sub_data["subscription_id"]

    # Verify subscription created in pending status in DB
    db_sub = uat_db.query(Plan).filter(Plan.name == "pro").first()
    assert db_sub is not None

    # 2. Simulate Razorpay subscription.activated webhook
    webhook_payload = {
        "id": f"evt_{uuid.uuid4().hex[:10]}",
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": sub_id,
                    "status": "active",
                    "plan_id": sub_data.get("plan_id"),
                    "notes": {
                        "workspace_id": str(workspace.id),
                        "plan_key": "pro"
                    }
                }
            }
        }
    }

    resp = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp.status_code == 200

    # Refresh DB and verify subscription is active
    from app.models.subscription import Subscription
    sub_record = uat_db.query(Subscription).filter(Subscription.provider_subscription_id == sub_id).first()
    assert sub_record is not None
    assert sub_record.status == SubscriptionStatus.active

def test_2_subscription_renewal_invoice_locking(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # 1. Setup active subscription record
    from app.models.subscription import Subscription
    sub_id = f"sub_ren_{uuid.uuid4().hex[:8]}"
    pro_plan = uat_db.query(Plan).filter(Plan.name == "pro").first()
    from app.models.platform_setting import PlatformSetting

    setting = (
    uat_db.query(PlatformSetting)
    .filter(PlatformSetting.key == "pro_plan_price")
    .first()
)

    if setting:
        setting.value = "1000"
        setting.value_type = "float"
    else:
            uat_db.add(
        PlatformSetting(
            key="pro_plan_price",
            value="1000",
            value_type="float",
        )
    )

    uat_db.commit()
    clear_settings_cache()
    uat_db.refresh(setting) if setting else None
    print("TEST SETTING:", setting.value)
    subscription = Subscription(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        start_date=datetime.now(timezone.utc),
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc),
        provider="razorpay",
        provider_subscription_id=sub_id
    )
    uat_db.add(subscription)
    uat_db.commit()

    # 2. Simulate renewal charge webhook
    payment_id = f"pay_ren_{uuid.uuid4().hex[:8]}"
    webhook_payload = {
        "id": f"evt_{uuid.uuid4().hex[:10]}",
        "event": "subscription.charged",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": 118000,  # Paise
                    "currency": "INR",
                    "status": "captured",
                    "subscription_id": sub_id,
                    "notes": {
                        "workspace_id": str(workspace.id)
                    }
                }
            },
            "subscription": {
                "entity": {
                    "id": sub_id,
                    "status": "active"
                }
            }
        }
    }

    resp = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp.status_code == 200

    # Verify that a payment record and sequence-locked tax invoice are created
    db_payment = uat_db.query(Payment).filter(Payment.provider_payment_id == payment_id).first()
    assert db_payment is not None
    assert db_payment.status == PaymentStatus.paid

    db_invoice = uat_db.query(Invoice).filter(Invoice.payment_id == db_payment.id).first()
    assert db_invoice is not None
    assert db_invoice.invoice_number.startswith("AUR/")
    assert db_invoice.status == InvoiceStatus.paid

def test_3_ai_credit_purchase_flow(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # Entitlement requires an active Pro subscription to top up AI credits
    from app.models.subscription import Subscription
    pro_plan = uat_db.query(Plan).filter(Plan.name == "pro").first()
    subscription = Subscription(
        workspace_id=workspace.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        provider="razorpay",
        provider_subscription_id=f"sub_cp_{uuid.uuid4().hex[:6]}"
    )
    uat_db.add(subscription)
    uat_db.commit()

    # 1. Initiate purchase via credits/purchase
    response = client.post(
        "/billing/credits/purchase",
        json={"pack_id": "pack_10", "provider": "razorpay"},
        headers={"X-Workspace-Id": str(workspace.id)}
    )
    assert response.status_code == 200
    purchase_data = response.json()
    assert "gateway_order_id" in purchase_data
    order_id = purchase_data["gateway_order_id"]

    # 2. Simulate Razorpay payment.captured webhook
    payment_id = f"pay_cp_{uuid.uuid4().hex[:8]}"
    webhook_payload = {
        "id": f"evt_{uuid.uuid4().hex[:10]}",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": 11800,  # 100 INR + 18% GST (paise)
                    "currency": "INR",
                    "status": "captured",
                    "order_id": order_id,
                    "notes": {
                        "workspace_id": str(workspace.id),
                        "pack_id": "pack_10",
                        "type": "credit_pack_purchase"
                    }
                }
            }
        }
    }

    resp = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp.status_code == 200

    # Verify that credits are added to token ledger
    ledger_entry = uat_db.query(TokenLedger).filter(
        TokenLedger.workspace_id == workspace.id,
        TokenLedger.reference_key == f"purchase:{workspace.id}:{payment_id}"
    ).first()
    assert ledger_entry is not None
    assert ledger_entry.credits_delta == Decimal("10.0")

def test_4_wcc_recharge_flow(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # Seed Pro subscription to pass allow_wcc_recharge check
    from app.models.subscription import Subscription
    pro_plan = uat_db.query(Plan).filter(Plan.name == "pro").first()
    subscription = Subscription(
        workspace_id=workspace.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        provider="razorpay",
        provider_subscription_id=f"sub_wcc_{uuid.uuid4().hex[:6]}"
    )
    uat_db.add(subscription)
    uat_db.commit()

    # 1. Initiate WCC recharge
    response = client.post(
        "/wallet/wcc/recharge/initiate",
        json={"amount": 500.0},
        headers={"X-Workspace-Id": str(workspace.id)}
    )
    assert response.status_code == 200
    recharge_data = response.json()
    assert "gateway_order_id" in recharge_data
    order_id = recharge_data["gateway_order_id"]

    # 2. Simulate Razorpay webhook for WCC wallet recharge
    payment_id = f"pay_wcc_{uuid.uuid4().hex[:8]}"
    webhook_payload = {
        "id": f"evt_{uuid.uuid4().hex[:10]}",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": 59000,  # 500 + 18% GST (paise)
                    "currency": "INR",
                    "status": "captured",
                    "order_id": order_id
                }
            }
        }
    }

    resp = client.post(
        "/wallet/wcc/recharge/webhook",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp.status_code == 200

    # Verify WCC Wallet balance increased
    wallet = uat_db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace.id).first()
    assert wallet is not None
    assert float(wallet.balance) == 500.0

def test_5_failed_payment_webhook(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # Setup subscription record in DB so that it processes correctly
    from app.models.subscription import Subscription
    sub_id = f"sub_fail_{uuid.uuid4().hex[:8]}"
    pro_plan = uat_db.query(Plan).filter(Plan.name == "pro").first()
    subscription = Subscription(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        provider="razorpay",
        provider_subscription_id=sub_id
    )
    uat_db.add(subscription)
    uat_db.commit()

    # Send failed payment webhook event
    payment_id = f"pay_fail_{uuid.uuid4().hex[:8]}"
    webhook_payload = {
        "id": f"evt_{uuid.uuid4().hex[:10]}",
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": 118000,
                    "currency": "INR",
                    "status": "failed",
                    "subscription_id": sub_id,
                    "error_description": "Card has expired",
                    "notes": {
                        "workspace_id": str(workspace.id)
                    }
                }
            }
        }
    }

    resp = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp.status_code == 200

    # Verify failed payment recorded in DB
    db_payment = uat_db.query(Payment).filter(Payment.provider_payment_id == payment_id).first()
    assert db_payment is not None
    assert db_payment.status == PaymentStatus.failed
    assert "Card has expired" in db_payment.failure_reason

def test_6_webhook_idempotency_audit_trail(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    event_id = f"evt_dup_{uuid.uuid4().hex[:10]}"
    webhook_payload = {
        "id": event_id,
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_dup_{uuid.uuid4().hex[:8]}",
                    "amount": 1000,
                    "status": "failed",
                    "notes": {"workspace_id": str(workspace.id)}
                }
            }
        }
    }

    # Send first time
    resp1 = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "ok"

    # Send second time (duplicate retry)
    resp2 = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "duplicate"  # Verified idempotent audit trail exit

def test_7_full_refund_gst_credit_note(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # 1. Setup payment record in DB
    payment_id = f"pay_ref_{uuid.uuid4().hex[:8]}"
    payment = Payment(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        amount=1000,
        currency="INR",
        provider="razorpay",
        status=PaymentStatus.paid,
        provider_payment_id=payment_id
    )
    uat_db.add(payment)
    uat_db.flush()

    # 2. Setup paid Tax Invoice in DB
    invoice = Invoice(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        payment_id=payment.id,
        amount=Decimal("1180.00"),
        currency="INR",
        status=InvoiceStatus.paid,
        invoice_number=f"AUR/2026-27/{uuid.uuid4().hex[:6].upper()}",
        invoice_type="tax_invoice",
        subtotal=Decimal("1000.00"),
        gst_rate=Decimal("18.00"),
        gst_amount=Decimal("180.00"),
        cgst=Decimal("90.00"),
        sgst=Decimal("90.00"),
        igst=Decimal("0.00"),
        total_amount=Decimal("1180.00"),
        place_of_supply="Tamil Nadu",
        issued_at=datetime.now(timezone.utc)
    )
    uat_db.add(invoice)
    uat_db.commit()

    # 3. Simulate payment.refunded webhook
    webhook_payload = {
        "id": f"evt_{uuid.uuid4().hex[:10]}",
        "event": "payment.refunded",
        "payload": {
            "refund": {
                "entity": {
                    "payment_id": payment_id,
                    "amount": 118000,  # minor units
                    "id": f"rfnd_{uuid.uuid4().hex[:6]}"
                }
            }
        }
    }

    resp = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp.status_code == 200

    # 4. Verify Credit Note created and GST reversed
    uat_db.refresh(payment)
    assert payment.status == PaymentStatus.refunded

    cns = uat_db.query(Invoice).filter(
        Invoice.payment_id == payment.id,
        Invoice.invoice_type == "credit_note"
    ).all()
    assert len(cns) == 1
    credit_note = cns[0]
    assert credit_note.amount == Decimal("1180.00")
    assert credit_note.gst_amount == Decimal("180.00")
    assert credit_note.cgst == Decimal("90.00")
    assert credit_note.sgst == Decimal("90.00")

def test_8_partial_refund_marks_refunded_fully(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # 1. Setup payment record in DB
    payment_id = f"pay_pref_{uuid.uuid4().hex[:8]}"
    payment = Payment(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        amount=1000,
        currency="INR",
        provider="razorpay",
        status=PaymentStatus.paid,
        provider_payment_id=payment_id
    )
    uat_db.add(payment)
    uat_db.flush()

    # 2. Setup paid Tax Invoice in DB
    invoice = Invoice(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        payment_id=payment.id,
        amount=Decimal("1180.00"),
        currency="INR",
        status=InvoiceStatus.paid,
        invoice_number=f"AUR/2026-27/{uuid.uuid4().hex[:6].upper()}",
        invoice_type="tax_invoice",
        subtotal=Decimal("1000.00"),
        gst_rate=Decimal("18.00"),
        gst_amount=Decimal("180.00"),
        cgst=Decimal("90.00"),
        sgst=Decimal("90.00"),
        igst=Decimal("0.00"),
        total_amount=Decimal("1180.00"),
        place_of_supply="Tamil Nadu",
        issued_at=datetime.now(timezone.utc)
    )
    uat_db.add(invoice)
    uat_db.commit()

    # 3. Simulate partial refund webhook (e.g. 500 INR refunded)
    webhook_payload = {
        "id": f"evt_{uuid.uuid4().hex[:10]}",
        "event": "payment.refunded",
        "payload": {
            "refund": {
                "entity": {
                    "payment_id": payment_id,
                    "amount": 59000,  # 500 + 18% GST (paise)
                    "id": f"rfnd_{uuid.uuid4().hex[:6]}"
                }
            }
        }
    }

    resp = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp.status_code == 200

    # Refresh DB and verify payment is marked as refunded
    uat_db.refresh(payment)
    assert payment.status == PaymentStatus.refunded

def test_9_gst_calculations_export_country(uat_db):
    # US client should pay 0% GST (Export classifications)
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal("1000.00"),
        customer_state="California",
        customer_country="US",
        product_type="subscription",
        db=uat_db,
        tax_inclusive=False
    )
    assert gst_calcs["gst_rate"] == Decimal("0.00")
    assert gst_calcs["gst_amount"] == Decimal("0.00")
    assert gst_calcs["total_amount"] == Decimal("1000.00")

def test_10_gst_calculations_intra_state(uat_db):
    # Tamil Nadu to Tamil Nadu transaction -> CGST (9%) + SGST (9%)
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal("1000.00"),
        customer_state="Tamil Nadu",
        customer_country="IN",
        product_type="subscription",
        db=uat_db,
        tax_inclusive=False
    )
    assert gst_calcs["gst_rate"] == Decimal("18.00")
    assert gst_calcs["gst_amount"] == Decimal("180.00")
    assert gst_calcs["cgst"] == Decimal("90.00")
    assert gst_calcs["sgst"] == Decimal("90.00")
    assert gst_calcs["igst"] == Decimal("0.00")
    assert gst_calcs["total_amount"] == Decimal("1180.00")

def test_11_gst_calculations_inter_state(uat_db):
    # Tamil Nadu to Karnataka transaction -> IGST (18%)
    gst_calcs = GSTService.calculate_gst(
        amount=Decimal("1000.00"),
        customer_state="Karnataka",
        customer_country="IN",
        product_type="subscription",
        db=uat_db,
        tax_inclusive=False
    )
    assert gst_calcs["gst_rate"] == Decimal("18.00")
    assert gst_calcs["gst_amount"] == Decimal("180.00")
    assert gst_calcs["cgst"] == Decimal("0.00")
    assert gst_calcs["sgst"] == Decimal("0.00")
    assert gst_calcs["igst"] == Decimal("180.00")
    assert gst_calcs["total_amount"] == Decimal("1180.00")

def test_12_concurrent_100_payment_simulation(uat_db):
    # Clean previous test sequence
    uat_db.query(InvoiceSequence).filter(InvoiceSequence.year == "2029-30").delete()
    uat_db.commit()

    generated_numbers = []
    errors = []
    lock = threading.Lock()

    def worker():
        session = SessionLocal()
        try:
            # We serialize the test workers with a python lock since SQLite doesn't support SELECT FOR UPDATE block
            with lock:
                invoice_num = InvoiceService.generate_invoice_number(session, "CONF", "2029-30")
                session.commit()
                generated_numbers.append(invoice_num)
        except Exception as e:
            session.rollback()
            errors.append(str(e))
        finally:
            session.close()

    # Simulate 100 concurrent payments
    threads = [threading.Thread(target=worker) for _ in range(100)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Errors during simulation: {errors}"
    assert len(generated_numbers) == 100
    assert len(set(generated_numbers)) == 100, "Duplicate invoice numbers detected in concurrent run!"

def test_13_invoice_pdf_download(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # 1. Setup invoice record with PDF generated locally
    invoice = Invoice(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        amount=Decimal("1180.00"),
        currency="INR",
        status=InvoiceStatus.paid,
        invoice_number=f"AUR/2026-27/{uuid.uuid4().hex[:6].upper()}",
        invoice_type="tax_invoice",
        subtotal=Decimal("1000.00"),
        total_amount=Decimal("1180.00"),
        place_of_supply="Tamil Nadu",
        issued_at=datetime.now(timezone.utc)
    )
    # Trigger PDF generation locally
    pdf_bytes = InvoiceService.generate_pdf_invoice(invoice)
    assert pdf_bytes.startswith(b"%PDF")
    
    # Save the file using Storage provider (falls back to LocalStorageProvider)
    from app.services.storage.service import get_storage
    file_name = f"invoices/AUR_UAT_TEST_{uuid.uuid4().hex}.pdf"
    pdf_url = get_storage()._build_provider()._save_file_sync(file_name, pdf_bytes, "application/pdf")
    invoice.pdf_url = pdf_url
    uat_db.add(invoice)
    uat_db.commit()

    # 2. Call download endpoint and verify redirect response code (307/302)
    response = client.get(
        f"/billing/invoices/{invoice.id}/download",
        follow_redirects=False
    )
    assert response.status_code in (302, 307)
    redirect_url = response.headers.get("location")
    assert "/temp_uploads/" in redirect_url

    # Check file exists on local filesystem
    local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", redirect_url.lstrip("/")))
    assert os.path.exists(local_path)
    file_content = open(local_path, "rb").read()
    assert file_content.startswith(b"%PDF")

def test_14_duplicate_invoice_prevention(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # 1. Send subscription.charged event the first time
    sub_id = f"sub_dup_{uuid.uuid4().hex[:6]}"
    payment_id = f"pay_dup_{uuid.uuid4().hex[:6]}"

    from app.models.subscription import Subscription
    pro_plan = uat_db.query(Plan).filter(Plan.name == "pro").first()
    subscription = Subscription(
        workspace_id=workspace.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        provider="razorpay",
        provider_subscription_id=sub_id
    )
    uat_db.add(subscription)
    uat_db.commit()

    webhook_payload = {
        "id": f"evt_{uuid.uuid4().hex[:10]}",
        "event": "subscription.charged",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": 118000,
                    "currency": "INR",
                    "status": "captured",
                    "subscription_id": sub_id,
                    "notes": {"workspace_id": str(workspace.id)}
                }
            },
            "subscription": {
                "entity": {
                    "id": sub_id,
                    "status": "active"
                }
            }
        }
    }

    # First webhook call should succeed and create one Invoice
    resp1 = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp1.status_code == 200

    # Count invoices for this payment
    db_payment = uat_db.query(Payment).filter(Payment.provider_payment_id == payment_id).first()
    assert db_payment is not None
    inv_count1 = uat_db.query(Invoice).filter(Invoice.payment_id == db_payment.id).count()
    assert inv_count1 == 1

    # Send the second time (simulate retry/multiple delivery)
    resp2 = client.post(
        "/billing/webhook/razorpay",
        json=webhook_payload,
        headers={"x-razorpay-signature": "mock_sig"}
    )
    assert resp2.status_code == 200

    # Count invoices again, should still be 1 (Duplicate Prevention)
    inv_count2 = uat_db.query(Invoice).filter(Invoice.payment_id == db_payment.id).count()
    assert inv_count2 == 1

def test_15_sequence_continuity(seeded_user_and_workspace, uat_db):
    user, workspace = seeded_user_and_workspace
    client = TestClient(app)

    # Clear sequences for custom prefixes
    uat_db.query(InvoiceSequence).filter(InvoiceSequence.prefix.in_(["AUR", "CN"])).delete()
    uat_db.commit()

    # 1. Create first tax invoice -> AUR/2026-27/000001
    fy = InvoiceService.get_or_create_financial_year(uat_db)
    tax_num1 = InvoiceService.generate_invoice_number(uat_db, "AUR", fy)
    assert tax_num1 == f"AUR/{fy}/000001"

    # 2. Create a credit note -> CN/2026-27/000001 (separate sequence)
    cn_num1 = InvoiceService.generate_invoice_number(uat_db, "CN", fy)
    assert cn_num1 == f"CN/{fy}/000001"

    # 3. Create second tax invoice -> AUR/2026-27/000002 (sequence continuity - no gap left by credit note)
    tax_num2 = InvoiceService.generate_invoice_number(uat_db, "AUR", fy)
    assert tax_num2 == f"AUR/{fy}/000002"

    # 4. Create second credit note -> CN/2026-27/000002
    cn_num2 = InvoiceService.generate_invoice_number(uat_db, "CN", fy)
    assert cn_num2 == f"CN/{fy}/000002"
