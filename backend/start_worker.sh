#!/bin/bash
echo "Starting Celery worker in the background..."
celery -A app.core.celery_app worker --loglevel=info &

echo "Starting dummy web server on port ${PORT:-8080} to satisfy Cloud Run..."
python3 -m http.server ${PORT:-8080}
