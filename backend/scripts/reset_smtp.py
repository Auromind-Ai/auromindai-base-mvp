import sys
import os

# Add the backend directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.platform_setting import PlatformSetting

def reset_smtp():
    db = SessionLocal()
    try:
        keys_to_delete = ["smtp_host", "smtp_port", "smtp_user", "smtp_password"]
        deleted_count = 0
        for key in keys_to_delete:
            setting = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
            if setting:
                db.delete(setting)
                deleted_count += 1
        db.commit()
        print(f"Successfully deleted {deleted_count} SMTP override settings from the database.")
        print("The backend will now fall back to reading SMTP settings from your .env file!")
    except Exception as e:
        db.rollback()
        print(f"Error resetting SMTP settings: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_smtp()
