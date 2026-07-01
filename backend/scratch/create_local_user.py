import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.auth_service import AuthService

def create_user():
    db = SessionLocal()
    try:
        email = "growwdigitel@gmail.com"
        full_name = "Groww Digitel"
        workspace_name = "Groww Digitel Workspace"
        
        print(f"Creating/Logging in local user: {email}...")
        res = AuthService.email_login(
            db=db,
            email=email,
            full_name=full_name,
            workspace_name=workspace_name,
            ip_address="127.0.0.1",
            device_info="Local CLI Seed"
        )
        print("Success! User verified/created.")
        print(f"User Details: {res['user']['email']} (ID: {res['user']['id']})")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user()
