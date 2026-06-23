
from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_process_init
from app.core.config import settings

REDIS_URL = settings.REDIS_URL

celery_app = Celery(
    "auromindai",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="Asia/Kolkata",
    enable_utc=True,

    # Task discovery
    imports=[
    "app.workers.flow_execution",
    "app.workers.scoring_worker",
],

    # Reliability
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    # Redis result cleanup (1 hour)
    result_expires=3600,

    # Celery 6.x broker retry
    broker_connection_retry_on_startup=True,

    # Queue routing — beat vs heavy tasks on separate queues
    task_default_queue="default",
    task_routes={
        "app.workers.flow_execution.sweep_stuck_messages": {"queue": "beat"},
        "app.workers.flow_execution.poll_scheduled_resumes": {"queue": "beat"},
    },


    worker_max_tasks_per_child=500,

    # Redbeat - Redis-based scheduler (restart-safe)
    beat_scheduler="redbeat.RedBeatScheduler",
    redbeat_redis_url=REDIS_URL,
    redbeat_lock_timeout=150,
)

celery_app.conf.beat_schedule = {
    "sweep-stuck-messages": {
        "task": "app.workers.flow_execution.sweep_stuck_messages",
        "schedule": 60.0,
    },
    "poll-scheduled-resumes": {
        "task": "app.workers.flow_execution.poll_scheduled_resumes",
        "schedule": 30.0,
    },
    "purge-old-delivery-logs": {
        "task": "app.workers.flow_execution.purge_old_delivery_logs",
        "schedule": crontab(hour=2, minute=0),
    },
    "archive-old-conversations": {
        "task": "app.workers.flow_execution.archive_old_conversations",
        "schedule": crontab(hour=3, minute=0),
    },
    "daily-recency-decay": {
        "task": "app.workers.scoring_worker.decay_inactive_lead_scores",
        "schedule": crontab(hour=0, minute=0),
    },
}

# @celery_app.on_after_finalize.connect
# def preload_models(sender, **kwargs):
    
#     try:
     
#         print(" RAG models preloaded at worker startup!")
#     except Exception as e:
#         print(f" RAG preload failed (non-critical): {e}")

@worker_process_init.connect
def preload_rag_models(**kwargs):
  
    import os
    import logging
    log = logging.getLogger(__name__)
    pid = os.getpid()
    try:
        from app.services.agentic_rag.rag_service import get_rag_service
        get_rag_service()
        log.info("[Celery PID %d] RAG models preloaded successfully.", pid)
    except Exception as exc:
        log.warning(
            "[Celery PID %d] RAG preload failed (non-critical, will load on first task): %s",
            pid, exc,
        )
