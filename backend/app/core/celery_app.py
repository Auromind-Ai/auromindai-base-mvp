import os
from celery import Celery
from celery.schedules import crontab
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "auromindai",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    imports=["app.workers.tasks", "app.workers.flow_execution"],
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
)
celery_app.conf.beat_schedule = {
    "sweep-stuck-messages": {
        "task": "app.workers.flow_execution.sweep_stuck_messages",
        "schedule": 60.0,  # every 60 seconds
    },
    "poll-scheduled-resumes": {
        "task": "app.workers.flow_execution.poll_scheduled_resumes",
        "schedule": 30.0,  # every 30 seconds
    },
}

@celery_app.on_after_finalize.connect
def preload_models(sender, **kwargs):
    try:
        from app.services.agentic_rag.rag_service import get_rag_service
        get_rag_service()
        print(" RAG models preloaded at worker startup!")
    except Exception as e:
        print(f"⚠️ RAG preload failed (non-critical): {e}")

if __name__ == "__main__":
    celery_app.start()