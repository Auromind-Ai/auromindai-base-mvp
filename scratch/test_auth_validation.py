import sys
import os
from dotenv import load_dotenv
load_dotenv("backend/.env")

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../backend")
from app.database import SessionLocal
from app.services.auth_service import AuthService
from app.models.user import User

db = SessionLocal()

# Cleanup test user if exists
test_email = "validation_test_user@example.com"
user = db.query(User).filter(User.email == test_email).first()
if user:
    # Delete workspace members, workspaces and user
    from app.models.workspace import Workspace, WorkspaceMember
    members = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).all()
    for m in members:
        db.delete(m)
    workspaces = db.query(Workspace).filter(Workspace.created_by == user.id).all()
    for w in workspaces:
        db.delete(w)
    db.delete(user)
    db.commit()

print("--- 1. Testing Login for non-existent user (should raise ValueError) ---")
try:
    AuthService.send_otp(db, test_email, "login")
    print("❌ Failed: Did not raise ValueError for login on non-existent email")
except ValueError as e:
    print(f"✅ Success: Raised ValueError: {e}")

print("\n--- 2. Testing Signup for non-existent user (should succeed in sending OTP) ---")
try:
    AuthService.send_otp(db, test_email, "signup")
    print("✅ Success: OTP sent successfully for signup")
except ValueError as e:
    print(f"❌ Failed: Raised ValueError: {e}")

print("\n--- 3. Testing Google Auth login for non-existent user (should raise ValueError) ---")
try:
    AuthService.google_auth(db, test_email, "Test User", "login")
    print("❌ Failed: Google Auth did not raise ValueError for login on non-existent email")
except ValueError as e:
    print(f"✅ Success: Google Auth raised ValueError: {e}")

print("\n--- 4. Testing Google Auth signup for non-existent user (should succeed) ---")
try:
    res = AuthService.google_auth(db, test_email, "Test User", "signup")
    print("✅ Success: Google Auth signup succeeded and returned token")
except ValueError as e:
    print(f"❌ Failed: Google Auth signup raised ValueError: {e}")

print("\n--- 5. Testing Signup after user is registered (should raise ValueError) ---")
try:
    AuthService.send_otp(db, test_email, "signup")
    print("❌ Failed: Did not raise ValueError for signup on existing email")
except ValueError as e:
    print(f"✅ Success: Raised ValueError: {e}")

print("\n--- 6. Testing Google Auth signup after user is registered (should raise ValueError) ---")
try:
    AuthService.google_auth(db, test_email, "Test User", "signup")
    print("❌ Failed: Google Auth signup did not raise ValueError for existing email")
except ValueError as e:
    print(f"✅ Success: Google Auth signup raised ValueError: {e}")

print("\n--- 7. Testing Login after user is registered (should succeed) ---")
try:
    AuthService.send_otp(db, test_email, "login")
    print("✅ Success: OTP sent successfully for login")
except ValueError as e:
    print(f"❌ Failed: Raised ValueError: {e}")

# Clean up again
user = db.query(User).filter(User.email == test_email).first()
if user:
    from app.models.workspace import Workspace, WorkspaceMember
    members = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).all()
    for m in members:
        db.delete(m)
    workspaces = db.query(Workspace).filter(Workspace.created_by == user.id).all()
    for w in workspaces:
        db.delete(w)
    db.delete(user)
    db.commit()
print("\nCleanup done!")
