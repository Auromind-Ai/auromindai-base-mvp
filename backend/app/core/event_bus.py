import logging
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.notifications.notification_rule_engine import NotificationRuleEngine

logger = logging.getLogger("app")


class EventBus:
    

    @classmethod
    def emit(
        cls,
        event_name: str,
        payload: Optional[Dict[str, Any]] = None,
        workspace_id: Optional[uuid.UUID] = None,
        actor_id: Optional[uuid.UUID] = None,
        idempotency_key: Optional[str] = None,
        db: Optional[Session] = None,
        dispatch_immediately: bool = True
    ):
      
        data = payload or {}
        should_close_db = False

        if db is None:
            db = SessionLocal()
            should_close_db = True

        try:
           
            logs = NotificationRuleEngine.process_event(
                db=db,
                event_name=event_name,
                payload=data,
                workspace_id=workspace_id,
                actor_id=actor_id,
                idempotency_key=idempotency_key,
                dispatch_immediately=dispatch_immediately
            )
            logger.info(f"[EventBus] Emitted event '{event_name}' -> Staged {len(logs)} delivery logs.")
            return logs
        except Exception as exc:
            logger.error(f"[EventBus] Failed to process event '{event_name}': {exc}", exc_info=True)
            return []
        finally:
            if should_close_db:
                db.close()


# Convenience global alias
emit_event = EventBus.emit
