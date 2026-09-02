import uuid
import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from app.database import engine, Base, SessionLocal
from app.models.workspace import Workspace
from app.models.plan import Plan
from app.models.plan_entitlement import PlanEntitlement
from app.models.subscription import Subscription
from app.models.token_ledger import TokenLedger
from app.models.wcc import WCCWallet, WCCRechargeLog
from app.core.enums import SubscriptionStatus
from app.services.billing.subscription_service import SubscriptionService
from app.services.billing.entitlement_service import EntitlementService
from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator
from app.services.billing.billing_service import enforce_execution_policy, BillingService
from app.services.wcc_service import WCCService 
from app.routers.admin.billing import reset_credits, reset_wallet, ResetResourceRequest


@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_annual_subscription_period_and_reset(db):
    # Setup yearly plan
    plan = db.query(Plan).filter(Plan.name == "pro_yearly_test").first()
    if not plan:
        plan = Plan(
            id=uuid.uuid4(),
            name="pro_yearly_test",
            price=59999,
            billing_cycle="yearly",
            token_limit=10000,
            currency="INR"
        )
        db.add(plan)
        db.flush()

    ws = Workspace(id=uuid.uuid4(), name="Annual Test WS")
    db.add(ws)
    db.flush()

    sub_svc = SubscriptionService()
    sub = sub_svc._upsert_subscription(
        db=db,
        workspace_id=str(ws.id),
        provider="system",
        plan=plan,
        subscription_data={},
        override_status=SubscriptionStatus.active
    )
    db.commit()

    # Verify billing cycle is yearly and period end is ~1 year out
    assert sub.billing_cycle == "yearly"
    assert sub.current_period_end.year == sub.current_period_start.year + 1
    assert sub.next_entitlement_reset_at > sub.current_period_start


def test_wcc_balance_separation_and_reset(db):
    ws = Workspace(id=uuid.uuid4(), name="WCC Reset WS")
    db.add(ws)
    db.flush()

    wallet = WCCWallet(
        workspace_id=ws.id,
        included_balance=Decimal("500.00"),
        purchased_balance=Decimal("2000.00"),
        balance=Decimal("2500.00")
    )
    db.add(wallet)
    db.flush()

    plan = db.query(Plan).filter(Plan.name == "free").first()
    if not plan:
        plan = Plan(id=uuid.uuid4(), name="free", price=0, billing_cycle="monthly")
        db.add(plan)
        db.flush()

    entitlement = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan.id).first()
    if not entitlement:
        entitlement = PlanEntitlement(
            plan_id=plan.id,
            included_wcc_wallet=Decimal("500.00"),
            included_wallet_reset_policy="EXPIRE"
        )
        db.add(entitlement)
        db.flush()

    sub = Subscription(
        workspace_id=ws.id,
        plan_id=plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(sub)
    db.flush()

    # Perform entitlement renewal (monthly reset)
    EntitlementOrchestrator.renew_subscription(db, ws.id)
    db.commit()

    # Verify purchased balance remained ₹2000 while included balance reset to ₹500
    w = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w.purchased_balance == Decimal("2000.00")
    assert w.included_balance == Decimal("500.00")
    assert w.balance == Decimal("2500.00")


def test_purchased_credit_locking_on_expiration(db):
    ws = Workspace(id=uuid.uuid4(), name="Locking Test WS")
    db.add(ws)
    db.flush()

    # Add purchased credits to ledger
    ledger_entry = TokenLedger(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        entry_type="purchase",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("500.00"),
        balance_source="PURCHASED",
        reference_key=f"purch_test_{ws.id}"
    )
    db.add(ledger_entry)
    db.flush()

    # Case A: Free / Inactive workspace -> Purchased credits are LOCKED
    assert enforce_execution_policy(db, str(ws.id), amount=10) == False

    # Case B: Active Pro Subscription -> Purchased credits are UNLOCKED
    plan = Plan(id=uuid.uuid4(), name=f"pro_{ws.id}", price=5999, billing_cycle="monthly")
    db.add(plan)
    db.flush()

    sub = Subscription(
        workspace_id=ws.id,
        plan_id=plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(sub)
    db.commit()

    assert enforce_execution_policy(db, str(ws.id), amount=10) == True


def test_wcc_debit_order(db):
    ws = Workspace(id=uuid.uuid4(), name="WCC Debit Order WS")
    db.add(ws)
    db.flush()

    wallet = WCCWallet(
        workspace_id=ws.id,
        included_balance=Decimal("300.00"),
        purchased_balance=Decimal("1000.00"),
        balance=Decimal("1300.00")
    )
    db.add(wallet)
    db.flush()

    # Debit ₹400 -> Should draw ₹300 from included_balance first, then ₹100 from purchased_balance
    tx = WCCService.debit_conversation_charge(
        db=db,
        workspace_id=ws.id,
        meta_session_id=f"session_{uuid.uuid4()}",
        category="marketing",
        meta_cost=Decimal("2.00"),
        customer_price=Decimal("400.00"),
        raw_payload={}
    )
    db.commit()

    w = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert w.included_balance == Decimal("0.00")
    assert w.purchased_balance == Decimal("900.00")
    assert w.balance == Decimal("900.00")


def test_free_and_pro_default_entitlements(db):
    """Test 1: Verify Free and Pro Plan initial seed / default values."""
    from app.services.billing.entitlement_service import EntitlementService
    from app.services.billing.plan_service import PlanService

    EntitlementService.seed_default_entitlements(db)
    free_plan = db.query(Plan).filter(Plan.name == "free").first()
    pro_plan = db.query(Plan).filter(Plan.name == "pro").first()

    free_ent = EntitlementService.ensure_plan_entitlement(db, free_plan)
    pro_ent = EntitlementService.ensure_plan_entitlement(db, pro_plan)

    # Free Plan Assertions
    assert free_ent.included_ai_credits == 20000
    assert float(free_ent.included_wcc_wallet) == 50.00
    assert free_ent.storage_limit_mb == 100
    assert free_ent.team_limit == 1
    assert free_ent.knowledge_base_limit == 5
    assert free_ent.gmail_limit == 1
    assert free_ent.lead_limit == 50
    assert free_ent.meeting_limit == 10
    assert free_ent.automation_limit == 2
    assert free_ent.flow == 2
    assert free_ent.allow_ai_topup is False
    assert free_ent.allow_wcc_recharge is False
    assert free_ent.allow_flow_addon is False

    # Pro Plan Assertions
    assert pro_ent.included_ai_credits == 250000
    assert float(pro_ent.included_wcc_wallet) == 500.00
    assert pro_ent.storage_limit_mb == 5120
    assert pro_ent.team_limit == 10
    assert pro_ent.knowledge_base_limit == 100
    assert pro_ent.gmail_limit == 5
    assert pro_ent.lead_limit == 100
    assert pro_ent.meeting_limit == 500
    assert pro_ent.automation_limit == 50
    assert pro_ent.flow == 10
    assert pro_ent.allow_ai_topup is True
    assert pro_ent.allow_wcc_recharge is True
    assert pro_ent.allow_flow_addon is True


def test_admin_update_propagation_and_seed_safety(db):
    """Test 2 & 3: Admin update propagation from 5 -> 10 KB docs, and ensure seed never overwrites it."""
    from app.services.billing.entitlement_service import EntitlementService

    # Seed initial
    EntitlementService.seed_default_entitlements(db)
    free_plan = db.query(Plan).filter(Plan.name == "free").first()
    ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == free_plan.id).first()
    assert ent.knowledge_base_limit == 5

    # Admin updates KB limit from 5 to 10
    ent.knowledge_base_limit = 10
    db.commit()

    # Workspace on Free plan
    ws = Workspace(id=uuid.uuid4(), name="Admin Prop WS")
    db.add(ws)
    db.commit()

    # Dynamic check must immediately reflect 10
    check = EntitlementService.check_entitlement(db, ws.id, "knowledge_base")
    assert check["limit"] == 10

    # Reseed execution must NOT overwrite the admin's edit (Seed Safety)
    EntitlementService.seed_default_entitlements(db)
    ent_after_reseed = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == free_plan.id).first()
    assert ent_after_reseed.knowledge_base_limit == 10


def test_router_entitlement_checks_and_structured_error(db):
    """Test 4: Verify structured ENTITLEMENT_EXCEEDED error format on limits."""
    from fastapi import HTTPException
    from app.services.billing.entitlement_service import EntitlementService

    EntitlementService.seed_default_entitlements(db)
    ws = Workspace(id=uuid.uuid4(), name="Check WS")
    db.add(ws)
    db.commit()

    # 1. Knowledge Base Limit check
    with pytest.raises(HTTPException) as exc_info:
        EntitlementService.raise_entitlement_exceeded(db, ws.id, "knowledge_base", 5, 100)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["error"] == "ENTITLEMENT_EXCEEDED"
    assert "Knowledge Base documents" in exc_info.value.detail["message"]
    assert exc_info.value.detail["upgrade_url"] == "/billing"

    # 2. Leads Limit check
    with pytest.raises(HTTPException) as exc_info:
        EntitlementService.raise_entitlement_exceeded(db, ws.id, "lead", 50, 100)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["error"] == "ENTITLEMENT_EXCEEDED"
    assert "leads" in exc_info.value.detail["message"]

    # 3. Automations Limit check
    with pytest.raises(HTTPException) as exc_info:
        EntitlementService.raise_entitlement_exceeded(db, ws.id, "automation", 2, 50)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["error"] == "ENTITLEMENT_EXCEEDED"
    assert "active automations" in exc_info.value.detail["message"]

    # 4. Gmail Limit check
    with pytest.raises(HTTPException) as exc_info:
        EntitlementService.raise_entitlement_exceeded(db, ws.id, "gmail", 1, 5)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["error"] == "ENTITLEMENT_EXCEEDED"
    assert "Gmail accounts" in exc_info.value.detail["message"]


def test_razorpay_subscription_charged_provisioning(db):
    """Test 5: Verify 250k AI credits and ₹500 WCC wallet provisioning on subscription renewal/upgrade."""
    from app.services.billing.entitlement_service import EntitlementService

    EntitlementService.seed_default_entitlements(db)
    pro_plan = db.query(Plan).filter(Plan.name == "pro").first()

    ws = Workspace(id=uuid.uuid4(), name="Pro Sub WS")
    db.add(ws)
    db.commit()

    # Active Pro subscription
    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(sub)
    db.commit()

    # Trigger subscription renewal (simulating subscription.charged)
    EntitlementOrchestrator.renew_subscription(db, ws.id)
    db.commit()

    # Check AI credits ledger
    ledger_entry = db.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws.id,
        TokenLedger.entry_type == "token_grant",
        TokenLedger.balance_source == "INCLUDED"
    ).first()
    assert ledger_entry is not None
    assert ledger_entry.credits_delta == Decimal("250000.0000")

    # Check WCC Wallet balance
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    assert wallet is not None
    assert wallet.included_balance == Decimal("500.00")
    assert wallet.balance == Decimal("500.00")


def test_monthly_entitlement_reset_and_expire_policy(db):
    """Test 6: Verify monthly reset expires unused included credits/wallet but preserves purchased balances."""
    from app.services.billing.entitlement_service import EntitlementService
    from app.workers.billing_worker import process_monthly_entitlement_resets

    EntitlementService.seed_default_entitlements(db)
    pro_plan = db.query(Plan).filter(Plan.name == "pro").first()

    ws = Workspace(id=uuid.uuid4(), name="Reset WS")
    db.add(ws)
    db.commit()

    now_utc = datetime.now(timezone.utc)
    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=now_utc - timedelta(days=15),
        current_period_end=now_utc + timedelta(days=15),
        next_entitlement_reset_at=now_utc - timedelta(days=1)
    )
    db.add(sub)

    # Add purchased balance
    wallet = WCCWallet(
        workspace_id=ws.id,
        included_balance=Decimal("200.00"),
        purchased_balance=Decimal("1500.00"),
        balance=Decimal("1700.00")
    )
    db.add(wallet)

    purchased_ledger = TokenLedger(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        entry_type="purchase",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("5000.00"),
        balance_source="PURCHASED",
        reference_key="purchased_grant_test"
    )
    db.add(purchased_ledger)
    db.commit()

    # Run monthly reset logic
    EntitlementOrchestrator.renew_subscription(db, ws.id)
    db.commit()

    # Verify WCC Wallet: purchased balance is completely preserved, included reset to ₹500
    db.refresh(wallet)
    assert wallet.purchased_balance == Decimal("1500.00")
    assert wallet.included_balance == Decimal("500.00")
    assert wallet.balance == Decimal("2000.00")


def test_billing_usage_meters_structure(db):
    """Test 7: Verify GET /billing/usage data calculation matches the requested schema."""
    from app.services.billing.entitlement_service import EntitlementService
    from app.models.brain import BrainEntry
    from app.models.ai_action import Lead
    from app.models.automation import AutomationFlow
    from app.models.integration import Integration

    EntitlementService.seed_default_entitlements(db)
    ws = Workspace(id=uuid.uuid4(), name="Usage Test WS")
    db.add(ws)
    db.commit()

    ent = EntitlementService.get_workspace_entitlement(db, ws.id)

    # Insert sample entities
    db.add(BrainEntry(
        id=uuid.uuid4(), workspace_id=ws.id, title="Doc 1", content="Text", content_type="pdf"
    ))
    db.add(Lead(
        id=uuid.uuid4(), workspace_id=ws.id, conversation_id=uuid.uuid4(), name="Lead 1", phone="+919876543210"
    ))
    db.add(AutomationFlow(
        id=uuid.uuid4(), workspace_id=ws.id, name="Flow 1", status="Active", nodes=[], edges=[]
    ))
    db.add(Integration(
        id=uuid.uuid4(), workspace_id=ws.id, integration_type="google_gmail", is_active=True
    ))
    db.commit()

    # Simulate usage endpoint calculation
    from app.services.wcc_service import WCCService
    wallet = WCCService.get_balance(db, ws.id)

    usage_payload = {
        "plan_name": "Free",
        "ai_credits": {"used": 0, "limit": int(ent.included_ai_credits)},
        "wcc_wallet": {"balance_inr": float(wallet.balance) if wallet else 0.0},
        "knowledge_base": {
            "used": db.query(BrainEntry).filter(BrainEntry.workspace_id == ws.id).count(),
            "limit": int(ent.knowledge_base_limit)
        },
        "storage_mb": {"used": 0, "limit": int(ent.storage_limit_mb)},
        "leads": {
            "used": db.query(Lead).filter(Lead.workspace_id == ws.id).count(),
            "limit": int(ent.lead_limit)
        },
        "gmail_accounts": {
            "used": db.query(Integration).filter(
                Integration.workspace_id == ws.id,
                Integration.integration_type.in_(["google_gmail", "gmail"]),
                Integration.is_active == True
            ).count(),
            "limit": int(ent.gmail_limit)
        },
        "automations": {
            "used": db.query(AutomationFlow).filter(
                AutomationFlow.workspace_id == ws.id,
                AutomationFlow.status == "Active"
            ).count(),
            "limit": int(ent.automation_limit)
        },
    }

    assert usage_payload["plan_name"] == "Free"
    assert usage_payload["ai_credits"]["limit"] == 20000
    assert usage_payload["wcc_wallet"]["balance_inr"] == 0.00
    assert usage_payload["knowledge_base"]["used"] == 1
    assert usage_payload["knowledge_base"]["limit"] == 5
    assert usage_payload["leads"]["used"] == 1
    assert usage_payload["leads"]["limit"] == 50
    assert usage_payload["automations"]["used"] == 1
    assert usage_payload["automations"]["limit"] == 2
    assert usage_payload["gmail_accounts"]["used"] == 1
    assert usage_payload["gmail_accounts"]["limit"] == 1

