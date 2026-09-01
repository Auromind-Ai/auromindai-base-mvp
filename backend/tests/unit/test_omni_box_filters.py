import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.conversation import Conversation, ConversationStatus, ChannelType
from app.models.message import Message, SenderType, MessageStatus
from app.models.ai_action import Lead
from app.services.inbox.conversation_service import ConversationService


@pytest.fixture
def test_setup(db_session: Session):
    # Create test user
    user = User(
        id=uuid.uuid4(),
        email=f"omnibox_test_{uuid.uuid4().hex[:8]}@example.com",
        full_name="Omni Box Tester",
        is_active=True,
    )
    db_session.add(user)

    # Create test workspace
    workspace = Workspace(
        id=uuid.uuid4(),
        name="Omni Test Workspace",
        created_by=user.id,
    )
    db_session.add(workspace)

    member = WorkspaceMember(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        user_id=user.id,
        role="owner",
    )
    db_session.add(member)
    db_session.commit()

    return {"user": user, "workspace": workspace}


def test_closed_filter_24_hour_rule(db_session: Session, test_setup):
    ws_id = test_setup["workspace"].id
    now = datetime.now(timezone.utc)

    # 1. Closed conversation closed 2 hours ago (< 24 hours) -> should NOT appear in CLOSED filter
    conv_closed_recent = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+12345678901",
        channel=ChannelType.WHATSAPP,
        status=ConversationStatus.CLOSED,
        closed_at=now - timedelta(hours=2),
        updated_at=now - timedelta(hours=2),
    )

    # 2. Closed conversation closed 25 hours ago (>= 24 hours) -> SHOULD appear in CLOSED filter
    conv_closed_old = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+12345678902",
        channel=ChannelType.WHATSAPP,
        status=ConversationStatus.CLOSED,
        closed_at=now - timedelta(hours=25),
        updated_at=now - timedelta(hours=25),
    )

    # 3. Open conversation
    conv_open = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+12345678903",
        channel=ChannelType.WHATSAPP,
        status=ConversationStatus.OPEN,
    )

    db_session.add_all([conv_closed_recent, conv_closed_old, conv_open])
    db_session.commit()

    closed_results = ConversationService.list_conversations(
        db_session,
        workspace_id=ws_id,
        channel="WHATSAPP",
        status="CLOSED",
    )
    closed_ids = [c.id for c in closed_results]

    assert conv_closed_old.id in closed_ids, "Conversation closed >= 24h must appear in CLOSED filter"
    assert conv_closed_recent.id not in closed_ids, "Conversation closed < 24h must NOT appear in CLOSED filter"
    assert conv_open.id not in closed_ids, "Open conversation must NOT appear in CLOSED filter"


def test_converted_filter_accuracy(db_session: Session, test_setup):
    ws_id = test_setup["workspace"].id

    # 1. Converted conversation (status == CONVERTED)
    conv_converted = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+19876543201",
        channel=ChannelType.WHATSAPP,
        status=ConversationStatus.CONVERTED,
    )

    # 2. Open conversation with converted Lead
    conv_with_lead = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+19876543202",
        channel=ChannelType.WHATSAPP,
        status=ConversationStatus.OPEN,
    )
    db_session.add_all([conv_converted, conv_with_lead])
    db_session.flush()

    lead_converted = Lead(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        conversation_id=conv_with_lead.id,
        name="Converted Lead",
        is_converted=True,
        status="converted",
    )
    db_session.add(lead_converted)

    # 3. Normal Open conversation (not converted)
    conv_open_only = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+19876543203",
        channel=ChannelType.WHATSAPP,
        status=ConversationStatus.OPEN,
    )

    # 4. Normal Closed conversation (not converted)
    conv_closed_only = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+19876543204",
        channel=ChannelType.WHATSAPP,
        status=ConversationStatus.CLOSED,
        closed_at=datetime.now(timezone.utc) - timedelta(days=2),
    )

    db_session.add_all([conv_open_only, conv_closed_only])
    db_session.commit()

    converted_results = ConversationService.list_conversations(
        db_session,
        workspace_id=ws_id,
        channel="WHATSAPP",
        status="CONVERTED",
    )
    converted_ids = [c.id for c in converted_results]

    assert conv_converted.id in converted_ids, "Conversation with CONVERTED status must appear in Converted filter"
    assert conv_with_lead.id in converted_ids, "Conversation with converted lead must appear in Converted filter"
    assert conv_open_only.id not in converted_ids, "Unconverted open conversation must NOT appear in Converted filter"
    assert conv_closed_only.id not in converted_ids, "Unconverted closed conversation must NOT appear in Converted filter"


def test_unread_filter(db_session: Session, test_setup):
    ws_id = test_setup["workspace"].id

    conv_unread = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+15550001",
        channel=ChannelType.INSTAGRAM,
        status=ConversationStatus.OPEN,
    )
    conv_read = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+15550002",
        channel=ChannelType.INSTAGRAM,
        status=ConversationStatus.OPEN,
    )
    db_session.add_all([conv_unread, conv_read])
    db_session.flush()

    # Unread customer message
    msg_unread = Message(
        id=uuid.uuid4(),
        conversation_id=conv_unread.id,
        sender_type=SenderType.USER,
        content="Hello, need help!",
        is_read=False,
        status=MessageStatus.DELIVERED,
    )
    # Read customer message
    msg_read = Message(
        id=uuid.uuid4(),
        conversation_id=conv_read.id,
        sender_type=SenderType.USER,
        content="Thank you",
        is_read=True,
        status=MessageStatus.DELIVERED,
    )
    db_session.add_all([msg_unread, msg_read])
    db_session.commit()

    unread_results = ConversationService.list_conversations(
        db_session,
        workspace_id=ws_id,
        channel="INSTAGRAM",
        status="UNREAD",
    )
    unread_ids = [c.id for c in unread_results]

    assert conv_unread.id in unread_ids
    assert conv_read.id not in unread_ids


def test_get_conversation_counts(db_session: Session, test_setup):
    ws_id = test_setup["workspace"].id
    now = datetime.now(timezone.utc)

    # 1. Open
    c1 = Conversation(id=uuid.uuid4(), workspace_id=ws_id, phone="+17770001", channel=ChannelType.TWILIO, status=ConversationStatus.OPEN)
    # 2. Converted
    c2 = Conversation(id=uuid.uuid4(), workspace_id=ws_id, phone="+17770002", channel=ChannelType.TWILIO, status=ConversationStatus.CONVERTED)
    # 3. Closed >= 24h
    c3 = Conversation(id=uuid.uuid4(), workspace_id=ws_id, phone="+17770003", channel=ChannelType.TWILIO, status=ConversationStatus.CLOSED, closed_at=now - timedelta(hours=30))
    # 4. Closed < 24h
    c4 = Conversation(id=uuid.uuid4(), workspace_id=ws_id, phone="+17770004", channel=ChannelType.TWILIO, status=ConversationStatus.CLOSED, closed_at=now - timedelta(hours=5))

    db_session.add_all([c1, c2, c3, c4])
    db_session.flush()

    # Add unread message to c1
    m1 = Message(id=uuid.uuid4(), conversation_id=c1.id, sender_type=SenderType.USER, content="Unread inquiry", is_read=False)
    db_session.add(m1)
    db_session.commit()

    counts = ConversationService.get_conversation_counts(
        db_session,
        workspace_id=ws_id,
        channel="TWILIO",
    )

    assert counts["all"] == 4
    assert counts["open"] == 1
    assert counts["converted"] == 1
    assert counts["closed"] == 1  # Only c3 (closed >= 24h), c4 is excluded!
    assert counts["unread"] == 1


def test_conversations_deduplication(db_session: Session, test_setup):
    ws_id = test_setup["workspace"].id

    conv = Conversation(
        id=uuid.uuid4(),
        workspace_id=ws_id,
        phone="+18881234567",
        channel=ChannelType.WHATSAPP,
        status=ConversationStatus.OPEN,
    )
    db_session.add(conv)
    db_session.flush()

    # Add lead and multiple unread messages to test that joins do not duplicate the conversation in list results
    lead = Lead(id=uuid.uuid4(), workspace_id=ws_id, conversation_id=conv.id, name="Test Lead", is_converted=True)
    msg1 = Message(id=uuid.uuid4(), conversation_id=conv.id, sender_type=SenderType.USER, content="Msg 1", is_read=False)
    msg2 = Message(id=uuid.uuid4(), conversation_id=conv.id, sender_type=SenderType.USER, content="Msg 2", is_read=False)
    db_session.add_all([lead, msg1, msg2])
    db_session.commit()

    results_converted = ConversationService.list_conversations(
        db_session,
        workspace_id=ws_id,
        channel="WHATSAPP",
        status="CONVERTED",
    )
    matched_converted = [c for c in results_converted if c.id == conv.id]
    assert len(matched_converted) == 1, "Joined queries must deduplicate rows to avoid duplicate conversations in CONVERTED filter"

    results_unread = ConversationService.list_conversations(
        db_session,
        workspace_id=ws_id,
        channel="WHATSAPP",
        status="UNREAD",
    )
    matched_unread = [c for c in results_unread if c.id == conv.id]
    assert len(matched_unread) == 1, "Conversations with multiple unread messages must appear exactly once in UNREAD filter"


def test_channel_filtering(db_session: Session, test_setup):
    ws_id = test_setup["workspace"].id

    wa_conv = Conversation(id=uuid.uuid4(), workspace_id=ws_id, phone="+1001", channel=ChannelType.WHATSAPP, status=ConversationStatus.OPEN)
    ig_conv = Conversation(id=uuid.uuid4(), workspace_id=ws_id, phone="+1002", channel=ChannelType.INSTAGRAM, status=ConversationStatus.OPEN)
    tw_conv = Conversation(id=uuid.uuid4(), workspace_id=ws_id, phone="+1003", channel=ChannelType.TWILIO, status=ConversationStatus.OPEN)

    db_session.add_all([wa_conv, ig_conv, tw_conv])
    db_session.commit()

    wa_list = ConversationService.list_conversations(db_session, workspace_id=ws_id, channel="WHATSAPP", status="ALL")
    ig_list = ConversationService.list_conversations(db_session, workspace_id=ws_id, channel="INSTAGRAM", status="ALL")
    tw_list = ConversationService.list_conversations(db_session, workspace_id=ws_id, channel="TWILIO", status="ALL")

    assert wa_conv.id in [c.id for c in wa_list]
    assert ig_conv.id not in [c.id for c in wa_list]

    assert ig_conv.id in [c.id for c in ig_list]
    assert tw_conv.id not in [c.id for c in ig_list]

    assert tw_conv.id in [c.id for c in tw_list]
    assert wa_conv.id not in [c.id for c in tw_list]
