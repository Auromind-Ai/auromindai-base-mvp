import os
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    print("Starting complete DB cleanup for phone 9345660030...")
    
    # 1. Outbound messages
    r1 = db.execute(text("DELETE FROM outbound_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE phone LIKE '%9345660030%')"))
    print(f"Deleted {r1.rowcount} row(s) from outbound_messages.")
    
    # 2. Messages
    r2 = db.execute(text("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE phone LIKE '%9345660030%')"))
    print(f"Deleted {r2.rowcount} row(s) from messages.")
    
    # 3. Lead score history
    r3 = db.execute(text("DELETE FROM lead_score_history WHERE lead_id IN (SELECT id FROM leads WHERE phone LIKE '%9345660030%' OR conversation_id IN (SELECT id FROM conversations WHERE phone LIKE '%9345660030%'))"))
    print(f"Deleted {r3.rowcount} row(s) from lead_score_history.")
    
    # 4. Leads
    r4 = db.execute(text("DELETE FROM leads WHERE phone LIKE '%9345660030%' OR conversation_id IN (SELECT id FROM conversations WHERE phone LIKE '%9345660030%')"))
    print(f"Deleted {r4.rowcount} row(s) from leads.")
    
    # 5. Flow execution states & traces
    db.execute(text("DELETE FROM flow_execution_traces WHERE conversation_id IN (SELECT id FROM conversations WHERE phone LIKE '%9345660030%')"))
    r5 = db.execute(text("DELETE FROM flow_execution_states WHERE conversation_id IN (SELECT id FROM conversations WHERE phone LIKE '%9345660030%')"))
    print(f"Deleted {r5.rowcount} row(s) from flow_execution_states.")
    
    # 6. Conversations
    r6 = db.execute(text("DELETE FROM conversations WHERE phone LIKE '%9345660030%'"))
    print(f"Deleted {r6.rowcount} row(s) from conversations.")
    
    db.commit()
    print("Cleanup complete!")
finally:
    db.close()
