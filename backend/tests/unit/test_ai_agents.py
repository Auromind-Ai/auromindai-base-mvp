import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_temp.db")
os.environ.setdefault("SECRET_KEY", "testsecret_12345678901234567890")
os.environ.setdefault("ENCRYPTION_KEY", "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=")
os.environ.setdefault("ENVIRONMENT", "testing")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.ai_agent import AIAgent
from app.routers.auth import get_current_user

# Setup test client
client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create test user and workspace
    test_user = User(
        id=uuid.uuid4(),
        email=f"test_agent_user_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Santosh Admin"
    )
    db.add(test_user)
    
    test_ws = Workspace(
        id=uuid.uuid4(),
        name="Santosh Workspace",
        created_by=test_user.id
    )
    db.add(test_ws)
    
    member = WorkspaceMember(
        workspace_id=test_ws.id,
        user_id=test_user.id,
        role="admin"
    )
    db.add(member)
    db.commit()
    db.refresh(test_user)
    db.refresh(test_ws)

    yield {"user": test_user, "workspace": test_ws}
    db.close()

def test_models_metadata(setup_db):
    app.dependency_overrides[get_current_user] = lambda: setup_db["user"]
    ws_id = str(setup_db["workspace"].id)
    
    res = client.get(f"/api/agents/meta/models?workspace_id={ws_id}")
    assert res.status_code == 200
    data = res.json()
    assert "providers" in data
    assert len(data["providers"]) > 0
    openai_provider = next(p for p in data["providers"] if p["provider"] == "openai")
    assert any(m["id"] == "gpt-4o" for m in openai_provider["models"])

def test_channels_metadata(setup_db):
    app.dependency_overrides[get_current_user] = lambda: setup_db["user"]
    ws_id = str(setup_db["workspace"].id)
    
    res = client.get(f"/api/agents/meta/channels?workspace_id={ws_id}")
    assert res.status_code == 200
    data = res.json()
    assert "channels" in data
    channels = {c["id"]: c for c in data["channels"]}
    assert "whatsapp" in channels
    assert "instagram" in channels
    assert "website" in channels

def test_draft_persistence(setup_db):
    app.dependency_overrides[get_current_user] = lambda: setup_db["user"]
    ws_id = str(setup_db["workspace"].id)
    
    draft_data = {
        "name": "Draft Agent 1",
        "description": "Saving work in progress",
        "agent_type": "sales_assistant"
    }
    
    # Save draft
    save_res = client.post(f"/api/agents/draft?workspace_id={ws_id}", json=draft_data)
    assert save_res.status_code == 200
    
    # Fetch draft
    get_res = client.get(f"/api/agents/draft?workspace_id={ws_id}")
    assert get_res.status_code == 200
    assert get_res.json()["draft"]["name"] == "Draft Agent 1"
    
    # Clear draft
    del_res = client.delete(f"/api/agents/draft?workspace_id={ws_id}")
    assert del_res.status_code == 200

def test_agent_crud_and_status(setup_db):
    app.dependency_overrides[get_current_user] = lambda: setup_db["user"]
    ws_id = str(setup_db["workspace"].id)
    
    # 1. Create Agent
    create_payload = {
        "name": "Orbion Test Agent",
        "description": "Handles product queries and testing",
        "agent_type": "sales_assistant",
        "language": "English (India)",
        "tone_of_voice": "Friendly & Professional",
        "business_name": "Orbion Store",
        "channels_config": {"whatsapp": {"enabled": True}, "website": {"enabled": True}},
        "channel_settings": {"auto_reply": True, "sync_crm": True, "channel_specific_tone": True},
        "ai_config": {
            "provider": "openai",
            "model": "gpt-4o",
            "temperature": 0.7,
            "max_tokens": 1024,
            "top_p": 1.0,
            "response_format": "markdown",
            "max_response_time": "normal"
        },
        "knowledge_config": {
            "files": [],
            "website_urls": ["https://www.orbionstore.com"],
            "faqs": [{"id": "1", "question": "Do you deliver?", "answer": "Yes nationwide."}]
        }
    }
    
    res = client.post(f"/api/agents?workspace_id={ws_id}", json=create_payload)
    assert res.status_code == 201
    agent_data = res.json()["agent"]
    agent_id = agent_data["id"]
    assert agent_data["name"] == "Orbion Test Agent"
    assert agent_data["status"] == "active"
    
    # 2. List Agents
    list_res = client.get(f"/api/agents?workspace_id={ws_id}")
    assert list_res.status_code == 200
    agents = list_res.json()["agents"]
    assert any(a["id"] == agent_id for a in agents)
    
    # 3. Toggle Status to Paused
    status_res = client.patch(f"/api/agents/{agent_id}/status?workspace_id={ws_id}", json={"status": "paused"})
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "paused"
    
    # 4. Test Chat Sandbox
    test_chat_payload = {
        "agent_id": agent_id,
        "channel": "whatsapp",
        "message": "Do you deliver?"
    }
    chat_res = client.post(f"/api/agents/test-chat?workspace_id={ws_id}", json=test_chat_payload)
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "reply" in chat_data
    assert len(chat_data["reply"]) > 0
    assert chat_data["channel"] == "whatsapp"
    
    # 5. Delete Agent
    del_res = client.delete(f"/api/agents/{agent_id}?workspace_id={ws_id}")
    assert del_res.status_code == 200
    
    # Verify deletion
    verify_res = client.get(f"/api/agents/{agent_id}?workspace_id={ws_id}")
    assert verify_res.status_code == 404

def test_validate_api_key(setup_db):
    app.dependency_overrides[get_current_user] = lambda: setup_db["user"]
    ws_id = str(setup_db["workspace"].id)
    
    # Test with invalid dummy key
    res = client.post(f"/api/agents/meta/validate-key?workspace_id={ws_id}", json={
        "provider": "openai",
        "api_key": "invalid-dummy-key"
    })
    assert res.status_code == 200
    data = res.json()
    assert "valid" in data
    assert data["valid"] is False
    assert "Invalid API key" in data["message"] or "Failed to connect" in data["message"]
