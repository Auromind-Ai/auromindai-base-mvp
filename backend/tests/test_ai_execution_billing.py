import pytest
import uuid
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID

from app.database import Base
import app.models
from app.models.templates import Template
from app.models.automation import AutomationFlow, PurchasedFlowPack
from app.models.webhook_event import WebhookEvent
from app.models.workspace import Workspace, WorkspaceMember
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.token_ledger import TokenLedger
from app.models.feature_billing_rule import FeatureBillingRule
from app.services.ai.execution_service import (
    AIExecutionService,
    AIFeatureRegistry,
    AIExecutionContext,
    ExecutionMode,
    current_execution_context
)
from app.core.exceptions import BillingError, WorkspaceAccessError

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
                feature_key=AIFeatureRegistry.KNOWLEDGE_BASE_UPLOAD,
                feature_name="Knowledge Base Ingestion",
                billing_type="PER_MB",
                unit_value=1, # 1 MB
                credit_cost=Decimal("10.00"), # 10 credits per MB
                is_active=True
            )
        ]
        for rule in rules:
            db.add(rule)
        db.commit()

        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_ai_execution_context_immutable_identity():
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    ctx = AIExecutionContext(
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        billing_mode=ExecutionMode.NORMAL
    )

    # Check read-only values
    assert ctx.workspace_id == ws_id
    assert ctx.user_id == user_id
    assert ctx.feature_key == AIFeatureRegistry.CHAT
    assert ctx.billing_mode == ExecutionMode.NORMAL
    assert ctx.execution_id is not None

    # Attempt mutation and check if it raises AttributeError
    with pytest.raises(AttributeError):
        ctx.workspace_id = uuid.uuid4()

    with pytest.raises(AttributeError):
        ctx.user_id = uuid.uuid4()

    with pytest.raises(AttributeError):
        ctx.feature_key = "new-feature"

    with pytest.raises(AttributeError):
        ctx.billing_mode = ExecutionMode.NESTED

    with pytest.raises(AttributeError):
        ctx.execution_id = "exec-new"

    # Verify mutable attributes can be changed
    ctx.provider = "openai"
    ctx.model = "gpt-4o"
    assert ctx.provider == "openai"
    assert ctx.model == "gpt-4o"


@pytest.mark.anyio
async def test_context_resolution_rules(db_session):
    # Setup test workspace and member
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    workspace = Workspace(id=ws_id, name="Test WS")
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    db_session.commit()

    # Active subscription and credits recharge
    plan = db_session.query(Plan).first()
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status="active", billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    grant = TokenLedger(
        workspace_id=ws_id,
        entry_type="usage_grant",
        status="posted",
        tokens_delta=0,
        credits_delta=Decimal("100.00"),
        reference_key="initial-grant"
    )
    db_session.add(grant)
    db_session.commit()

    # Rule 1: context parameter provided -> use it directly
    custom_ctx = AIExecutionContext(
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        billing_mode=ExecutionMode.NORMAL
    )

    async def mock_fn():
        active = current_execution_context.get()
        assert active is custom_ctx
        return {
            "text": "result",
            "usage": {"input_tokens": 100, "output_tokens": 100, "total_tokens": 200},
            "provider": "groq",
            "model": "llama-3.3-70b-versatile"
        }

    await AIExecutionService.execute(
        db=db_session,
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        prompt="hello",
        context=custom_ctx,
        execute_fn=mock_fn
    )

    # Rule 2: context is None -> check ContextVar. If present, set is_nested = True and use parent
    parent_ctx = AIExecutionContext(
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        billing_mode=ExecutionMode.NORMAL
    )
    token = current_execution_context.set(parent_ctx)
    try:
        async def mock_child_fn():
            active = current_execution_context.get()
            # Child should inherit parent context directly
            assert active is parent_ctx
            return {
                "text": "child-result",
                "usage": {"input_tokens": 5, "output_tokens": 5, "total_tokens": 10},
                "provider": "groq",
                "model": "llama-3.3-70b-versatile"
            }

        # Executing without explicit context should resolve to parent ContextVar
        res = await AIExecutionService.execute(
            db=db_session,
            workspace_id=ws_id,
            user_id=user_id,
            feature_key=AIFeatureRegistry.CHAT,
            prompt="nested call",
            execute_fn=mock_child_fn
        )
        assert res["text"] == "child-result"
        # Usage should have accumulated in the parent context
        assert parent_ctx.usage["total_tokens"] == 10
    finally:
        current_execution_context.reset(token)

    # Rule 3: both are None -> create a new root context
    async def mock_root_fn():
        active = current_execution_context.get()
        assert active is not None
        assert active.workspace_id == ws_id
        assert active.billing_mode == ExecutionMode.NORMAL
        return {
            "text": "root-result",
            "usage": {"input_tokens": 10, "output_tokens": 10, "total_tokens": 20},
            "provider": "groq",
            "model": "llama-3.3-70b-versatile"
        }

    res2 = await AIExecutionService.execute(
        db=db_session,
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        prompt="hello root",
        execute_fn=mock_root_fn
    )
    assert res2["text"] == "root-result"


@pytest.mark.anyio
async def test_nested_reservation_prevention(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Nested Test WS")
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
        credits_delta=Decimal("10.00"),
        reference_key="nested-grant"
    )
    db_session.add(grant)
    db_session.commit()

    # Outer call setup
    # Make sure we track number of reservations created
    initial_reservations = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "reserved"
    ).count()

    async def run_nested_calls():
        # Inside the outer execution, verify that a reservation is created for the root
        assert db_session.query(TokenLedger).filter(
            TokenLedger.workspace_id == ws_id,
            TokenLedger.status == "reserved"
        ).count() == 1

        # Now, call a child execution
        async def run_child_1():
            return {
                "text": "child 1",
                "usage": {"input_tokens": 10, "output_tokens": 15, "total_tokens": 25},
                "provider": "mock",
                "model": "mock"
            }

        # Child execution should resolve as NESTED and skip creating another reservation
        child_res = await AIExecutionService.execute(
            db=db_session,
            workspace_id=ws_id,
            user_id=user_id,
            feature_key=AIFeatureRegistry.CHAT,
            prompt="child prompt 1",
            execute_fn=run_child_1
        )
        assert child_res["text"] == "child 1"

        # Check that reservation count remains exactly 1 (no double reservation!)
        assert db_session.query(TokenLedger).filter(
            TokenLedger.workspace_id == ws_id,
            TokenLedger.status == "reserved"
        ).count() == 1

        return {
            "text": "parent success",
            # Parent returns its own result, but usage is accumulated
            "usage": {"input_tokens": 5, "output_tokens": 5, "total_tokens": 10},
            "provider": "mock",
            "model": "mock"
        }

    # Run parent execution
    parent_res = await AIExecutionService.execute(
        db=db_session,
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        prompt="parent prompt",
        execute_fn=run_nested_calls
    )

    assert parent_res["text"] == "parent success"

    # Verify that the reservation was finalized
    finalized_count = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "posted",
        TokenLedger.entry_type == "usage"
    ).count()
    assert finalized_count == 1 # exactly one finalized transaction

    ledger_entry = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "posted",
        TokenLedger.entry_type == "usage"
    ).first()
    # Credit charged should match the total tokens of the root context
    # Root context has total usage: child 1 usage (25). Parent returned usage is ignored to prevent double-counting.
    # Feature rule for chat is 0.001 credit per token, so 25 * 0.001 = 0.025 credits.
    assert abs(float(ledger_entry.credits_delta)) == pytest.approx(0.025)


@pytest.mark.anyio
async def test_size_based_billing(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Size Ingest WS")
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
        credits_delta=Decimal("150.00"),
        reference_key="size-grant"
    )
    db_session.add(grant)
    db_session.commit()

    # Pass custom_unit_amount representing 2.5 MB file upload
    size_mb = 2.5 # 2.5 MB

    async def mock_ingest_fn():
        return {"status": "success", "chunks_created": 12}

    res = await AIExecutionService.execute(
        db=db_session,
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.KNOWLEDGE_BASE_UPLOAD,
        prompt="",
        custom_unit_amount=size_mb,
        description="Ingesting 2.5 MB file",
        execute_fn=mock_ingest_fn
    )

    assert res["status"] == "success"

    # Verify ledger entry cost matches PER_MB billing rule
    # Rule for KNOWLEDGE_BASE_UPLOAD is: unit_value = 1 (1 MB), credit_cost = 10.00 credits
    # For 2.5 MB, cost should be (2.5 / 1) * 10.0 = 25.0 credits.
    ledger_entry = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "posted",
        TokenLedger.entry_type == "usage"
    ).first()
    assert abs(float(ledger_entry.credits_delta)) == pytest.approx(25.0)


@pytest.mark.anyio
async def test_billing_bypass_and_insufficient_credits(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Bypass WS")
    db_session.add(workspace)
    db_session.commit()

    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    db_session.commit()

    plan = db_session.query(Plan).first()
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status="active", billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    # 1. With 0 credits, a normal execution should fail
    async def mock_fn():
        return {"text": "hello"}

    with pytest.raises(BillingError):
        await AIExecutionService.execute(
            db=db_session,
            workspace_id=ws_id,
            user_id=user_id,
            feature_key=AIFeatureRegistry.CHAT,
            prompt="hello",
            execute_fn=mock_fn
        )

    # 2. Under bypass billing, it should run successfully and charge 0 credits
    res = await AIExecutionService.execute(
        db=db_session,
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        prompt="hello bypass",
        bypass_billing=True,
        execute_fn=mock_fn
    )
    assert res["text"] == "hello"

    # Ledger should have no posted usage entries
    usage_entry = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "posted",
        TokenLedger.entry_type == "usage"
    ).first()
    assert usage_entry is None


@pytest.mark.anyio
async def test_execute_stream_billing(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    workspace = Workspace(id=ws_id, name="Stream WS")
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

    async def mock_stream_fn():
        # Retrieve context inside generator and add usage
        active_ctx = current_execution_context.get()
        if active_ctx:
            active_ctx.add_usage(50, 50) # 100 total tokens
        yield {"content": "hello"}
        yield {"content": " world"}

    # Run execution stream
    chunks = []
    async for chunk in AIExecutionService.execute_stream(
        db=db_session,
        workspace_id=ws_id,
        user_id=user_id,
        feature_key=AIFeatureRegistry.CHAT,
        prompt="hello stream",
        execute_fn=mock_stream_fn
    ):
        chunks.append(chunk)

    assert len(chunks) == 2
    assert chunks[0]["content"] == "hello"
    assert chunks[1]["content"] == " world"

    # Verify that the usage was finalized correctly
    ledger_entry = db_session.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_id,
        TokenLedger.status == "posted",
        TokenLedger.entry_type == "usage"
    ).first()
    assert ledger_entry is not None
    # 100 tokens * 0.001 credit per token = 0.1 credits charged
    assert abs(float(ledger_entry.credits_delta)) == pytest.approx(0.1)

