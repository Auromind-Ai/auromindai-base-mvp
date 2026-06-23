import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from fastapi import HTTPException

from app.database import Base
import app.models
from app.models.workspace import Workspace, WorkspaceMember
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.plan_entitlement import PlanEntitlement
from app.models.automation import AutomationFlow, PurchasedFlowPack
from app.models.webhook_event import WebhookEvent
from app.models.templates import Template
from app.core.enums import SubscriptionStatus
from app.routers.automation import save_flow, delete_flow
from app.schemas.automation import FlowSaveRequest

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(32)"

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class MockUser:
    def __init__(self, user_id: uuid.UUID):
        self.id = user_id

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.mark.anyio
async def test_user_below_quota_succeeds(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()

    # 1. Seed Plan & Entitlement (Flow limit = 5)
    plan = Plan(id=uuid.uuid4(), name="starter", price=0, billing_cycle="monthly", is_active=True)
    db_session.add(plan)
    db_session.commit()

    ent = PlanEntitlement(
        plan_id=plan.id,
        flow=5,
        included_ai_credits=0,
        included_wcc_wallet=Decimal("0.00"),
        storage_limit_mb=500,
        team_limit=2,
        knowledge_base_limit=5,
        gmail_limit=1,
        lead_limit=100,
        meeting_limit=10,
        automation_limit=2
    )
    db_session.add(ent)

    workspace = Workspace(id=ws_id, name="Test WS")
    db_session.add(workspace)
    
    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status=SubscriptionStatus.active, billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    # 2. Save flow below limit
    req = FlowSaveRequest(
        name="Test Flow",
        trigger_type="incoming_message",
        nodes=[
            {"id": "node_trigger", "type": "trigger", "label": "Start"},
            {"id": "node_action", "type": "action", "label": "Action", "config": {"type": "send_msg", "message_type": "text", "text": "hello"}}
        ],
        edges=[
            {"id": "edge_1", "source": "node_trigger", "target": "node_action"}
        ],
        status="Draft"
    )

    user = MockUser(user_id)
    flow = await save_flow(request=req, db=db_session, current_user=user)
    assert flow.id is not None
    assert flow.name == "Test Flow"


@pytest.mark.anyio
async def test_user_exactly_at_quota_blocked(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()

    plan = Plan(id=uuid.uuid4(), name="starter", price=0, billing_cycle="monthly", is_active=True)
    db_session.add(plan)
    
    ent = PlanEntitlement(
        plan_id=plan.id,
        flow=2, # limit is 2
        included_ai_credits=0,
        included_wcc_wallet=Decimal("0.00"),
        storage_limit_mb=500,
        team_limit=2,
        knowledge_base_limit=5,
        gmail_limit=1,
        lead_limit=100,
        meeting_limit=10,
        automation_limit=2
    )
    db_session.add(ent)
    workspace = Workspace(id=ws_id, name="Test WS")
    db_session.add(workspace)
    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status=SubscriptionStatus.active, billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    user = MockUser(user_id)

    # Save first flow
    req1 = FlowSaveRequest(
        name="Flow 1",
        trigger_type="incoming_message",
        nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}],
        edges=[{"id": "e", "source": "t", "target": "a"}],
        status="Draft"
    )
    await save_flow(request=req1, db=db_session, current_user=user)

    # Save second flow
    req2 = FlowSaveRequest(
        name="Flow 2",
        trigger_type="incoming_message",
        nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}],
        edges=[{"id": "e", "source": "t", "target": "a"}],
        status="Draft"
    )
    await save_flow(request=req2, db=db_session, current_user=user)

    # Attempting third flow (should be blocked)
    req3 = FlowSaveRequest(
        name="Flow 3",
        trigger_type="incoming_message",
        nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}],
        edges=[{"id": "e", "source": "t", "target": "a"}],
        status="Draft"
    )

    with pytest.raises(HTTPException) as exc:
        await save_flow(request=req3, db=db_session, current_user=user)
    
    assert exc.value.status_code == 400
    assert "Flow quota exceeded" in exc.value.detail


@pytest.mark.anyio
async def test_user_deletes_flow_frees_slot(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()

    plan = Plan(id=uuid.uuid4(), name="starter", price=0, billing_cycle="monthly", is_active=True)
    db_session.add(plan)
    ent = PlanEntitlement(plan_id=plan.id, flow=1, included_ai_credits=0, included_wcc_wallet=Decimal("0.00"), storage_limit_mb=500, team_limit=2, knowledge_base_limit=5, gmail_limit=1, lead_limit=100, meeting_limit=10, automation_limit=2)
    db_session.add(ent)
    workspace = Workspace(id=ws_id, name="Test WS")
    db_session.add(workspace)
    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status=SubscriptionStatus.active, billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    user = MockUser(user_id)

    # Save first flow (occupies the only slot)
    req = FlowSaveRequest(
        name="Flow 1",
        trigger_type="incoming_message",
        nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}],
        edges=[{"id": "e", "source": "t", "target": "a"}],
        status="Draft"
    )
    flow = await save_flow(request=req, db=db_session, current_user=user)

    # Verify second creation is blocked
    req2 = FlowSaveRequest(name="Flow 2", trigger_type="incoming_message", nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}], edges=[{"id": "e", "source": "t", "target": "a"}], status="Draft")
    with pytest.raises(HTTPException):
        await save_flow(request=req2, db=db_session, current_user=user)

    # Delete first flow
    await delete_flow(flow_id=flow.id, db=db_session, current_user=user)

    # Create new flow (should succeed now)
    flow2 = await save_flow(request=req2, db=db_session, current_user=user)
    assert flow2.id is not None


@pytest.mark.anyio
async def test_user_purchases_flow_pack_increases_limit(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()

    plan = Plan(id=uuid.uuid4(), name="starter", price=0, billing_cycle="monthly", is_active=True)
    db_session.add(plan)
    ent = PlanEntitlement(plan_id=plan.id, flow=2, included_ai_credits=0, included_wcc_wallet=Decimal("0.00"), storage_limit_mb=500, team_limit=2, knowledge_base_limit=5, gmail_limit=1, lead_limit=100, meeting_limit=10, automation_limit=2)
    db_session.add(ent)
    workspace = Workspace(id=ws_id, name="Test WS")
    db_session.add(workspace)
    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status=SubscriptionStatus.active, billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    user = MockUser(user_id)

    # Create 2 flows (up to plan limit)
    for i in range(2):
        req = FlowSaveRequest(
            name=f"Flow {i}",
            trigger_type="incoming_message",
            nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}],
            edges=[{"id": "e", "source": "t", "target": "a"}],
            status="Draft"
        )
        await save_flow(request=req, db=db_session, current_user=user)

    # Third flow creation blocked
    req3 = FlowSaveRequest(name="Flow 3", trigger_type="incoming_message", nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}], edges=[{"id": "e", "source": "t", "target": "a"}], status="Draft")
    with pytest.raises(HTTPException):
        await save_flow(request=req3, db=db_session, current_user=user)

    # Purchase additional flow pack (+5 flows)
    pack = PurchasedFlowPack(workspace_id=ws_id, flows=5)
    db_session.add(pack)
    db_session.commit()

    # Now creation should succeed
    flow3 = await save_flow(request=req3, db=db_session, current_user=user)
    assert flow3.id is not None


@pytest.mark.anyio
async def test_user_upgrades_plan_updates_limit(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()

    # Starter plan (limit 1)
    plan_starter = Plan(id=uuid.uuid4(), name="starter", price=0, billing_cycle="monthly", is_active=True)
    db_session.add(plan_starter)
    ent_starter = PlanEntitlement(plan_id=plan_starter.id, flow=1, included_ai_credits=0, included_wcc_wallet=Decimal("0.00"), storage_limit_mb=500, team_limit=2, knowledge_base_limit=5, gmail_limit=1, lead_limit=100, meeting_limit=10, automation_limit=2)
    db_session.add(ent_starter)

    # Pro plan (limit 5)
    plan_pro = Plan(id=uuid.uuid4(), name="pro", price=1000, billing_cycle="monthly", is_active=True)
    db_session.add(plan_pro)
    ent_pro = PlanEntitlement(plan_id=plan_pro.id, flow=5, included_ai_credits=0, included_wcc_wallet=Decimal("0.00"), storage_limit_mb=500, team_limit=2, knowledge_base_limit=5, gmail_limit=1, lead_limit=100, meeting_limit=10, automation_limit=2)
    db_session.add(ent_pro)

    workspace = Workspace(id=ws_id, name="Test WS")
    db_session.add(workspace)
    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    sub = Subscription(workspace_id=ws_id, plan_id=plan_starter.id, status=SubscriptionStatus.active, billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    user = MockUser(user_id)

    # 1. Create one flow (fills slot)
    req = FlowSaveRequest(name="Flow 1", trigger_type="incoming_message", nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}], edges=[{"id": "e", "source": "t", "target": "a"}], status="Draft")
    await save_flow(request=req, db=db_session, current_user=user)

    # 2. Blocked at limit
    req2 = FlowSaveRequest(name="Flow 2", trigger_type="incoming_message", nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}], edges=[{"id": "e", "source": "t", "target": "a"}], status="Draft")
    with pytest.raises(HTTPException):
        await save_flow(request=req2, db=db_session, current_user=user)

    # 3. Upgrade workspace to Pro plan
    sub.plan_id = plan_pro.id
    db_session.commit()

    # 4. Succeeds immediately
    flow2 = await save_flow(request=req2, db=db_session, current_user=user)
    assert flow2.id is not None


@pytest.mark.anyio
async def test_downgrade_retains_existing_flows_but_blocks_new(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()

    # Business plan (limit 5)
    plan_biz = Plan(id=uuid.uuid4(), name="business", price=3000, billing_cycle="monthly", is_active=True)
    db_session.add(plan_biz)
    ent_biz = PlanEntitlement(plan_id=plan_biz.id, flow=5, included_ai_credits=0, included_wcc_wallet=Decimal("0.00"), storage_limit_mb=500, team_limit=2, knowledge_base_limit=5, gmail_limit=1, lead_limit=100, meeting_limit=10, automation_limit=2)
    db_session.add(ent_biz)

    # Starter plan (limit 2)
    plan_starter = Plan(id=uuid.uuid4(), name="starter", price=0, billing_cycle="monthly", is_active=True)
    db_session.add(plan_starter)
    ent_starter = PlanEntitlement(plan_id=plan_starter.id, flow=2, included_ai_credits=0, included_wcc_wallet=Decimal("0.00"), storage_limit_mb=500, team_limit=2, knowledge_base_limit=5, gmail_limit=1, lead_limit=100, meeting_limit=10, automation_limit=2)
    db_session.add(ent_starter)

    workspace = Workspace(id=ws_id, name="Test WS")
    db_session.add(workspace)
    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    sub = Subscription(workspace_id=ws_id, plan_id=plan_biz.id, status=SubscriptionStatus.active, billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    user = MockUser(user_id)

    # Create 4 flows
    flow_ids = []
    for i in range(4):
        req = FlowSaveRequest(name=f"Flow {i}", trigger_type="incoming_message", nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}], edges=[{"id": "e", "source": "t", "target": "a"}], status="Draft")
        f = await save_flow(request=req, db=db_session, current_user=user)
        flow_ids.append(f.id)

    # Downgrade to Starter (limit 2)
    sub.plan_id = plan_starter.id
    db_session.commit()

    # Existing 4 flows remain active in db
    db_count = db_session.query(AutomationFlow).filter(AutomationFlow.workspace_id == ws_id).count()
    assert db_count == 4

    # Save a 5th flow (should be blocked as current 4 > limit 2)
    req5 = FlowSaveRequest(name="Flow 5", trigger_type="incoming_message", nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}], edges=[{"id": "e", "source": "t", "target": "a"}], status="Draft")
    with pytest.raises(HTTPException):
        await save_flow(request=req5, db=db_session, current_user=user)

    # Delete 3 flows (leaving 1 flow)
    for fid in flow_ids[:3]:
        await delete_flow(flow_id=fid, db=db_session, current_user=user)

    # Creating a new flow should now succeed (current 1 < limit 2)
    flow_new = await save_flow(request=req5, db=db_session, current_user=user)
    assert flow_new.id is not None


@pytest.mark.anyio
async def test_admin_changes_entitlement_enforced_immediately(db_session):
    ws_id = uuid.uuid4()
    user_id = uuid.uuid4()

    plan = Plan(id=uuid.uuid4(), name="starter", price=0, billing_cycle="monthly", is_active=True)
    db_session.add(plan)
    ent = PlanEntitlement(plan_id=plan.id, flow=1, included_ai_credits=0, included_wcc_wallet=Decimal("0.00"), storage_limit_mb=500, team_limit=2, knowledge_base_limit=5, gmail_limit=1, lead_limit=100, meeting_limit=10, automation_limit=2)
    db_session.add(ent)
    workspace = Workspace(id=ws_id, name="Test WS")
    db_session.add(workspace)
    member = WorkspaceMember(workspace_id=ws_id, user_id=user_id, role="owner")
    db_session.add(member)
    sub = Subscription(workspace_id=ws_id, plan_id=plan.id, status=SubscriptionStatus.active, billing_cycle="monthly")
    db_session.add(sub)
    db_session.commit()

    user = MockUser(user_id)

    # 1. Create first flow (occupies the only slot)
    req = FlowSaveRequest(name="Flow 1", trigger_type="incoming_message", nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}], edges=[{"id": "e", "source": "t", "target": "a"}], status="Draft")
    await save_flow(request=req, db=db_session, current_user=user)

    # 2. Blocked at limit 1
    req2 = FlowSaveRequest(name="Flow 2", trigger_type="incoming_message", nodes=[{"id": "t", "type": "trigger"}, {"id": "a", "type": "action"}], edges=[{"id": "e", "source": "t", "target": "a"}], status="Draft")
    with pytest.raises(HTTPException):
        await save_flow(request=req2, db=db_session, current_user=user)

    # 3. Admin modifies entitlement limit directly to 3
    ent.flow = 3
    db_session.commit()

    # 4. Succeeds immediately
    flow2 = await save_flow(request=req2, db=db_session, current_user=user)
    assert flow2.id is not None
