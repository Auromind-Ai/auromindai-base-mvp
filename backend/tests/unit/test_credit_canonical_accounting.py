"""
Unit tests for canonical AI Credit accounting and source of truth consistency.
Verifies all 9 core accounting scenarios across billing status & credit summary APIs.
"""
import uuid
import pytest
from decimal import Decimal
from datetime import datetime, timezone

from app.database import engine, Base, SessionLocal
from app.models.workspace import Workspace
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.token_ledger import TokenLedger
from app.models.wcc import WCCWallet
from app.core.enums import SubscriptionStatus
from app.services.billing.billing_service import BillingService
from app.services.billing.token_service import TokenService
from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


from app.models.plan_entitlement import PlanEntitlement


def _get_or_create_plan(db, name, included_credits=1000):
    plan = db.query(Plan).filter(Plan.name == name).first()
    if not plan:
        plan = Plan(
            id=uuid.uuid4(),
            name=name,
            price=0 if name == "free" else (4999 if name == "pro" else 19999),
            billing_cycle="monthly",
            token_limit=included_credits,
            currency="INR"
        )
        db.add(plan)
        db.flush()

        ent = PlanEntitlement(
            id=uuid.uuid4(),
            plan_id=plan.id,
            included_ai_credits=included_credits,
            allow_purchased_ai_usage=True if name != "free" else False,
            allow_purchased_wcc_usage=True if name != "free" else False,
            allow_purchased_flow_usage=True if name != "free" else False,
        )
        db.add(ent)
        db.flush()
    return plan


def _setup_workspace(db, name="Test WS"):
    ws = Workspace(id=uuid.uuid4(), name=name)
    db.add(ws)
    db.flush()
    return ws


def _log_usage(db, workspace_id, credits_used, balance_source="INCLUDED", entry_type="usage"):
    ledger = TokenLedger(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        entry_type=entry_type,
        status="posted",
        balance_source=balance_source,
        tokens_delta=-float(credits_used),
        credits_delta=-float(credits_used),
        reference_key=f"ref_{uuid.uuid4().hex}",
        description="Test usage debit",
        created_at=datetime.now(timezone.utc)
    )
    db.add(ledger)
    db.flush()
    return ledger


def _grant_purchased(db, workspace_id, credits_amount):
    ledger = TokenLedger(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        entry_type="purchased_grant",
        status="posted",
        balance_source="PURCHASED",
        tokens_delta=float(credits_amount),
        credits_delta=float(credits_amount),
        reference_key=f"grant_{uuid.uuid4().hex}",
        description="Purchased AI credits",
        created_at=datetime.now(timezone.utc)
    )
    db.add(ledger)
    db.flush()
    return ledger


# ============================================================================
# 1. Pro plan with included credits only
# ============================================================================
def test_1_pro_with_included_credits_only(db):
    ws = _setup_workspace(db, "Pro Included Only WS")
    pro_plan = _get_or_create_plan(db, "pro", 1000)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        provider="system"
    )
    db.add(sub)
    db.flush()

    _log_usage(db, ws.id, 100.0)
    db.commit()

    bs = BillingService()
    summary = bs.get_credit_summary(db=db, workspace_id=ws.id)
    assert summary["included_credits"] == 1000.0
    assert summary["included_remaining"] == 900.0
    assert summary["purchased_credits"] == 0.0
    assert summary["purchased_remaining"] == 0.0
    assert summary["credits_balance"] == 900.0
    assert summary["cycle_used"] == 100.0


# ============================================================================
# 2. Pro plan with purchased credits
# ============================================================================
def test_2_pro_with_purchased_credits(db):
    ws = _setup_workspace(db, "Pro Purchased WS")
    pro_plan = _get_or_create_plan(db, "pro", 1000)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        provider="system"
    )
    db.add(sub)

    _grant_purchased(db, ws.id, 500.0)
    db.commit()

    bs = BillingService()
    summary = bs.get_credit_summary(db=db, workspace_id=ws.id)
    assert summary["included_credits"] == 1000.0
    assert summary["included_remaining"] == 1000.0
    assert summary["purchased_credits"] == 500.0
    assert summary["purchased_remaining"] == 500.0
    assert summary["credits_balance"] == 1500.0
    assert summary["cycle_used"] == 0.0


# ============================================================================
# 3. Live screenshot scenario (997.84 included + 491.29 purchased = 1489.13)
# ============================================================================
def test_3_live_screenshot_scenario_purchased_and_included_debits(db):
    ws = _setup_workspace(db, "Screenshot Scenario WS")
    pro_plan = _get_or_create_plan(db, "pro", 1000)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        provider="system"
    )
    db.add(sub)

    _grant_purchased(db, ws.id, 500.0)
    _log_usage(db, ws.id, 8.71, balance_source="PURCHASED")
    _log_usage(db, ws.id, 2.158, balance_source="INCLUDED")
    db.commit()

    bs = BillingService()
    summary = bs.get_credit_summary(db=db, workspace_id=ws.id)
    status = bs.get_status(db=db, workspace_id=ws.id)

    assert round(summary["credits_balance"], 2) == 1489.13
    assert status["credits_balance"] == summary["credits_balance"]
    assert status["credits_remaining"] == summary["credits_balance"]


# ============================================================================
# 4. Free plan with unlocked purchased credits
# ============================================================================
def test_4_free_with_unlocked_purchased_credits(db):
    ws = _setup_workspace(db, "Free Unlocked WS")
    free_plan = _get_or_create_plan(db, "free", 0)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=free_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        provider="system"
    )
    db.add(sub)
    ws.override_allow_purchased_ai_usage = True

    _grant_purchased(db, ws.id, 300.0)
    db.commit()

    bs = BillingService()
    summary = bs.get_credit_summary(db=db, workspace_id=ws.id)
    assert summary["purchased_credits_locked"] is False
    assert summary["credits_balance"] == 300.0
    assert summary["spending_allowed"] is True


# ============================================================================
# 5. Free plan with locked purchased credits
# ============================================================================
def test_5_free_with_locked_purchased_credits(db):
    ws = _setup_workspace(db, "Free Locked WS")
    free_plan = _get_or_create_plan(db, "free", 0)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=free_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        provider="system"
    )
    db.add(sub)
    ws.override_allow_purchased_ai_usage = False

    _grant_purchased(db, ws.id, 300.0)
    db.commit()

    bs = BillingService()
    summary = bs.get_credit_summary(db=db, workspace_id=ws.id)
    assert summary["purchased_credits_locked"] is True
    assert summary["credits_balance"] == 0.0
    assert summary["spending_allowed"] is False
    assert "locked" in summary["status_message"].lower()


# ============================================================================
# 6. Pro to Enterprise upgrade
# ============================================================================
def test_6_pro_to_enterprise_upgrade(db):
    ws = _setup_workspace(db, "Upgrade WS")
    pro_plan = _get_or_create_plan(db, "pro", 1000)
    ent_plan = _get_or_create_plan(db, "enterprise", 5000)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        provider="system"
    )
    db.add(sub)
    db.flush()

    sub.plan_id = ent_plan.id
    db.commit()

    bs = BillingService()
    summary = bs.get_credit_summary(db=db, workspace_id=ws.id)
    assert summary["included_credits"] == 5000.0
    assert summary["credits_balance"] == 5000.0


# ============================================================================
# 7. Enterprise to Free downgrade
# ============================================================================
def test_7_enterprise_to_free_downgrade(db):
    ws = _setup_workspace(db, "Downgrade WS")
    ent_plan = _get_or_create_plan(db, "enterprise", 5000)
    free_plan = _get_or_create_plan(db, "free", 0)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=ent_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        provider="system"
    )
    db.add(sub)

    _grant_purchased(db, ws.id, 200.0)
    sub.plan_id = free_plan.id
    db.commit()

    bs = BillingService()
    summary = bs.get_credit_summary(db=db, workspace_id=ws.id)
    assert summary["included_credits"] == 0.0
    assert summary["purchased_remaining"] == 200.0
    assert summary["purchased_credits_locked"] is True
    assert summary["credits_balance"] == 0.0


# ============================================================================
# 8. Historical expiration entries excluded from usage counts
# ============================================================================
def test_8_historical_expiration_entries_not_counted_as_usage(db):
    ws = _setup_workspace(db, "Expiration Entry WS")
    pro_plan = _get_or_create_plan(db, "pro", 1000)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        provider="system"
    )
    db.add(sub)

    _log_usage(db, ws.id, 50.0, entry_type="usage")
    _log_usage(db, ws.id, 500.0, entry_type="token_expiration")
    db.commit()

    ts = TokenService(None)
    cycle_used = ts.get_cycle_usage(db, ws.id)
    assert cycle_used == 50.0


# ============================================================================
# 9. GET /api/billing/status & GET /api/billing/credit-summary endpoint parity
# ============================================================================
def test_9_status_and_credit_summary_endpoint_parity(db):
    ws = _setup_workspace(db, "Parity WS")
    pro_plan = _get_or_create_plan(db, "pro", 1000)

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws.id,
        plan_id=pro_plan.id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        provider="system"
    )
    db.add(sub)
    _log_usage(db, ws.id, 150.0)
    db.commit()

    bs = BillingService()
    summary = bs.get_credit_summary(db=db, workspace_id=ws.id)
    status = bs.get_status(db=db, workspace_id=ws.id)

    assert status["credits_balance"] == summary["credits_balance"]
    assert status["credits_remaining"] == summary["credits_balance"]
    assert status["cycle_used"] == summary["cycle_used"]
    assert status["quota_limit"] == summary["quota_limit"]
    assert status["included_remaining"] == summary["included_remaining"]
    assert status["purchased_remaining"] == summary["purchased_remaining"]
