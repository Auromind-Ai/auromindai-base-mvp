import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.routers.auth import get_current_user
from app.models.user import User
from app.database import SessionLocal, engine

# 1. Fetch a test user from DB
db = SessionLocal()
test_user = db.query(User).filter(User.email == "arun@gmail.com").first()
if not test_user:
    test_user = db.query(User).first()
db.close()

if not test_user:
    print("Error: No users found in database to test with.")
    sys.exit(1)

print(f"Testing with User ID: {test_user.id}, Email: {test_user.email}")

# 2. Override get_current_user dependency
app.dependency_overrides[get_current_user] = lambda: test_user

client = TestClient(app)

# 3. Perform PATCH /users/me/preferences with leadsAlerts = True
payload = {
    "leadsAlerts": True,
    "reminders": True,
    "timezone": "Asia/Kolkata",
    "timezone_auto": False
}
print("\n--- Performing PATCH /users/me/preferences ---")
patch_resp = client.patch("/users/me/preferences", json=payload)
print(f"PATCH status code: {patch_resp.status_code}")
print(f"PATCH response JSON: {patch_resp.json()}")

# 4. Query DB directly using raw SQL to verify JSONB contents
print("\n--- Querying DB directly for preferences ---")
with engine.connect() as conn:
    result = conn.execute(text("SELECT preferences FROM users WHERE id = :user_id"), {"user_id": test_user.id}).first()
    print(f"Preferences in DB: {result[0]}")

# 5. Perform GET /users/me/preferences to verify correct retrieval
print("\n--- Performing GET /users/me/preferences ---")
get_resp = client.get("/users/me/preferences")
print(f"GET status code: {get_resp.status_code}")
print(f"GET response JSON: {get_resp.json()}")

# Clean up override
app.dependency_overrides.clear()
