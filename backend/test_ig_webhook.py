import requests
import json
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.workspace import Workspace

def get_test_workspace():
    db = SessionLocal()
    try:
        # Find a workspace with an Instagram account linked
        workspace = db.query(Workspace).filter(Workspace.meta_ig_id.isnot(None)).first()
        if not workspace:
            print("❌ No workspace found with a connected Instagram account (meta_ig_id is null).")
            return None
        return workspace
    finally:
        db.close()

def send_mock_webhook(workspace):
    url = "http://localhost:8000/api/instagram/webhook"
    
    instagram_account_id = workspace.meta_ig_id
    sender_id = "test_user_id_" + str(uuid.uuid4())[:8]
    
    payload = {
        "object": "instagram",
        "entry": [
            {
                "id": instagram_account_id,
                "time": 123456789,
                "messaging": [
                    {
                        "sender": {"id": sender_id},
                        "recipient": {"id": instagram_account_id},
                        "timestamp": 123456789,
                        "message": {
                            "mid": "mid." + str(uuid.uuid4()),
                            "text": "Hello! This is a test message from the local script."
                        }
                    }
                ]
            }
        ]
    }
    
    print(f"🚀 Sending mock webhook to {url}")
    print(f"📦 Target Instagram Account ID: {instagram_account_id}")
    print(f"👤 Mock Sender ID: {sender_id}")
    print("--------------------------------------------------")
    print(json.dumps(payload, indent=2))
    print("--------------------------------------------------")
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"\n✅ Server responded with HTTP {response.status_code}")
        print("Response body:", response.text)
    except Exception as e:
        print("\n❌ Failed to connect to server:", e)

if __name__ == "__main__":
    workspace = get_test_workspace()
    if workspace:
        send_mock_webhook(workspace)
