
import sqlite3
import os

# Path to your SQLite DB
DB_PATH = "backend/auromind.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Skipping migration (it will be created fresh).")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(brain_entries)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "status" not in columns:
            print("Adding 'status' column...")
            cursor.execute("ALTER TABLE brain_entries ADD COLUMN status VARCHAR(20) DEFAULT 'completed'")
        else:
            print("'status' column already exists.")
            
        if "error_message" not in columns:
            print("Adding 'error_message' column...")
            cursor.execute("ALTER TABLE brain_entries ADD COLUMN error_message TEXT")
        else:
            print("'error_message' column already exists.")
            
        conn.commit()
        print("Migration successful!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
