import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.user import User
from app.models.workspace import Workspace
from app.models.notification import Notification
from app.services.notifications.category_resolver import (
    resolve_notification_category,
    NOTIFICATION_CATEGORY_MAPPING,
    NotificationCategory,
)
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationCounts,
)
from app.routers.notifications import get_notifications, mark_as_read, mark_all_as_read
from app.core.pagination import SkipLimitParams
from app.services.notification_service import NotificationService


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db_session):
    user = User(
        id=uuid.uuid4(),
        email="test_user@auromind.ai",
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_resolve_notification_category():
    # Mentions
    assert resolve_notification_category("lead_alert") == "mentions"
    assert resolve_notification_category("lead_assigned") == "mentions"
    assert resolve_notification_category("team_mention") == "mentions"
    assert resolve_notification_category("lead.created") == "mentions"

    # Updates
    assert resolve_notification_category("product_update") == "updates"
    assert resolve_notification_category("ai_credits") == "updates"
    assert resolve_notification_category("workflow_completed") == "updates"
    assert resolve_notification_category("wallet_recharge") == "updates"

    # System
    assert resolve_notification_category("security_alert") == "system"
    assert resolve_notification_category("payment_failed") == "system"
    assert resolve_notification_category("payment_confirmed") == "system"
    assert resolve_notification_category("workflow_failed") == "system"
    assert resolve_notification_category("unknown_system_event") == "system"
    assert resolve_notification_category(None) == "system"


def test_service_category_fallback(db_session, test_user):
    # Service should auto-populate category if category is None in DB (for legacy rows)
    legacy_notif = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="lead_alert",
        category=None,
        title="Legacy Lead",
        message="Legacy lead notification",
        is_read=False,
    )
    db_session.add(legacy_notif)
    db_session.commit()

    res = NotificationService.get_user_notifications(
        db=db_session,
        user_id=test_user.id,
        skip=0,
        limit=10,
    )
    assert len(res["items"]) == 1
    assert res["items"][0].category == "mentions"

    # Schema serializes enriched notification response cleanly
    schema_item = NotificationResponse.model_validate(res["items"][0])
    assert schema_item.category == "mentions"

    counts = NotificationCounts(all=10, unread=3, mentions=2, updates=4, system=4)
    list_resp = NotificationListResponse(
        items=[schema_item],
        unread_count=1,
        counts=counts,
    )
    assert list_resp.counts.all == 10
    assert list_resp.counts.mentions == 2


def test_notification_tabs_filtering_and_counts(db_session, test_user):
    # Create notifications across 3 categories (mentions, updates, system) with mix of read/unread
    n_m1 = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="lead_alert",
        category="mentions",
        title="Lead 1",
        message="Lead received",
        is_read=False,
    )
    n_m2 = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="team_mention",
        category="mentions",
        title="Mention 2",
        message="Mentioned you",
        is_read=True,
    )
    n_u1 = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="product_update",
        category="updates",
        title="Update 1",
        message="New feature released",
        is_read=False,
    )
    n_u2 = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="ai_credits",
        category="updates",
        title="Credits 2",
        message="Credits recharged",
        is_read=True,
    )
    n_s1 = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="security_alert",
        category="system",
        title="Security 1",
        message="New login detected",
        is_read=False,
    )
    n_s2 = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="payment_confirmed",
        category="system",
        title="Payment 2",
        message="Invoice paid",
        is_read=True,
    )

    db_session.add_all([n_m1, n_m2, n_u1, n_u2, n_s1, n_s2])
    db_session.commit()

    pagination = SkipLimitParams(skip=0, limit=50)

    # 1. Fetch All (category=None)
    res_all = get_notifications(
        pagination=pagination,
        category=None,
        db=db_session,
        current_user=test_user,
    )
    assert len(res_all["items"]) == 6
    assert res_all["unread_count"] == 3
    assert res_all["counts"].all == 6
    assert res_all["counts"].unread == 3
    assert res_all["counts"].mentions == 2
    assert res_all["counts"].updates == 2
    assert res_all["counts"].system == 2

    # 2. Fetch Unread tab
    res_unread = get_notifications(
        pagination=pagination,
        category="unread",
        db=db_session,
        current_user=test_user,
    )
    assert len(res_unread["items"]) == 3
    assert all(item.is_read is False for item in res_unread["items"])
    # Tab counts remain global and accurate
    assert res_unread["counts"].all == 6
    assert res_unread["counts"].unread == 3

    # 3. Fetch Mentions tab
    res_mentions = get_notifications(
        pagination=pagination,
        category="mentions",
        db=db_session,
        current_user=test_user,
    )
    assert len(res_mentions["items"]) == 2
    assert set(item.title for item in res_mentions["items"]) == {"Lead 1", "Mention 2"}

    # 4. Fetch Updates tab
    res_updates = get_notifications(
        pagination=pagination,
        category="updates",
        db=db_session,
        current_user=test_user,
    )
    assert len(res_updates["items"]) == 2
    assert set(item.title for item in res_updates["items"]) == {"Update 1", "Credits 2"}

    # 5. Fetch System tab
    res_system = get_notifications(
        pagination=pagination,
        category="system",
        db=db_session,
        current_user=test_user,
    )
    assert len(res_system["items"]) == 2
    assert set(item.title for item in res_system["items"]) == {"Security 1", "Payment 2"}


def test_notification_read_endpoints(db_session, test_user):
    notif = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="lead_alert",
        category="mentions",
        title="Unread Lead",
        message="Please check",
        is_read=False,
    )
    db_session.add(notif)
    db_session.commit()

    # Mark single read
    updated = mark_as_read(id=notif.id, db=db_session, current_user=test_user)
    assert updated.is_read is True

    # Mark all read
    notif2 = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="system",
        category="system",
        title="System Notice",
        message="Notice body",
        is_read=False,
    )
    db_session.add(notif2)
    db_session.commit()

    res = mark_all_as_read(db=db_session, current_user=test_user)
    assert res["status"] == "success"

    db_session.refresh(notif2)
    assert notif2.is_read is True


def test_notification_service_creates_with_category(db_session, test_user):
    ws = Workspace(id=uuid.uuid4(), name="Test Workspace")
    db_session.add(ws)
    db_session.commit()

    # Create lead alert -> should auto-derive category='mentions'
    created = NotificationService.notify(
        db=db_session,
        user_id=test_user.id,
        workspace_id=ws.id,
        type="lead_alert",
        title="New Lead Notification",
        message="Lead has arrived",
    )
    assert created is not None
    assert created.category == "mentions"

    # Create explicit category
    created_custom = NotificationService.notify(
        db=db_session,
        user_id=test_user.id,
        workspace_id=ws.id,
        type="custom_type",
        category="updates",
        title="Custom Update",
        message="Custom update content",
    )
    assert created_custom is not None
    assert created_custom.category == "updates"
