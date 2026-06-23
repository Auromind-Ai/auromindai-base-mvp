import pytest
import uuid
import json
import asyncio
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID

from app.database import Base
from app.models.workspace import Workspace, WorkspaceMember
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.token_ledger import TokenLedger
from app.models.plan_entitlement import PlanEntitlement
from app.models.feature_billing_rule import FeatureBillingRule
from app.models.wcc import WCCWallet
from app.services.ai.execution_service import (
    AIExecutionService,
    AIFeatureRegistry,
    AIExecutionContext,
    ExecutionMode,
    current_execution_context
)
from app.services.billing.billing_service import BillingService
from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator
from app.services.wcc_service import WCCService
from app.core.exceptions import BillingError

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(32)"

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    # Remove PostgreSQL-specific partial unique indexes for SQLite compatibility
    indexes_to_remove = [
        idx for idx in Subscription.__table__.indexes 
        if idx.name in ("uq_active_subscription", "uq_provider_subscription")
    ]
    for idx in indexes_to_remove:
        Subscription.__table__.indexes.remove(idx)

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Create a default plan
        plan = Plan(
            id=uuid.uuid4(),
            name="Pro Plan",
            price=1000,
            billing_cycle="monthly",
            is_active=True
        )
        db.add(plan)
        db.commit()

        # Seed billing rules
        rules = [
            FeatureBillingRule(
                id=uuid.uuid4(),
                feature_key=AIFeatureRegistry.CHAT,
                feature_name="AI Chat",
                billing_type="TOKEN",
                unit_value=1,
                credit_cost=Decimal("0.001"), # 0.001 credit per token
                is_active=True
            ),
            FeatureBillingRule(
                id=uuid.uuid4(),
                feature_key=AIFeatureRegistry.EMAIL_PROCESSING,
                feature_name="Email Processing",
                billing_type="FLAT",
                unit_value=1,
                credit_cost=Decimal("3.2"),
                is_active=True
            ),
            FeatureBillingRule(
                id=uuid.uuid4(),
                feature_key=AIFeatureRegistry.EMAIL_CLASSIFICATION,
                feature_name="Email Classification",
                billing_type="TOKEN",
                unit_value=1000,
                credit_cost=Decimal("0.2"),
                is_active=True
            ),
            FeatureBillingRule(
                id=uuid.uuid4(),
                feature_key=AIFeatureRegistry.EMAIL_SUMMARY,
                feature_name="Email Summary",
                billing_type="TOKEN",
                unit_value=1000,
                credit_cost=Decimal("0.5"),
                is_active=True
            ),
            FeatureBillingRule(
                id=uuid.uuid4(),
                feature_key=AIFeatureRegistry.EMAIL_ENTITY_EXTRACTION,
                feature_name="Email Entity Extraction",
                billing_type="TOKEN",
                unit_value=1000,
                credit_cost=Decimal("0.5"),
                is_active=True
            ),
            FeatureBillingRule(
                id=uuid.uuid4(),
                feature_key=AIFeatureRegistry.TEMPLATE,
                feature_name="gmail_draft",
                billing_type="TOKEN",
                unit_value=1000,
                credit_cost=Decimal("1.0"),
                is_active=True
            ),
        ]
        for rule in rules:
            db.add(rule)
        db.commit()

        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.mark.anyio
async def test_execute_stream_exceptions(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Stream Test WS")
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    db_session.commit()

    plan = db_session.query(Plan).first()
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status="active", billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    grant = TokenLedger(
        workspace_id=ws_id,
        entry_type="usage_grant",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("50.00"),
        reference_key="stream-grant"
    )
    db_session.add(grant)
    db_session.commit()

    # Test CancelledError propagation and reservation release
    async def mock_stream_cancelled():
        raise asyncio.CancelledError()
        yield {"content": "not reached"}

    with pytest.raises(asyncio.CancelledError):
        async for _ in AIExecutionService.execute_stream(
            db=db_session,
            workspace_id=ws_id,
            user_id=user_id,
            feature_key=AIFeatureRegistry.CHAT,
            prompt="hello cancellation",
            execute_fn=mock_stream_cancelled
        ):
            pass

    # Verify that the reservation was released
    released_entry = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "released"
    ).first()
    assert released_entry is not None
    assert "Stream cancelled: CancelledError" in released_entry.description

    # Test GeneratorExit propagation and reservation release
    async def mock_stream_exit():
        raise GeneratorExit()
        yield {"content": "not reached"}

    with pytest.raises(GeneratorExit):
        async for _ in AIExecutionService.execute_stream(
            db=db_session,
            workspace_id=ws_id,
            user_id=user_id,
            feature_key=AIFeatureRegistry.CHAT,
            prompt="hello exit",
            execute_fn=mock_stream_exit
        ):
            pass

    released_exit = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "released"
    ).all()
    assert len(released_exit) >= 2


@pytest.mark.anyio
async def test_single_billing_transaction_email_pipeline_success(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Email Processing WS")
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    db_session.commit()

    plan = db_session.query(Plan).first()
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status="active", billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    grant = TokenLedger(
        workspace_id=ws_id,
        entry_type="usage_grant",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("50.00"),
        reference_key="email-grant"
    )
    db_session.add(grant)
    db_session.commit()

    from app.services.email_automation.email_mcp_service import EmailMCPService
    from app.services.agentic_rag.vector_store_service import VectorStoreService

    mock_responses = [
        # classify_category
        {"content": '{"category": "invoice", "confidence": 0.9}', "text": '{"category": "invoice", "confidence": 0.9}', "usage": {"input_tokens": 100, "output_tokens": 50, "total_tokens": 150}},
        # extract_entities
        {"content": '{"invoice_id": "INV-100", "amount": "100.00", "currency": "USD", "due_date": "2026-07-01"}', "text": '{"invoice_id": "INV-100", "amount": "100.00", "currency": "USD", "due_date": "2026-07-01"}', "usage": {"input_tokens": 150, "output_tokens": 80, "total_tokens": 230}},
        # generate_summary
        {"content": "Invoice for $100.00 due on 2026-07-01", "text": "Invoice for $100.00 due on 2026-07-01", "usage": {"input_tokens": 100, "output_tokens": 30, "total_tokens": 130}},
        # generate_suggested_reply
        {"content": "Thank you for the invoice. It will be paid by 2026-07-01.", "text": "Thank you for the invoice. It will be paid by 2026-07-01.", "usage": {"input_tokens": 200, "output_tokens": 100, "total_tokens": 300}}
    ]

    response_iter = iter(mock_responses)

    async def mock_router_generate(self_router, prompt, model="auto", media_data=None, mime_type=None):
        return next(response_iter)

    from app.services.ai.llm_router import LLMRouter
    original_generate = LLMRouter.generate
    LLMRouter.generate = mock_router_generate

    original_search = VectorStoreService.search
    VectorStoreService.search = lambda *args, **kwargs: []

    try:
        service = EmailMCPService()
        email_data = {"subject": "Invoice INV-100", "body": "Please pay $100 by 2026-07-01", "from": "billing@client.com", "thread_id": "thread-123"}
        decision = await service.process_email(db_session, ws_id, email_data)

        assert decision is not None
        assert decision["category"] == "invoice"
        assert decision["entities"]["invoice_id"] == "INV-100"

        # Verify that only ONE usage transaction was finalized
        usages = db_session.query(TokenLedger).filter(
            TokenLedger.workspace_id == ws_id,
            TokenLedger.entry_type == "usage",
            TokenLedger.status == "posted"
        ).all()

        assert len(usages) == 1
        usage_ledger = usages[0]
        
        # Verify children tokens sum: 150 + 230 + 130 + 300 = 810 tokens
        assert usage_ledger.tokens_used == 810

        # Verify cost calculation:
        # 1. email_classification: 150 tokens -> 150 * (0.2 / 1000) = 0.03 credits
        # 2. email_entity_extraction: 230 tokens -> 230 * (0.5 / 1000) = 0.115 credits
        # 3. email_summary: 130 tokens -> 130 * (0.5 / 1000) = 0.065 credits
        # 4. gmail_draft: 300 tokens -> 300 * (1.0 / 1000) = 0.3 credits
        # Total cost = 0.03 + 0.115 + 0.065 + 0.3 = 0.51 credits
        assert abs(float(usage_ledger.credits_delta)) == pytest.approx(0.51)

    finally:
        LLMRouter.generate = original_generate
        VectorStoreService.search = original_search


@pytest.mark.anyio
async def test_single_billing_transaction_email_pipeline_failure(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Email Processing WS Failure")
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    db_session.commit()

    plan = db_session.query(Plan).first()
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status="active", billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    grant = TokenLedger(
        workspace_id=ws_id,
        entry_type="usage_grant",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("50.00"),
        reference_key="email-grant-fail"
    )
    db_session.add(grant)
    db_session.commit()

    from app.services.email_automation.email_mcp_service import EmailMCPService
    from app.services.agentic_rag.vector_store_service import VectorStoreService

    async def mock_router_generate_fail(self_router, prompt, model="auto", media_data=None, mime_type=None):
        raise ValueError("Simulated LLM router error")

    from app.services.ai.llm_router import LLMRouter
    original_generate = LLMRouter.generate
    LLMRouter.generate = mock_router_generate_fail

    original_search = VectorStoreService.search
    VectorStoreService.search = lambda *args, **kwargs: []

    try:
        service = EmailMCPService()
        email_data = {"subject": "Invoice INV-100", "body": "Please pay $100 by 2026-07-01", "from": "billing@client.com", "thread_id": "thread-123"}
        decision = await service.process_email(db_session, ws_id, email_data)

        # The email pipeline fails gracefully on child exceptions, returning the fallback decision
        assert decision is not None
        assert decision["category"] == "other"

        # Verify that only ONE usage transaction was finalized, charging 0 credits/tokens
        usages = db_session.query(TokenLedger).filter(
            TokenLedger.workspace_id == ws_id,
            TokenLedger.entry_type == "usage",
            TokenLedger.status == "posted"
        ).all()
        assert len(usages) == 1
        assert usages[0].tokens_used == 0
        assert float(usages[0].credits_delta) == 0.0

    finally:
        LLMRouter.generate = original_generate
        VectorStoreService.search = original_search


@pytest.mark.anyio
async def test_billing_idempotency_protection(db_session):
    from sqlalchemy.exc import IntegrityError
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Idempotency WS")
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    db_session.commit()

    plan = db_session.query(Plan).first()
    sub = Subscription(id=uuid.uuid4(), workspace_id=ws_id, plan_id=plan.id, status="active", billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    billing_service = BillingService()
    token_service = billing_service.token_service
    
    ref_key = "ai-exec:unique-exec-id-123"
    
    grant = TokenLedger(
        workspace_id=ws_id,
        entry_type="usage_grant",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("100.00"),
        balance_source="INCLUDED",
        reference_key="idempotency-grant"
    )
    db_session.add(grant)
    db_session.commit()

    # Reserve credits
    res = token_service.reserve_feature_credits(
        db=db_session,
        workspace_id=ws_id,
        feature_key=AIFeatureRegistry.CHAT,
        unit_amount=1000,
        reference_key=ref_key,
        description="Idempotency test reservation"
    )
    assert res is not None
    db_session.commit()

    # Finalize billing first time
    token_service.finalize_feature_credits(
        db=db_session,
        reservation_id=res.id,
        actual_units=1000
    )
    db_session.commit()

    # Verify usage ledger is posted
    usages = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.entry_type == "usage",
        TokenLedger.status == "posted"
    ).all()
    assert len(usages) == 1
    assert abs(float(usages[0].credits_delta)) == pytest.approx(1.0)

    # Call finalizer via execute flow context again to test app-level guard
    ctx = AIExecutionContext(
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        execution_id="unique-exec-id-123",
        reservation_id=str(res.id)
    )
    
    async def mock_fn():
        return {"status": "success"}

    res2 = await AIExecutionService.execute(
        db=db_session,
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        prompt="hello again",
        context=ctx,
        execute_fn=mock_fn
    )
    
    # Check that there is still exactly one usage record
    usages_after = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.entry_type == "usage",
        TokenLedger.status == "posted"
    ).all()
    assert len(usages_after) == 1

    # Database-level UniqueConstraint check:
    dup_ledger = TokenLedger(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        subscription_id=sub.id,
        entry_type="usage",
        status="posted",
        tokens_delta=-1000,
        credits_delta=-Decimal("1.00"),
        reference_key=f"{ref_key}:INCLUDED"
    )
    db_session.add(dup_ledger)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


@pytest.mark.anyio
async def test_plan_upgrade_credit_expiration(db_session):
    ws_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Upgrade Expiration WS")
    db_session.add(workspace)
    db_session.commit()

    old_plan = Plan(
        id=uuid.uuid4(),
        name="Basic Plan",
        price=500,
        billing_cycle="monthly",
        is_active=True
    )
    new_plan = Plan(
        id=uuid.uuid4(),
        name="Premium Plan",
        price=1500,
        billing_cycle="monthly",
        is_active=True
    )
    db_session.add(old_plan)
    db_session.add(new_plan)
    db_session.commit()

    old_entitlement = PlanEntitlement(
        plan_id=old_plan.id,
        included_ai_credits=50,
        included_wcc_wallet=Decimal("20.00"),
        included_credit_reset_policy="EXPIRE",
        included_wallet_reset_policy="EXPIRE"
    )
    new_entitlement = PlanEntitlement(
        plan_id=new_plan.id,
        included_ai_credits=150,
        included_wcc_wallet=Decimal("50.00"),
        included_credit_reset_policy="EXPIRE",
        included_wallet_reset_policy="EXPIRE"
    )
    db_session.add(old_entitlement)
    db_session.add(new_entitlement)
    db_session.commit()

    old_sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        plan_id=old_plan.id,
        status="active",
        billing_cycle="monthly"
    )
    db_session.add(old_sub)
    db_session.commit()

    wallet = WCCWallet(workspace_id=ws_id, balance=Decimal("15.50"))
    db_session.add(wallet)
    db_session.commit()

    old_grant = TokenLedger(
        workspace_id=ws_id,
        subscription_id=old_sub.id,
        entry_type="token_grant",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("50.00"),
        balance_source="INCLUDED",
        reference_key="old-grant"
    )
    db_session.add(old_grant)
    db_session.commit()

    included_pool = db_session.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "posted",
        TokenLedger.balance_source == "INCLUDED"
    ).scalar()
    assert float(included_pool) == 50.0

    current_wcc = WCCService.get_balance(db_session, ws_id)
    assert float(current_wcc.balance) == 15.50

    # Upgrade subscription plan
    EntitlementOrchestrator._change_subscription_plan(db_session, ws_id, new_plan.id)
    db_session.commit()

    db_session.refresh(old_sub)
    assert old_sub.status == "cancelled"

    new_sub = db_session.query(Subscription).filter(
        Subscription.workspace_id == ws_id,
        Subscription.status == "active"
    ).first()
    assert new_sub is not None
    assert new_sub.plan_id == new_plan.id

    net_credits = db_session.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "posted",
        TokenLedger.balance_source == "INCLUDED"
    ).scalar()
    assert float(net_credits) == 150.0

    expiration_ledger = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.entry_type == "token_expiration"
    ).first()
    assert expiration_ledger is not None
    assert float(expiration_ledger.credits_delta) == -50.0

    db_session.refresh(current_wcc)
    assert float(current_wcc.balance) == 50.00


@pytest.mark.anyio
async def test_free_plan_token_reporting(db_session):
    ws_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Free Plan WS")
    db_session.add(workspace)
    db_session.commit()

    free_plan = Plan(
        id=uuid.uuid4(),
        name="free",
        price=0,
        billing_cycle="monthly",
        token_limit=10000,
        is_active=True
    )
    db_session.add(free_plan)
    db_session.commit()

    now = datetime.now(timezone.utc)
    
    usage1 = TokenLedger(
        workspace_id=ws_id,
        entry_type="usage",
        status="posted",
        tokens_delta=-1500,
        credits_delta=Decimal("0.00"),
        tokens_used=1500,
        reference_key="usage-ref-1",
        created_at=now
    )
    usage2 = TokenLedger(
        workspace_id=ws_id,
        entry_type="usage",
        status="posted",
        tokens_delta=-2000,
        credits_delta=Decimal("0.00"),
        tokens_used=2000,
        reference_key="usage-ref-2",
        created_at=now
    )
    db_session.add(usage1)
    db_session.add(usage2)
    db_session.commit()

    billing_service = BillingService()
    status = billing_service.check_token_limit(db_session, ws_id)

    assert status.token_limit == 10000
    assert status.tokens_used == 3500
    assert status.overage_tokens == 0
    assert status.within_limit is True


@pytest.mark.anyio
async def test_stress_concurrent_streams(db_session):
    import random
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Stress WS")
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    db_session.commit()

    plan = db_session.query(Plan).first()
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status="active", billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    grant = TokenLedger(
        workspace_id=ws_id,
        entry_type="usage_grant",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("1000.00"),
        reference_key="stress-grant"
    )
    db_session.add(grant)
    db_session.commit()

    async def run_one_stream(idx):
        outcome = random.choice(["success", "cancel", "error"])
        
        async def mock_stream_stress():
            yield {"content": "chunk"}
            if outcome == "cancel":
                raise asyncio.CancelledError()
            elif outcome == "error":
                raise ValueError("Stream failure")
            yield {"content": "done"}

        try:
            chunks = []
            async for chunk in AIExecutionService.execute_stream(
                db=db_session,
                workspace_id=ws_id,
                user_id=user_id,
                feature_key=AIFeatureRegistry.CHAT,
                prompt=f"stress {idx}",
                execute_fn=mock_stream_stress
            ):
                chunks.append(chunk)
            return "success", len(chunks)
        except asyncio.CancelledError:
            return "cancel", 0
        except Exception:
            return "error", 0

    tasks = [run_one_stream(i) for i in range(100)]
    results = await asyncio.gather(*tasks)

    successes = sum(1 for r in results if r[0] == "success")
    cancels = sum(1 for r in results if r[0] == "cancel")
    errors = sum(1 for r in results if r[0] == "error")

    print(f"Stress test outcomes -> Successes: {successes}, Cancels: {cancels}, Errors: {errors}")

    pending_reservations = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "pending"
    ).all()
    
    assert len(pending_reservations) == 0, f"Found {len(pending_reservations)} leaked pending reservations!"
