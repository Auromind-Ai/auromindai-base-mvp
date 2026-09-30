"""Member billing isolation checks. Run with DATABASE_URL=sqlite:///:memory: and --noconftest.
Only external AI/Meta delivery is mocked; permissions, wallet SQL and webhook billing are real.
"""
import asyncio
import uuid
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
from app.core.security import verify_workspace_access
from app.services.wcc_service import WCCService, InsufficientWCCBalanceError
from app.services.marketing.campaign_service import CampaignService
from app.services.inbox.webhook_service import WebhookService
from app.routers import template as routes
from app.routers.campaigns import resolve_workspace_id
from app.schemas.template import GenerateRequest, TemplateSendRequest
from tests.unit.test_wcc_e2e_messaging_deduction import db as seeded_db, _create_workspace


@pytest.fixture
def env():
    assert engine.url.get_backend_name() == "sqlite" and engine.url.database in (None, "", ":memory:"), "Use isolated in-memory SQLite only"
    with patch("app.core.event_bus.emit_event"), patch("app.services.wcc_service.emit_event"), patch.object(WCCService, "_check_wcc_quota_warnings"), patch("requests.sessions.Session.request", side_effect=AssertionError("Unexpected external HTTP request")):
        generator = seeded_db.__wrapped__()
        db = next(generator)
        try:
            own, member = _create_workspace(db, "Member personal", "personal-phone")
            shared, owner = _create_workspace(db, "Owner shared", "shared-phone")
            membership = WorkspaceMember(id=uuid.uuid4(), workspace_id=shared.id, user_id=member.id,
                                         role="member", is_active=True,
                                         permissions={"templates": ["manage"], "marketing": ["campaigns"], "inbox": ["conversations"]})
            db.add(membership)
            for ws, amount in [(own, "500"), (shared, "100")]:
                wallet = db.query(WCCWallet).filter_by(workspace_id=ws.id).one()
                wallet.included_balance = Decimal("0")
                wallet.purchased_balance = Decimal(amount)
                wallet.balance = Decimal(amount)
                wallet.held_balance = Decimal("0")
            template = Template(id=uuid.uuid4(), workspace_id=shared.id, user_id=owner.id,
                                name="member_billing_test", content="Hello", language="en_US",
                                type="TEXT", category="MARKETING", status="approved")
            db.add(template)
            db.commit()
            user = SimpleNamespace(id=member.id, workspace_id=str(own.id), default_workspace_id=str(own.id))
            yield SimpleNamespace(db=db, own=own, shared=shared, user=user, membership=membership, template=template)
        finally:
            generator.close()


def wallet(e, ws):
    e.db.expire_all()
    return e.db.query(WCCWallet).filter_by(workspace_id=ws.id).one()


def payload(e, wamid, session="billing-session"):
    return {"object": "whatsapp_business_account", "entry": [{"id": "waba", "changes": [{"field": "messages", "value": {
        "metadata": {"phone_number_id": e.shared.meta_phone_number_id},
        "statuses": [{"id": wamid, "status": "delivered", "recipient_id": "919876543210", "timestamp": "1700000000",
                      "conversation": {"id": session}, "pricing": {"billable": True, "category": "marketing"}}]
    }}]}]}


def deliver(e, wamid, session="billing-session"):
    asyncio.run(WebhookService.handle_meta_whatsapp_webhook(payload(e, wamid, session), e.db))


def add_tracked_message(e, source="flow"):
    conv = Conversation(id=uuid.uuid4(), workspace_id=e.shared.id, channel=ChannelType.WHATSAPP, phone="+919876543210")
    e.db.add(conv)
    e.db.flush()
    wamid = "wamid." + uuid.uuid4().hex
    e.db.add(Message(id=uuid.uuid4(), conversation_id=conv.id, sender_type=SenderType.AI,
                     source=source, status=MessageStatus.SENT, content="Hello", external_id=wamid))
    e.db.commit()
    return wamid


def test_member_flow_debits_shared_wallet_once_not_personal(env):
    e = env
    assert verify_workspace_access(e.user, e.db, e.shared.id, required_permission="templates.manage") == str(e.shared.id)
    wamid = add_tracked_message(e)
    deliver(e, wamid)
    deliver(e, wamid)
    assert wallet(e, e.shared).balance == Decimal("98.75")
    assert wallet(e, e.own).balance == Decimal("500")
    assert e.db.query(WCCTransaction).filter_by(workspace_id=e.shared.id).count() == 1


def test_member_campaign_escrow_and_settlement_use_shared_wallet(env):
    e = env
    target = resolve_workspace_id(e.user, e.db, str(e.shared.id))
    assert target == e.shared.id
    CampaignService.reserve_campaign_escrow(e.db, target, Decimal("2.50"))
    assert wallet(e, e.shared).held_balance == Decimal("2.50")
    CampaignService.settle_message_cost(e.db, target, Decimal("1.25"))
    assert wallet(e, e.shared).balance == Decimal("98.75")
    assert wallet(e, e.shared).held_balance == Decimal("1.25")
    assert wallet(e, e.own).balance == Decimal("500")
    CampaignService.release_unspent_escrow(e.db, target, Decimal("1.25"))
    assert wallet(e, e.shared).held_balance == 0


def test_shared_insufficient_balance_cannot_spend_personal_wallet(env):
    e = env
    w = wallet(e, e.shared)
    w.purchased_balance = w.balance = Decimal("0.50")
    e.db.commit()
    with pytest.raises(InsufficientWCCBalanceError):
        CampaignService.reserve_campaign_escrow(e.db, e.shared.id, Decimal("1.25"))
    assert wallet(e, e.own).balance == Decimal("500")


def test_member_without_page_permission_cannot_send_or_start_campaign(env):
    e = env
    e.membership.permissions = {}
    e.db.commit()
    with patch.object(routes.requests, "post") as send:
        with pytest.raises(HTTPException) as denied:
            routes.send_message(TemplateSendRequest(phone="919876543210", template_name=e.template.name, workspace_id=str(e.shared.id)), e.db, e.user)
        assert denied.value.status_code == 403
        send.assert_not_called()
    with pytest.raises(HTTPException) as denied:
        resolve_workspace_id(e.user, e.db, str(e.shared.id))
    assert denied.value.status_code == 403
    assert wallet(e, e.shared).balance == Decimal("100")


def test_ai_template_generation_bills_selected_shared_workspace(env):
    e = env
    request = GenerateRequest(prompt="A welcome message", workspace_id=str(e.shared.id))
    with patch("app.services.ai.execution_service.AIExecutionService.execute", new_callable=AsyncMock, return_value={"text": '{"templates": []}'}) as execute:
        asyncio.run(routes.generate_template(request, e.db, e.user))
    assert str(execute.call_args.kwargs["workspace_id"]) == str(e.shared.id), "AI template generation selected the member personal workspace"


def test_direct_template_send_is_billed_on_delivery(env):
    e = env
    wamid = "wamid.direct-template"
    response = Mock(status_code=200)
    response.json.return_value = {"messages": [{"id": wamid}]}
    with patch.object(routes.requests, "post", return_value=response), patch("app.services.config_service.config_service.get", return_value="fake-token"):
        routes.send_message(TemplateSendRequest(phone="919876543210", template_name=e.template.name, workspace_id=str(e.shared.id)), e.db, e.user)
    deliver(e, wamid)
    assert wallet(e, e.shared).balance == Decimal("98.75"), "Direct template was delivered without a WCC debit"
    assert wallet(e, e.own).balance == Decimal("500")


def test_template_preflight_blocks_balance_below_actual_message_price(env):
    e = env
    w = wallet(e, e.shared)
    w.purchased_balance = w.balance = Decimal("0.50")
    e.db.commit()
    response = Mock(status_code=200)
    response.json.return_value = {"messages": [{"id": "wamid.low-balance"}]}
    with patch.object(routes.requests, "post", return_value=response) as send, patch("app.services.config_service.config_service.get", return_value="fake-token"):
        with pytest.raises(HTTPException) as denied:
            routes.send_message(TemplateSendRequest(phone="919876543210", template_name=e.template.name, workspace_id=str(e.shared.id)), e.db, e.user)
        assert denied.value.status_code == 402
        send.assert_not_called()


def test_campaign_settlement_uses_included_credits_before_purchased(env):
    e = env
    w = wallet(e, e.shared)
    w.included_balance = Decimal("10")
    w.purchased_balance = Decimal("90")
    e.db.commit()
    CampaignService.reserve_campaign_escrow(e.db, e.shared.id, Decimal("1.25"))
    CampaignService.settle_message_cost(e.db, e.shared.id, Decimal("1.25"))
    assert wallet(e, e.shared).included_balance == Decimal("8.75"), "Campaign settlement skipped the included wallet bucket"
    assert wallet(e, e.shared).purchased_balance == Decimal("90")
