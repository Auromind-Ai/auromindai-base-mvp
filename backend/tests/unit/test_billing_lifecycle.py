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
from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator
from app.services.billing.billing_service import enforce_execution_policy
from app.services.wcc_service import WCCService


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
