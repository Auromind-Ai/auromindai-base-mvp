import asyncio
import logging
from app.core.celery_app import celery_app
from app.database import get_celery_db
from app.services.status_page_service import StatusPageService

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.status_worker.run_system_status_health_checks", bind=True, max_retries=1)
def run_system_status_health_checks(self):
   
    try:
        with get_celery_db() as db:
            asyncio.run(StatusPageService.run_all_health_checks(db))
            logger.info("[STATUS WORKER] System status health checks completed successfully.")
            return {"status": "success"}
    except Exception as exc:
        logger.error(f"[STATUS WORKER] Error running status health checks: {exc}")
        return {"status": "error", "message": str(exc)}


@celery_app.task(name="app.workers.status_worker.dispatch_incident_notification_task", bind=True, max_retries=2)
def dispatch_incident_notification_task(self, incident_id: str, action: str = "opened"):
    """
    Asynchronously dispatches incident notification emails to active status subscribers.
    """
    try:
        with get_celery_db() as db:
            sent_count = StatusPageService.dispatch_subscriber_notifications(db, incident_id, action)
            logger.info(f"[STATUS WORKER] Dispatched incident alert to {sent_count} subscribers.")
            return {"status": "success", "sent_count": sent_count}
    except Exception as exc:
        logger.error(f"[STATUS WORKER] Error dispatching incident notifications: {exc}")
        return {"status": "error", "message": str(exc)}
