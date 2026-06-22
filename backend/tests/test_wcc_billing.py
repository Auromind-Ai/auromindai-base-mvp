import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError, DataError

from app.database import Base
import app.models
from app.models.templates import Template
from app.models.automation import AutomationFlow
from app.models.webhook_event import WebhookEvent

from app.models.wcc import WCCWallet, WCCRateCard, WCCTransaction, WCCRechargeLog
from app.services.wcc_service import WCCService

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(32)"

# SQLite in-memory database is excellent for unit testing core logic & constraints
# Note: SQLite CheckConstraints behave slightly differently from PostgreSQL, but we can verify core behavior.
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_rate_card_constraints(db_session):
    """
    Verify database constraints reject invalid customer_price <= meta_cost, negative values.
    """
    # 1. Negative cost should fail
    invalid_card_1 = WCCRateCard(
        category="marketing",
        region="IN",
        meta_cost=Decimal("-1.00"),
        customer_price=Decimal("1.25"),
        is_active=True
    )
    db_session.add(invalid_card_1)
    with pytest.raises((IntegrityError, ValueError, DataError)):
        db_session.commit()
    db_session.rollback()

    # 2. Customer price less than meta cost should fail
    invalid_card_2 = WCCRateCard(
        category="marketing",
        region="IN",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.00"),
        is_active=True
    )
    db_session.add(invalid_card_2)
    with pytest.raises((IntegrityError, ValueError, DataError)):
        db_session.commit()
    db_session.rollback()

    # 3. Customer price <= 0 should fail
    invalid_card_3 = WCCRateCard(
        category="marketing",
        region="IN",
        meta_cost=Decimal("0.00"),
        customer_price=Decimal("0.00"),
        is_active=True
    )
    db_session.add(invalid_card_3)
    with pytest.raises((IntegrityError, ValueError, DataError)):
        db_session.commit()
    db_session.rollback()

    # 4. Valid card succeeds
    valid_card = WCCRateCard(
        category="marketing",
        region="IN",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        is_active=True
    )
    db_session.add(valid_card)
    db_session.commit()
    assert valid_card.id is not None


def test_active_rate_lookup_and_overlaps(db_session):
    """
    Verify active rate lookup logic retrieves correct rates, supports scheduled rates, and rejects overlaps.
    """
    now = datetime.now(timezone.utc)
    
    # Create active card
    card_active = WCCRateCard(
        category="utility",
        region="IN",
        meta_cost=Decimal("0.145"),
        customer_price=Decimal("0.18"),
        effective_from=now - timedelta(days=2),
        effective_to=now + timedelta(days=2),
        is_active=True
    )
    db_session.add(card_active)
    db_session.commit()

    # Verify lookup succeeds
    rate = WCCService.get_active_rate(db_session, "utility", "IN")
    assert rate.customer_price == Decimal("0.18")

    # Create overlapping active card
    card_overlap = WCCRateCard(
        category="utility",
        region="IN",
        meta_cost=Decimal("0.145"),
        customer_price=Decimal("0.20"),
        effective_from=now - timedelta(days=1),
        effective_to=now + timedelta(days=3),
        is_active=True
    )
    db_session.add(card_overlap)
    db_session.commit()

    # Lookup must fail due to overlap validation
    with pytest.raises(ValueError) as exc:
        WCCService.get_active_rate(db_session, "utility", "IN")
    assert "Overlapping rate cards found" in str(exc.value)


def test_calculate_estimate(db_session):
    """
    Verify estimates use Customer Price and return split pricing details.
    """
    now = datetime.now(timezone.utc)
    card = WCCRateCard(
        category="marketing",
        region="IN",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        effective_from=now - timedelta(days=1),
        is_active=True
    )
    db_session.add(card)
    db_session.commit()

    # Pre-funded wallet
    ws_id = uuid.UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")
    wallet = WCCWallet(workspace_id=ws_id, balance=Decimal("1500.00"), currency="INR")
    db_session.add(wallet)
    db_session.commit()

    # Estimate for 1000 users
    res = WCCService.calculate_estimate(db_session, ws_id, 1000, "marketing")
    assert res["estimated_cost"] == Decimal("1250.00") # 1000 * 1.25
    assert res["estimated_meta_cost"] == Decimal("1090.00") # 1000 * 1.09
    assert res["balance_sufficient"] is True


def test_debit_conversation_charge_and_idempotency(db_session):
    """
    Verify wallet deductions use Customer Price, record split rates, and remain idempotent under duplicates.
    """
    now = datetime.now(timezone.utc)
    ws_id = uuid.UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")
    
    # Pre-fund wallet
    wallet = WCCWallet(workspace_id=ws_id, balance=Decimal("500.00"), currency="INR")
    db_session.add(wallet)
    db_session.commit()

    # Debit transaction
    meta_sess = "session_whatsapp_xyz"
    tx1 = WCCService.debit_conversation_charge(
        db=db_session,
        workspace_id=ws_id,
        meta_session_id=meta_sess,
        category="marketing",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        raw_payload={"meta": "data"}
    )
    db_session.commit()

    # Check database state
    db_session.refresh(wallet)
    assert wallet.balance == Decimal("498.75") # 500 - 1.25
    assert tx1.customer_price_applied == Decimal("1.25")
    assert tx1.meta_cost_applied == Decimal("1.09")
    assert tx1.pricing_version == 2

    # Verify idempotency: resending the same conversation ID must not deduct again
    tx2 = WCCService.debit_conversation_charge(
        db=db_session,
        workspace_id=ws_id,
        meta_session_id=meta_sess,
        category="marketing",
        meta_cost=Decimal("1.09"),
        customer_price=Decimal("1.25"),
        raw_payload={"meta": "data"}
    )
    db_session.commit()

    db_session.refresh(wallet)
    assert wallet.balance == Decimal("498.75") # Still 498.75 (no double debit)
    assert tx1.id == tx2.id # Same transaction record returned
