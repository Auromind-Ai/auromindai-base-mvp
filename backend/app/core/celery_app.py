from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

REDIS_URL = settings.REDIS_URL

celery_app = Celery(
    "auromindai",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="Asia/Kolkata",
    enable_utc=True,

    # Imports
    imports=["app.workers.tasks", "app.workers.flow_execution"],

    # Reliability
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    #  Redis result cleanup (1 hour)
    result_expires=3600,

    #  Celery 6.x broker retry warning fix
    broker_connection_retry_on_startup=True,

    #  Queue routing — beat vs heavy tasks separate
    task_default_queue="default",
    task_routes={
        "app.workers.flow_execution.sweep_stuck_messages": {"queue": "beat"},
        "app.workers.flow_execution.poll_scheduled_resumes": {"queue": "beat"},
    },

    #  Worker health
    worker_max_tasks_per_child=500,   
    worker_max_memory_per_child=200000,  
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
}

# @celery_app.on_after_finalize.connect
# def preload_models(sender, **kwargs):
    
#     try:
     
#         print(" RAG models preloaded at worker startup!")
#     except Exception as e:
#         print(f" RAG preload failed (non-critical): {e}")

if __name__ == "__main__":
    celery_app.start()