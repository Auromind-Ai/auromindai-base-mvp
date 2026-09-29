"""Comprehensive Member vs Owner Workspace Billing & Deduction Test Suite.
Tests that when a member performs actions (WhatsApp template, campaign, webhook delivery, AI generation):
1. Credits and WCC wallet balances are correctly deducted from the selected owner's shared workspace.
2. The member's own personal workspace wallet is NEVER touched.
3. Insufficient balance checks, permission denials, and duplicate webhook idempotency function properly.
"""
import uuid
import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
import pytest
from fastapi import HTTPException

from app.database import engine
from app.models.workspace import WorkspaceMember
from app.models.wcc import WCCWallet, WCCTransaction
from app.models.templates import Template
from app.models.conversation import Conversation, ChannelType
from app.models.message import Message, MessageStatus, SenderType
from app.models.campaign import Campaign, CampaignRecipient
from app.core.security import verify_workspace_access
from app.services.wcc_service import WCCService, InsufficientWCCBalanceError
from app.services.marketing.campaign_service import CampaignService
from app.services.inbox.webhook_service import WebhookService
from app.routers import template as template_routes
from app.routers.campaigns import resolve_workspace_id
from app.schemas.template import GenerateRequest, TemplateSendRequest
from tests.unit.test_wcc_e2e_messaging_deduction import db as seeded_db, _create_workspace


@pytest.fixture
def env():
    """Sets up an owner shared workspace (100 credits) and a member personal workspace (500 credits)."""
    with patch("app.core.event_bus.emit_event"), \
         patch("app.core.event_bus.EventBus.emit"), \
         patch("app.services.wcc_service.emit_event"), \
         patch("app.routers.auth._get_redis_client", return_value=None), \
         patch("app.core.redis_lock.get_redis_client", return_value=None), \
         patch("celery.app.task.Task.apply_async", return_value=None), \
         patch("celery.app.task.Task.delay", return_value=None), \
         patch.object(WCCService, "_check_wcc_quota_warnings"):
        
        generator = seeded_db.__wrapped__()
        db = next(generator)
        try:
            # 1. Member's personal workspace
            own_ws, member_user = _create_workspace(db, "Member Personal WS", "personal-phone-123")
            
            # 2. Owner's shared workspace
            shared_ws, owner_user = _create_workspace(db, "Owner Shared WS", "shared-phone-999")
            
            # 3. Add member to shared workspace with permissions
            membership = WorkspaceMember(
                id=uuid.uuid4(),
                workspace_id=shared_ws.id,
                user_id=member_user.id,
                role="member",
                is_active=True,
                permissions={
                    "templates": ["manage"],
                    "marketing": ["campaigns"],
                    "inbox": ["conversations"]
                }
            )
            db.add(membership)
            
            # 4. Fund wallets
            for ws, amount in [(own_ws, "500.00"), (shared_ws, "100.00")]:
                wallet = db.query(WCCWallet).filter_by(workspace_id=ws.id).one()
                wallet.included_balance = Decimal("0.00")
                wallet.purchased_balance = Decimal(amount)
                wallet.balance = Decimal(amount)
                wallet.held_balance = Decimal("0.00")
            
            # 5. Shared template
            template = Template(
                id=uuid.uuid4(),
                workspace_id=shared_ws.id,
                user_id=owner_user.id,
                name="promotional_offer",
                content="Special 20% discount!",
                language="en_US",
                type="TEXT",
                category="MARKETING",
                status="approved"
            )
            db.add(template)
            db.commit()
            
            member_principal = SimpleNamespace(
                id=member_user.id,
                workspace_id=str(own_ws.id),
                default_workspace_id=str(own_ws.id)
            )
            
            yield SimpleNamespace(
                db=db,
                own=own_ws,
                shared=shared_ws,
                member=member_principal,
                owner=owner_user,
                membership=membership,
                template=template
            )
        finally:
            generator.close()


def get_wallet(env, ws):
    env.db.expire_all()
    return env.db.query(WCCWallet).filter_by(workspace_id=ws.id).one()


def build_meta_webhook(phone_number_id, wamid, status="delivered", category="marketing"):
    return {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "waba_shared",
            "changes": [{
                "field": "messages",
                "value": {
                    "metadata": {"phone_number_id": phone_number_id},
                    "statuses": [{
                        "id": wamid,
                        "status": status,
                        "recipient_id": "919876543210",
                        "timestamp": "1700000000",
                        "conversation": {"id": f"conv-{wamid}"},
                        "pricing": {"billable": True, "category": category}
                    }]
                }
            }]
        }]
    }


# ============================================================================
# 1. PERMISSIONS & WORKSPACE RESOLUTION
# ============================================================================
def test_member_resolves_and_accesses_shared_workspace(env):
    """Member with valid permissions resolves shared workspace correctly."""
    e = env
    target_ws_id = resolve_workspace_id(e.member, e.db, str(e.shared.id))
    assert target_ws_id == e.shared.id
    verified_id = verify_workspace_access(e.member, e.db, e.shared.id, required_permission="marketing.campaigns")
    assert verified_id == str(e.shared.id)


def test_member_without_permissions_is_blocked_from_owner_workspace(env):
    """Member without permissions gets 403 Forbidden."""
    e = env
    e.membership.permissions = {}
    e.db.commit()
    with pytest.raises(HTTPException) as exc:
        resolve_workspace_id(e.member, e.db, str(e.shared.id))
    assert exc.value.status_code == 403


# ============================================================================
# 2. CAMPAIGN BILLING (ESCROW, SETTLEMENT, REFUND, ISOLATION)
# ============================================================================
def test_member_campaign_reserves_escrow_from_owner_wallet(env):
    """Campaign escrow holds credits in Owner's shared wallet, NOT member's personal wallet."""
    e = env
    # Estimate for 10 marketing messages @ 1.25 = 12.50
    estimated_cost = Decimal("12.50")
    CampaignService.reserve_campaign_escrow(e.db, e.shared.id, estimated_cost)
    
    shared_w = get_wallet(e, e.shared)
    own_w = get_wallet(e, e.own)
    
    assert shared_w.balance == Decimal("100.00")
    assert shared_w.held_balance == Decimal("12.50")
    assert own_w.balance == Decimal("500.00")
    assert own_w.held_balance == Decimal("0.00")


def test_member_campaign_settlement_and_unspent_release(env):
    """Settling message cost consumes from Owner's shared wallet, releasing remainder."""
    e = env
    # Hold 12.50 escrow
    CampaignService.reserve_campaign_escrow(e.db, e.shared.id, Decimal("12.50"))
    
    # Settle 5 delivered messages (5 * 1.25 = 6.25)
    CampaignService.settle_message_cost(e.db, e.shared.id, Decimal("6.25"))
    shared_w = get_wallet(e, e.shared)
    assert shared_w.balance == Decimal("93.75")
    assert shared_w.held_balance == Decimal("6.25")
    
    # Release remaining 6.25 unspent escrow
    CampaignService.release_unspent_escrow(e.db, e.shared.id, Decimal("6.25"))
    shared_w = get_wallet(e, e.shared)
    assert shared_w.balance == Decimal("93.75")
    assert shared_w.held_balance == Decimal("0.00")
    
    # Personal wallet untouched
    assert get_wallet(e, e.own).balance == Decimal("500.00")


def test_member_campaign_insufficient_credits_blocks_without_touching_personal(env):
    """If Owner's shared wallet has insufficient credits, fails without touching personal wallet."""
    e = env
    shared_w = get_wallet(e, e.shared)
    shared_w.purchased_balance = shared_w.balance = Decimal("5.00")
    e.db.commit()
    
    with pytest.raises(InsufficientWCCBalanceError):
        CampaignService.reserve_campaign_escrow(e.db, e.shared.id, Decimal("12.50"))
    
    assert get_wallet(e, e.own).balance == Decimal("500.00")


def test_failed_campaign_delivery_refunds_owner_wallet(env):
    """Failed deliveries refund the Owner's shared wallet."""
    e = env
    # Refund 1.25 to shared workspace
    CampaignService.refund_failed_delivery(e.db, e.shared.id, Decimal("1.25"))
    assert get_wallet(e, e.shared).balance == Decimal("101.25")
    assert get_wallet(e, e.own).balance == Decimal("500.00")


# ============================================================================
# 3. WHATSAPP FLOW & AUTOMATION MESSAGES VIA WEBHOOK
# ============================================================================
def test_flow_delivery_webhook_debits_owner_wallet_with_idempotency(env):
    """WhatsApp flow/automation message delivery debits Owner's shared wallet once; duplicates are ignored."""
    e = env
    conv = Conversation(id=uuid.uuid4(), workspace_id=e.shared.id, channel=ChannelType.WHATSAPP, phone="+919876543210")
    e.db.add(conv)
    e.db.flush()
    
    wamid = "wamid." + uuid.uuid4().hex
    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        sender_type=SenderType.AI,
        source="flow",
        status=MessageStatus.SENT,
        content="Automated flow message",
        external_id=wamid
    )
    e.db.add(msg)
    e.db.commit()
    
    # First delivery event -> debits 1.25
    payload = build_meta_webhook(e.shared.meta_phone_number_id, wamid, status="delivered", category="marketing")
    asyncio.run(WebhookService.handle_meta_whatsapp_webhook(payload, e.db))
    
    assert get_wallet(e, e.shared).balance == Decimal("98.75")
    assert get_wallet(e, e.own).balance == Decimal("500.00")
    assert e.db.query(WCCTransaction).filter_by(workspace_id=e.shared.id).count() == 1
    
    # Duplicate delivery event (webhook retry) -> ignored, no double deduction!
    asyncio.run(WebhookService.handle_meta_whatsapp_webhook(payload, e.db))
    assert get_wallet(e, e.shared).balance == Decimal("98.75")
    assert e.db.query(WCCTransaction).filter_by(workspace_id=e.shared.id).count() == 1


# ============================================================================
# 4. AI TEMPLATE GENERATION & DIRECT TEMPLATE SEND
# ============================================================================
def test_ai_template_generation_bills_selected_shared_workspace(env):
    """AI template generation uses the selected shared workspace ID."""
    e = env
    request = GenerateRequest(prompt="A welcome message", workspace_id=str(e.shared.id))
    with patch("app.services.ai.execution_service.AIExecutionService.execute", new_callable=AsyncMock, return_value={"text": '{"templates": []}'}) as execute:
        asyncio.run(template_routes.generate_template(request, e.db, e.member))
    assert str(execute.call_args.kwargs["workspace_id"]) == str(e.shared.id), "AI template generation selected member personal workspace"


def test_direct_template_send_is_billed_on_delivery(env):
    """Direct template send is tracked in DB and billed upon webhook delivery."""
    e = env
    wamid = "wamid.direct-template-123"
    response = Mock(status_code=200)
    response.json.return_value = {"messages": [{"id": wamid}]}
    with patch.object(template_routes.requests, "post", return_value=response), \
         patch("app.services.config_service.config_service.get", return_value="fake-token"):
        template_routes.send_message(
            TemplateSendRequest(phone="919876543210", template_name=e.template.name, workspace_id=str(e.shared.id)),
            e.db,
            e.member
        )
    
    # Deliver the template message
    payload = build_meta_webhook(e.shared.meta_phone_number_id, wamid, status="delivered", category="marketing")
    asyncio.run(WebhookService.handle_meta_whatsapp_webhook(payload, e.db))
    
    assert get_wallet(e, e.shared).balance == Decimal("98.75")
    assert get_wallet(e, e.own).balance == Decimal("500.00")


def test_template_preflight_blocks_balance_below_actual_message_price(env):
    """Direct template send checks rate card cost (1.25) and rejects if balance is below it (e.g. 0.50)."""
    e = env
    w = get_wallet(e, e.shared)
    w.purchased_balance = w.balance = Decimal("0.50")
    e.db.commit()
    
    response = Mock(status_code=200)
    response.json.return_value = {"messages": [{"id": "wamid.low-balance"}]}
    with patch.object(template_routes.requests, "post", return_value=response) as send, \
         patch("app.services.config_service.config_service.get", return_value="fake-token"):
        with pytest.raises(HTTPException) as denied:
            template_routes.send_message(
                TemplateSendRequest(phone="919876543210", template_name=e.template.name, workspace_id=str(e.shared.id)),
                e.db,
                e.member
            )
        assert denied.value.status_code == 402
        send.assert_not_called()

