import os
from celery import Celery

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
    imports=["app.workers.tasks", "app.workers.flow_execution"]
)


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