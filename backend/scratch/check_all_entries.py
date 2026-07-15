import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.brain import BrainEntry
from app.models.workspace import Workspace

def check_all():
    db = SessionLocal()
    try:
        # Check workspaces
        workspaces = db.query(Workspace).all()
        print(f"Total workspaces: {len(workspaces)}")
        for w in workspaces:
            print(f"  - Workspace ID: {w.id} | Name: {w.name}")

        # Check brain entries
        entries = db.query(BrainEntry).all()
        print(f"\nTotal BrainEntry documents across ALL workspaces: {len(entries)}")
        for e in entries:
            print(f"  - Entry ID: {e.id} | Workspace ID: {e.workspace_id} | Title: {e.title} | Status: {e.status}")
    except Exception as e:
        print(f"Error checking DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_all()
