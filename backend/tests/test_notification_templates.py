import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.user import User
from app.models.workspace import Workspace
from app.models.notification_template import NotificationTemplate
from app.services.notification_template_service import NotificationTemplateService
from app.services.notification_service import NotificationService
from app.core.enums import PlatformRole


# Test DB Setup (SQLite in memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)
    NotificationTemplateService.clear_cache()


def test_placeholder_render_text():
    template = "Hi {{user_name}}, welcome to {{workspace_name}}! IP: {{ip_address}}."
    context = {
        "user_name": "Arun",
        "workspace_name": "AuroMind AI",
        "ip_address": "127.0.0.1"
    }
    rendered = NotificationTemplateService.render_text(template, context)
    assert rendered == "Hi Arun, welcome to AuroMind AI! IP: 127.0.0.1."


def test_placeholder_render_missing_keys():
    template = "Hello {{user_name}}, your code is {{otp_code}}."
    context = {"user_name": "Arun"}
    rendered = NotificationTemplateService.render_text(template, context)
    assert rendered == "Hello Arun, your code is ."


def test_template_service_fallback(db):
    tpl = NotificationTemplateService.get_template(db, "welcome_signup", channel="email")
    assert tpl is not None
    assert tpl["category"] == "Security"
    assert "{{workspace_name}}" in tpl["message"] or "{{user_name}}" in tpl["message"]


def test_template_crud_and_cache(db):
    new_tpl = NotificationTemplate(
        id=uuid.uuid4(),
        category="Security",
        template_key="custom_security_alert",
        name="Custom Security Alert",
        title="Alert for {{user_name}}",
        subject="Security Notice",
        message="Suspicious activity on {{workspace_name}}.",
        channel="in_app",
        is_active=True
    )
    db.add(new_tpl)
    db.commit()

    fetched = NotificationTemplateService.get_template(db, "custom_security_alert", channel="in_app")
    assert fetched is not None
    assert fetched["name"] == "Custom Security Alert"

    # Update template
    new_tpl.message = "Updated security text for {{workspace_name}}."
    db.commit()
    NotificationTemplateService.clear_cache("custom_security_alert", "in_app")

    fetched_updated = NotificationTemplateService.get_template(db, "custom_security_alert", channel="in_app")
    assert fetched_updated["message"] == "Updated security text for {{workspace_name}}."


def test_notification_service_notify_integration(db):
    user = User(
        id=uuid.uuid4(),
        email="arun@example.com",
        full_name="Arun Kumar",
        platform_role=PlatformRole.PLATFORM_ADMIN.value
    )
    ws = Workspace(
        id=uuid.uuid4(),
        name="AuroMind AI",
        created_by=user.id
    )
    db.add(user)
    db.add(ws)
    db.commit()

    notif = NotificationService.notify(
        db=db,
        user_id=user.id,
        workspace_id=ws.id,
        type="welcome_signup",
        template_key="welcome_signup",
        variables={"user_name": "Arun Kumar", "workspace_name": "AuroMind AI"}
    )

    assert notif is not None
    assert notif.type == "welcome_signup"
    assert "AuroMind AI" in notif.message or "Arun" in notif.message or "welcome" in notif.message.lower()
