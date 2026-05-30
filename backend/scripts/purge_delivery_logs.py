#!/usr/bin/env python
import argparse
import sys
import logging
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.sql import func

# Set up logging
logger = logging.getLogger("purge_delivery_logs")
logger.setLevel(logging.INFO)
file_handler = logging.FileHandler("purge_audit.log")
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.outbound_message import OutboundMessage
from app.models.ai_action import Lead

def purge_logs(days: int):
    db = SessionLocal()
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        query = db.query(OutboundMessage).filter(
            OutboundMessage.status.in_(["sent", "failed"]),
            OutboundMessage.created_at < cutoff_date
        )
        
        count = query.count()
        logger.info(f"Will delete {count} rows older than {days} days.")
        
        if count == 0:
            logger.info("Nothing to delete. Exiting.")
            return

        confirm = input("Are you sure you want to proceed? [y/N]: ").strip().lower()
        if confirm != 'y':
            logger.info("Operation cancelled by user.")
            return

        # Pre-flight safety check
        lead_count_before = db.query(func.count(Lead.id)).scalar()
        
        # Execute deletion
        deleted_count = query.delete(synchronize_session=False)
        
        # Post-flight safety check
        lead_count_after = db.query(func.count(Lead.id)).scalar()
        
        if lead_count_before != lead_count_after:
            db.rollback()
            logger.critical(
                f"CRITICAL SAFETY TRIGGER: Lead count changed from {lead_count_before} to {lead_count_after}! Rollback applied."
            )
            return
            
        db.commit()
        logger.info(f"Successfully purged {deleted_count} delivery logs.")

    except Exception as e:
        db.rollback()
        logger.exception("An error occurred during purge.")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Purge old delivery logs from OutboundMessage table.")
    parser.add_argument("--days", type=int, default=30, help="Number of days to retain (default: 30).")
    args = parser.parse_args()
    
    purge_logs(args.days)
