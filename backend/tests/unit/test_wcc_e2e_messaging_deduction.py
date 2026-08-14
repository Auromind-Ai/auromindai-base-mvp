import uuid
import asyncio
import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.plan import Plan
from app.models.plan_entitlement import PlanEntitlement
from app.models.subscription import Subscription
from app.models.wcc import WCCWallet, WCCRateCard, WCCTransaction
from app.models.message import Message, MessageStatus, SenderType
from app.models.conversation import Conversation, ChannelType
from app.core.enums import SubscriptionStatus
from app.services.wcc_service import WCCService, InsufficientWCCBalanceError
from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator
from app.services.inbox.webhook_service import WebhookService


@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    # Seed core plans & entitlements
    free_plan = Plan(
        id=uuid.uuid4(),
        name="free",
        display_name="Free",
        price=0.0,
        billing_cycle="monthly",
        token_limit=1000,
        is_active=True,
    )
    pro_plan = Plan(
        id=uuid.uuid4(),
        name="pro",
        display_name="Professional",
        price=999.0,
        billing_cycle="monthly",
        token_limit=1000,
        is_active=True,
    )
    session.add_all([free_plan, pro_plan])
    session.flush()

    free_ent = PlanEntitlement(
        id=uuid.uuid4(),
        plan_id=free_plan.id,
        included_ai_credits=0,
        included_wcc_wallet=Decimal("0.00"),
        flow=2,
        allow_ai_topup=False,
        allow_purchased_ai_usage=False,
        allow_wcc_recharge=True,
        allow_purchased_wcc_usage=True,
        allow_flow_addon=False,
        allow_purchased_flow_usage=False,
        included_credit_reset_policy="EXPIRE",
        included_wallet_reset_policy="EXPIRE",
    )
    pro_ent = PlanEntitlement(
        id=uuid.uuid4(),
        plan_id=pro_plan.id,
        included_ai_credits=1000,
        included_wcc_wallet=Decimal("100.00"),
        flow=5,
        allow_ai_topup=True,
        allow_purchased_ai_usage=True,
        allow_wcc_recharge=True,
        allow_purchased_wcc_usage=True,
        allow_flow_addon=True,
        allow_purchased_flow_usage=True,
        included_credit_reset_policy="EXPIRE",
        included_wallet_reset_policy="EXPIRE",
    )
    session.add_all([free_ent, pro_ent])

    # Seed official WCC Rate Cards for India (IN)
    rate_cards = [
        WCCRateCard(
            id=uuid.uuid4(),
            category="marketing",
            region="IN",
            meta_cost=Decimal("1.0900"),
            customer_price=Decimal("1.2500"),
            is_active=True,
            effective_from=datetime.now(timezone.utc) - timedelta(days=10)
        ),
        WCCRateCard(
            id=uuid.uuid4(),
            category="utility",
            region="IN",
            meta_cost=Decimal("0.1450"),
            customer_price=Decimal("0.1800"),
            is_active=True,
            effective_from=datetime.now(timezone.utc) - timedelta(days=10)
        ),
        WCCRateCard(
            id=uuid.uuid4(),
            category="service",
            region="IN",
            meta_cost=Decimal("0.0000"),
            customer_price=Decimal("0.0500"),
            is_active=True,
            effective_from=datetime.now(timezone.utc) - timedelta(days=10)
        ),
        WCCRateCard(
            id=uuid.uuid4(),
            category="authentication",
            region="IN",
            meta_cost=Decimal("0.1450"),
            customer_price=Decimal("0.1800"),
            is_active=True,
            effective_from=datetime.now(timezone.utc) - timedelta(days=10)
        ),
    ]
    session.add_all(rate_cards)
    session.commit()

    yield session
    session.close()


def _create_workspace(db, name="WCC Test WS", phone_number_id="meta_phone_123"):
    user = User(id=uuid.uuid4(), email=f"{uuid.uuid4().hex[:8]}@example.com", full_name=f"User {name}")
    db.add(user)
    db.flush()

    ws = Workspace(
        id=uuid.uuid4(),
        name=name,
        plan_type="pro",
        meta_phone_number_id=phone_number_id,
        meta_access_token="test_meta_token",
        meta_waba_id="waba_123"
    )
    db.add(ws)
    db.flush()

    member = WorkspaceMember(id=uuid.uuid4(), workspace_id=ws.id, user_id=user.id, role="founder")
    db.add(member)
    db.flush()

    pro_plan = db.query(Plan).filter(Plan.name == "pro").first()
    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
        provider="system"
    )
    db.add(sub)
    db.flush()

    EntitlementOrchestrator.on_workspace_created(db, ws.id)
    db.commit()
    return ws, user


# ============================================================================
# 1. PREFLIGHT BALANCE CHECK (Passing vs Failing)
# ============================================================================
def test_wcc_preflight_balance_checks(db):
    ws, _ = _create_workspace(db, "Preflight WS")
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    wallet.included_balance = Decimal("0.00")
    wallet.purchased_balance = Decimal("50.00")
    wallet.balance = Decimal("50.00")
    db.commit()

    # Estimate for 1 marketing message = ₹1.25
    estimate = WCCService.calculate_estimate(db, ws.id, audience_size=1, category="marketing")
    assert estimate["estimated_cost"] == Decimal("1.2500")

    # Preflight with ₹50 balance -> Passes cleanly
    WCCService.check_preflight_balance(db, ws.id, estimate["estimated_cost"], overage_enabled=False)

    # Now drop balance to ₹0.50 (less than ₹1.25)
    wallet.purchased_balance = Decimal("0.50")
    wallet.balance = Decimal("0.50")
    db.commit()

    with pytest.raises(InsufficientWCCBalanceError) as exc_info:
        WCCService.check_preflight_balance(db, ws.id, estimate["estimated_cost"], overage_enabled=False)
    
    assert "Insufficient WCC balance" in str(exc_info.value)
    assert exc_info.value.required == Decimal("1.2500")
    assert exc_info.value.available == Decimal("0.50")
    assert exc_info.value.shortfall == Decimal("0.7500")


# ============================================================================
# 2. END-TO-END MESSAGE DELIVERY & ATOMIC DEBIT
# ============================================================================
def test_wcc_e2e_message_delivery_and_exact_deduction(db):
    ws, _ = _create_workspace(db, "E2E Debit WS")
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    wallet.included_balance = Decimal("10.00")
    wallet.purchased_balance = Decimal("50.00")
    wallet.balance = Decimal("60.00")
    db.commit()

    session_id = f"meta_sess_{uuid.uuid4().hex[:12]}"
    
    # WhatsApp Marketing message delivered (Customer Price = ₹1.25, Meta Cost = ₹1.09)
    tx = WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=session_id,
        category="marketing",
        meta_cost=Decimal("1.0900"),
        customer_price=Decimal("1.2500"),
        raw_payload={"wamid": "wamid_123", "status": "delivered"}
    )
    db.commit()

    # Verify transaction record
    assert tx.status == "success"
    assert tx.transaction_type == "debit"
    assert tx.category == "marketing"
    assert tx.customer_price_applied == Decimal("1.2500")
    assert tx.meta_cost_applied == Decimal("1.0900")
    assert tx.meta_session_id == session_id

    # Verify wallet balances (Debited ₹1.25 from included pool first)
    w = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w.included_balance == Decimal("8.7500")
    assert w.purchased_balance == Decimal("50.0000")
    assert w.balance == Decimal("58.7500")


# ============================================================================
# 3. SEQUENTIAL MULTI-CATEGORY MESSAGING DEPRECIATION
# ============================================================================
def test_wcc_sequential_multi_category_messaging_deductions(db):
    ws, _ = _create_workspace(db, "Sequential WS")
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    wallet.included_balance = Decimal("0.00")
    wallet.purchased_balance = Decimal("100.00")
    wallet.balance = Decimal("100.00")
    db.commit()

    # 1. Marketing message (₹1.25)
    WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=f"sess_mkt_{uuid.uuid4().hex[:8]}",
        category="marketing",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        raw_payload={}
    )
    # 2. Utility message (₹0.18)
    WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=f"sess_utl_{uuid.uuid4().hex[:8]}",
        category="utility",
        meta_cost=Decimal("0.145"),
        customer_price=Decimal("0.18"),
        raw_payload={}
    )
    # 3. Service message (₹0.05)
    WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=f"sess_srv_{uuid.uuid4().hex[:8]}",
        category="service",
        meta_cost=Decimal("0.00"),
        customer_price=Decimal("0.05"),
        raw_payload={}
    )
    # 4. Authentication message (₹0.18)
    WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=f"sess_auth_{uuid.uuid4().hex[:8]}",
        category="authentication",
        meta_cost=Decimal("0.145"),
        customer_price=Decimal("0.18"),
        raw_payload={}
    )
    db.commit()

    # Starting 100.00 - 1.25 - 0.18 - 0.05 - 0.18 = 98.34
    w = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w.balance == Decimal("98.3400")
    assert w.purchased_balance == Decimal("98.3400")

    # Verify 4 transactions recorded
    tx_count = db.query(WCCTransaction).filter(WCCTransaction.workspace_id == ws.id).count()
    assert tx_count == 4


# ============================================================================
# 4. DEBIT ORDER: INCLUDED POOL EXHAUSTION → THEN PURCHASED
# ============================================================================
def test_wcc_debit_order_included_then_purchased(db):
    ws, _ = _create_workspace(db, "Split Debit WS")
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    wallet.included_balance = Decimal("1.00")
    wallet.purchased_balance = Decimal("20.00")
    wallet.balance = Decimal("21.00")
    db.commit()

    # Message cost = ₹1.25 -> ₹1.00 drawn from included, ₹0.25 drawn from purchased
    WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=f"sess_split_{uuid.uuid4().hex[:8]}",
        category="marketing",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        raw_payload={}
    )
    db.commit()

    w = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w.included_balance == Decimal("0.0000")
    assert w.purchased_balance == Decimal("19.7500")
    assert w.balance == Decimal("19.7500")


# ============================================================================
# 5. WEBHOOK IDEMPOTENCY (Duplicate status callbacks never double-debit)
# ============================================================================
def test_wcc_webhook_idempotency_prevents_duplicate_deduction(db):
    ws, _ = _create_workspace(db, "Idempotency WS")
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    wallet.included_balance = Decimal("0.00")
    wallet.purchased_balance = Decimal("50.00")
    wallet.balance = Decimal("50.00")
    db.commit()

    session_id = "sess_idem_unique_123"

    # First webhook callback -> Debits ₹1.25
    tx1 = WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=session_id,
        category="marketing",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        raw_payload={"attempt": 1}
    )
    db.commit()

    w1 = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w1.balance == Decimal("48.7500")

    # Duplicate webhook callback for same session -> Must NOT debit again
    tx2 = WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=session_id,
        category="marketing",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        raw_payload={"attempt": 2}
    )
    db.commit()

    assert tx1.id == tx2.id
    w2 = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w2.balance == Decimal("48.7500")  # Still 48.75!


# ============================================================================
# 6. FREE PLAN LOCKED VS UNLOCKED USAGE
# ============================================================================
def test_wcc_free_plan_permission_locking_and_unlocking(db):
    ws, _ = _create_workspace(db, "Free Lock WS")
    free_plan = db.query(Plan).filter(Plan.name == "free").first()
    
    # Switch subscription to Free
    sub = db.query(Subscription).filter(Subscription.workspace_id == ws.id).first()
    sub.plan_id = free_plan.id
    sub.status = SubscriptionStatus.active
    db.flush()

    # Set purchased wallet balance to ₹50
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    wallet.included_balance = Decimal("0.00")
    wallet.purchased_balance = Decimal("50.00")
    wallet.balance = Decimal("50.00")
    db.commit()

    # Workspace override locks WCC on Free
    ws.override_allow_purchased_wcc_usage = False
    db.commit()

    with pytest.raises(InsufficientWCCBalanceError):
        WCCService.debit_conversation_charge(
            db=db,
            workspace_id=ws.id,
            meta_session_id=f"sess_locked_{uuid.uuid4().hex[:8]}",
            category="marketing",
            meta_cost=Decimal("1.09"),
            customer_price=Decimal("1.25"),
            raw_payload={}
        )

    # Wallet balance remains strictly intact at ₹50
    w_locked = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w_locked.balance == Decimal("50.00")

    # Admin Unlocks WCC via override
    ws.override_allow_purchased_wcc_usage = True
    db.commit()

    # Now debit succeeds
    tx = WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=f"sess_unlocked_{uuid.uuid4().hex[:8]}",
        category="marketing",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        raw_payload={}
    )
    db.commit()

    assert tx.status == "success"
    w_unlocked = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w_unlocked.balance == Decimal("48.7500")


# ============================================================================
# 7. FULL META WHATSAPP WEBHOOK PAYLOAD SIMULATION
# ============================================================================
def test_full_meta_whatsapp_webhook_billing_integration(db):
    phone_id = f"meta_phone_{uuid.uuid4().hex[:8]}"
    ws, _ = _create_workspace(db, "Webhook WS", phone_number_id=phone_id)

    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    wallet.included_balance = Decimal("0.00")
    wallet.purchased_balance = Decimal("100.00")
    wallet.balance = Decimal("100.00")

    # Create Conversation and Outbound Message
    conv = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        channel=ChannelType.WHATSAPP,
        phone="+919876543210"
    )
    db.add(conv)
    db.flush()

    wamid = f"wamid.HBgL{uuid.uuid4().hex}"
    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        sender_type=SenderType.USER,
        status=MessageStatus.SENT,
        content="Welcome to our store!",
        external_id=wamid
    )
    db.add(msg)
    db.commit()

    meta_session_id = f"meta_conv_{uuid.uuid4().hex[:12]}"

    # Meta delivery status webhook payload
    webhook_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WABA_ID_123",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "+919999999999",
                                "phone_number_id": phone_id
                            },
                            "statuses": [
                                {
                                    "id": wamid,
                                    "status": "delivered",
                                    "timestamp": "1700000000",
                                    "recipient_id": "919876543210",
                                    "conversation": {
                                        "id": meta_session_id,
                                        "origin": {"type": "marketing"}
                                    },
                                    "pricing": {
                                        "billable": True,
                                        "category": "marketing",
                                        "pricing_model": "CBP"
                                    }
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }

    # Process webhook asynchronously
    asyncio.run(WebhookService.handle_meta_whatsapp_webhook(webhook_payload, db))

    # Verify Message status was updated to DELIVERED
    updated_msg = db.query(Message).filter(Message.id == msg.id).first()
    assert updated_msg.status == MessageStatus.DELIVERED

    # Verify WCC Wallet was debited by ₹1.25 (Marketing rate for IN)
    updated_wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert updated_wallet.balance == Decimal("98.7500")

    # Verify WCCTransaction was recorded
    tx = db.query(WCCTransaction).filter(
        WCCTransaction.workspace_id == ws.id,
        WCCTransaction.meta_session_id == meta_session_id
    ).first()
    assert tx is not None
    assert tx.category == "marketing"
    assert tx.customer_price_applied == Decimal("1.2500")
    assert tx.status == "success"
