import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_temp.db")
os.environ.setdefault("SECRET_KEY", "testsecret_12345678901234567890")
os.environ.setdefault("ENCRYPTION_KEY", "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=")
os.environ.setdefault("ENVIRONMENT", "testing")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.database import SessionLocal, Base, engine
import app.models
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.lead_scoring import CrmSavedView
from app.utils.auth import create_access_token
from app.main import app


@pytest.fixture
def crm_db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_crm_saved_views_crud(crm_db):
    user_id = uuid.uuid4()
    workspace_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"crm_test_{uuid.uuid4().hex[:8]}@example.com",
        full_name="CRM Tester",
        is_active=True,
    )
    workspace = Workspace(
        id=workspace_id,
        name="CRM Test Workspace",
        created_by=user_id,
    )
    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user_id,
        role="owner",
    )
    crm_db.add_all([user, workspace, member])
    crm_db.commit()

    token = create_access_token({"sub": str(user_id), "user_id": str(user_id), "workspace_id": str(workspace_id)})
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initially request views
    res = client.get(f"/lead-scoring/views?workspace_id={workspace_id}", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    initial_count = len(res.json())

    # 2. Create a saved view
    payload = {
        "name": "High Scoring WhatsApp Leads",
        "filters": {
            "sources": ["whatsapp"],
            "min_score": 75,
            "favorite": True,
        }
    }
    create_res = client.post(f"/lead-scoring/views?workspace_id={workspace_id}", json=payload, headers=headers)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["name"] == "High Scoring WhatsApp Leads"
    assert created["filters"]["sources"] == ["whatsapp"]
    assert created["filters"]["min_score"] == 75
    assert created["filters"]["favorite"] is True
    view_id = created["id"]

    # 3. List contains the new saved view
    list_res = client.get(f"/lead-scoring/views?workspace_id={workspace_id}", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == initial_count + 1
    assert any(item["id"] == view_id for item in items)

    # 4. Delete the saved view
    del_res = client.delete(f"/lead-scoring/views/{view_id}?workspace_id={workspace_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 5. List after deletion
    after_del = client.get(f"/lead-scoring/views?workspace_id={workspace_id}", headers=headers)
    assert after_del.status_code == 200
    assert not any(item["id"] == view_id for item in after_del.json())

