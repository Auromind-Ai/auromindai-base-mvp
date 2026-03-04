from app.database import SessionLocal
from app.models.brain import BrainEntry, BrainChunk

def check_db():
    db = SessionLocal()
    try:
        entries = db.query(BrainEntry).count()
        chunks = db.query(BrainChunk).count()
        print(f"Total Brain Entries: {entries}")
        print(f"Total Brain Chunks: {chunks}")
        
        # List first 5 entries
        sample_entries = db.query(BrainEntry).limit(5).all()
        for i, entry in enumerate(sample_entries):
            print(f"Entry {i+1}: {entry.title} (Status: {entry.status}, Workspace: {entry.workspace_id})")
            
    except Exception as e:
        print(f"Error checking DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
