import os
from celery import Celery

# Get Redis URL from env or default
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "auromindai",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    # Auto-discover tasks in specific modules
    imports=["app.workers.tasks"] 
)

if __name__ == "__main__":
    celery_app.start()
