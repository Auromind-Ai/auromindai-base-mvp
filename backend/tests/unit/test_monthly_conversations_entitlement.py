import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.database import SessionLocal
from app.models.conversation import ChannelType, Conversation, ConversationStatus
from app.models.message import Message
from app.models.plan import Plan
from app.models.plan_entitlement import PlanEntitlement
from app.models.subscription import Subscription
from app.models.user import User
from app.models.workspace import Workspace
from app.core.enums import SubscriptionStatus
from app.services.billing.entitlement_service import EntitlementService
from app.services.inbox.conversation_service import ConversationService
from app.services.inbox.message_service import MessageService
from app.services.inbox.webhook_service import WebhookService


def _setup_workspace_with_limit(db, monthly_limit: int, plan_key: str = "free"):
    uid = uuid.uuid4()
    ws_id = uuid.uuid4()
    plan_id = uuid.uuid4()

    user = User(
        id=uid,
        email=f"conv_{uid.hex[:8]}@example.com",
        password_hash="hashed",
        is_active=True,
    )
    db.add(user)
    db.flush()

    ws = Workspace(
        id=ws_id,
        name=f"WS-{ws_id.hex[:6]}",
        created_by=uid,
        billing_owner_id=uid,
    )
    db.add(ws)
    db.flush()

    plan_name = f"{plan_key}_{plan_id.hex[:6]}"
    plan = Plan(
        id=plan_id,
        name=plan_name,
        display_name=plan_key.title(),
        price=0.0,
        monthly_price=0.0,
        yearly_price=0.0,
        is_active=True,
        display_order=1,
    )
    db.add(plan)
    db.flush()

    ent = PlanEntitlement(
        id=uuid.uuid4(),
        plan_id=plan_id,
        included_ai_credits=100,
        included_wcc_wallet=0.0,
        storage_limit_mb=100,
        team_limit=1,
        knowledge_base_limit=5,
        gmail_limit=1,
        lead_limit=50,
        meeting_limit=5,
        automation_limit=5,
        flow=5,
        feature_flags={
            "has_rag": True,
            "monthly_conversations": monthly_limit,
            "allowed_channels": ["whatsapp", "instagram", "twilio"],
        },
    )
    db.add(ent)
    db.flush()

    sub = Subscription(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        plan_id=plan_id,
        status=SubscriptionStatus.active,
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc) - timedelta(days=1),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=29),
    )
    db.add(sub)
    db.commit()
    return ws_id, uid, plan_name


def test_check_entitlement_monthly_conversations_not_shadowed_by_feature_flags():
    db = SessionLocal()
    try:
        ws_id, _, _ = _setup_workspace_with_limit(db, monthly_limit=2)

        now = datetime.utcnow()
        c1 = Conversation(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            phone="919000000001",
            channel=ChannelType.WHATSAPP,
            created_at=now,
            updated_at=now,
            last_message_at=now,
        )
        c2 = Conversation(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            phone="919000000002",
            channel=ChannelType.WHATSAPP,
            created_at=now,
            updated_at=now,
            last_message_at=now,
        )
        db.add_all([c1, c2])
        db.commit()

        # Both resource aliases must evaluate numeric quota, not boolean feature flag
        for alias in ("conversation", "conversations", "monthly_conversations"):
            res = EntitlementService.check_entitlement(db, ws_id, alias)
            assert res["limit"] == 2
            assert res["current"] == 2
            assert res["remaining"] == 0
            assert res["allowed"] is False
    finally:
        db.close()


def test_strict_blocking_new_and_returning_old_month_conversations():
    db = SessionLocal()
    try:
        ws_id, _, _ = _setup_workspace_with_limit(db, monthly_limit=1)

        now = datetime.utcnow()
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month = first_of_month - timedelta(days=5)

        # 1. Existing conversation active in current month -> consumes the 1/1 quota
        active_conv = Conversation(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            phone="919111111111",
            channel=ChannelType.WHATSAPP,
            created_at=last_month,
            updated_at=now,
            last_message_at=now,
        )
        # 2. Stale conversation from last month -> NOT yet active this month
        stale_conv = Conversation(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            phone="919222222222",
            channel=ChannelType.WHATSAPP,
            created_at=last_month,
            updated_at=last_month,
            last_message_at=last_month,
        )
        db.add_all([active_conv, stale_conv])
        db.commit()

        quota = EntitlementService.get_monthly_conversation_quota(db, ws_id)
        assert quota["used"] == 1
        assert quota["limit"] == 1
        assert quota["remaining"] == 0

        # A. Ongoing message in already-active conversation MUST succeed
        same_conv = ConversationService.get_or_create_conversation(
            db,
            workspace_id=str(ws_id),
            channel=ChannelType.WHATSAPP,
            phone="919111111111",
        )
        assert same_conv.id == active_conv.id

        # B. Brand-new conversation MUST be strictly blocked (403)
        with pytest.raises(HTTPException) as exc_new:
            ConversationService.get_or_create_conversation(
                db,
                workspace_id=str(ws_id),
                channel=ChannelType.WHATSAPP,
                phone="919333333333",
            )
        assert exc_new.value.status_code == 403
        assert exc_new.value.detail["error"] == "ENTITLEMENT_EXCEEDED"

        # C. Reactivating stale conversation from last month MUST be strictly blocked (403)
        with pytest.raises(HTTPException) as exc_stale:
            ConversationService.get_or_create_conversation(
                db,
                workspace_id=str(ws_id),
                channel=ChannelType.WHATSAPP,
                phone="919222222222",
            )
        assert exc_stale.value.status_code == 403
        assert exc_stale.value.detail["error"] == "ENTITLEMENT_EXCEEDED"

        # D. Outbound send_reply to stale conversation MUST also be strictly blocked (403)
        with pytest.raises(HTTPException) as exc_reply:
            MessageService.send_reply(
                db,
                workspace_id=str(ws_id),
                conversation_id=str(stale_conv.id),
                message="Hello from agent",
            )
        assert exc_reply.value.status_code == 403
        assert exc_reply.value.detail["error"] == "ENTITLEMENT_EXCEEDED"
    finally:
        db.close()


def test_webhook_strictly_blocks_when_monthly_conversation_limit_reached():
    db = SessionLocal()
    try:
        ws_id, _, _ = _setup_workspace_with_limit(db, monthly_limit=1)

        now = datetime.utcnow()
        existing = Conversation(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            phone="919444444444",
            channel=ChannelType.WHATSAPP,
            created_at=now,
            updated_at=now,
            last_message_at=now,
        )
        db.add(existing)
        db.commit()

        result = asyncio.run(
            WebhookService.process_incoming_message(
                db,
                workspace_id=str(ws_id),
                channel=ChannelType.WHATSAPP,
                body="Hi there",
                phone="919555555555",
                message_external_id=f"wamid_{uuid.uuid4().hex}",
            )
        )
        assert result["status"] == "blocked"
        assert result["reason"] == "monthly_conversations_limit_exceeded"

        # Verify no new conversation or message was created
        conv_count = db.query(Conversation).filter(Conversation.workspace_id == ws_id).count()
        msg_count = (
            db.query(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .filter(Conversation.workspace_id == ws_id)
            .count()
        )
        assert conv_count == 1
        assert msg_count == 0
    finally:
        db.close()


def test_enterprise_unlimited_conversations_never_blocks():
    db = SessionLocal()
    try:
        ws_id, _, _ = _setup_workspace_with_limit(db, monthly_limit=-1, plan_key="enterprise")
        res = EntitlementService.check_entitlement(db, ws_id, "monthly_conversations")
        assert res["allowed"] is True
        assert res["limit"] == -1
        assert res["remaining"] == -1

        conv = ConversationService.get_or_create_conversation(
            db,
            workspace_id=str(ws_id),
            channel=ChannelType.WHATSAPP,
            phone="919666666666",
        )
        assert conv is not None
    finally:
        db.close()
