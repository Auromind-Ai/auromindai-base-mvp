#!/usr/bin/env python3
"""
Script: delete_chats_by_phone.py
Description: Deletes all chats (conversations, messages, leads, and execution traces)
             associated with a specific phone number.
Usage:
    docker exec auromind_backend python scripts/delete_chats_by_phone.py <phone_number>
    docker exec auromind_backend python scripts/delete_chats_by_phone.py 9345660030
    docker exec auromind_backend python scripts/delete_chats_by_phone.py 9345660030 --dry-run
"""

import sys
import os
import argparse

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.conversation import Conversation
from app.models.ai_action import Lead
from sqlalchemy import text, or_

def delete_chats_by_phone(phone_query: str, dry_run: bool = False):
    clean_query = phone_query.strip()
    if not clean_query:
        print("❌ Error: Phone number cannot be empty.")
        return False

    db = SessionLocal()
    try:
        print(f"\n🔍 Searching for conversations and leads matching: '{clean_query}'...")

        convs = db.query(Conversation).filter(
            or_(
                Conversation.phone.ilike(f"%{clean_query}%"),
                Conversation.external_id.ilike(f"%{clean_query}%")
            )
        ).all()

        matching_leads = db.query(Lead).filter(Lead.phone.ilike(f"%{clean_query}%")).all()

        if not convs and not matching_leads:
            print(f"ℹ️ No conversations or leads found matching '{clean_query}'.")
            return True

        print(f"📋 Found {len(convs)} conversation(s) and {len(matching_leads)} lead(s).\n")

        total_messages_deleted = 0
        total_convs_deleted = 0
        total_leads_deleted = 0

        # Child tables of Conversation
        conv_child_tables = [
            'messages', 'outbound_messages', 'conversation_states',
            'flow_execution_states', 'flow_execution_traces', 'human_escalations',
            'message_executions', 'ai_learning_events', 'followups',
            'sales_pipeline', 'scheduled_resumes', 'support_tickets'
        ]

        for c in convs:
            cid = str(c.id)
            print(f"👉 Conversation ID: {cid} | Channel: {c.channel} | Phone: {c.phone}")

            # 1. Clean up associated leads
            leads = db.query(Lead).filter(Lead.conversation_id == c.id).all()
            for l in leads:
                lid = str(l.id)
                if not dry_run:
                    db.execute(text('DELETE FROM lead_score_history WHERE lead_id = :lid'), {'lid': lid})
                    db.execute(text('DELETE FROM template_logs WHERE lead_id = :lid'), {'lid': lid})
                    db.delete(l)
                print(f"   - Lead deleted: {lid} ({l.name or 'No Name'})")
                total_leads_deleted += 1

            # 2. Clean up child records of conversation
            for tbl in conv_child_tables:
                if not dry_run:
                    del_count = db.execute(text(f'DELETE FROM {tbl} WHERE conversation_id = :cid'), {'cid': cid}).rowcount
                else:
                    del_count = db.execute(text(f'SELECT count(*) FROM {tbl} WHERE conversation_id = :cid'), {'cid': cid}).scalar()
                
                if tbl == 'messages':
                    total_messages_deleted += del_count

                if del_count > 0:
                    action_str = "Would delete" if dry_run else "Deleted"
                    print(f"   - {action_str} {del_count} record(s) from '{tbl}'")

            # 3. Delete the conversation itself
            if not dry_run:
                db.delete(c)
            total_convs_deleted += 1

        # 4. Clean up any remaining standalone leads matching phone
        remaining_leads = db.query(Lead).filter(Lead.phone.ilike(f"%{clean_query}%")).all()
        for l in remaining_leads:
            lid = str(l.id)
            if not dry_run:
                db.execute(text('DELETE FROM lead_score_history WHERE lead_id = :lid'), {'lid': lid})
                db.execute(text('DELETE FROM template_logs WHERE lead_id = :lid'), {'lid': lid})
                db.delete(l)
            print(f"   - Standalone Lead deleted: {lid} ({l.phone})")
            total_leads_deleted += 1

        if dry_run:
            print("\n⚠️ [DRY-RUN MODE] No changes were committed to database.")
        else:
            db.commit()
            print(f"\n✅ [SUCCESS] Deleted {total_convs_deleted} conversation(s), {total_messages_deleted} message(s), and {total_leads_deleted} lead(s) for '{clean_query}'.")

        return True

    except Exception as e:
        db.rollback()
        print(f"\n❌ [ERROR] An error occurred during deletion: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete all chats, messages, and leads for a specific phone number.")
    parser.add_argument("phone", help="Phone number or partial phone query to delete (e.g. 9345660030)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate deletion without committing changes")
    args = parser.parse_args()

    delete_chats_by_phone(args.phone, dry_run=args.dry_run)
