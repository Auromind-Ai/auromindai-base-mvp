#!/bin/bash
echo "Starting Celery beat in the background..."
celery -A app.core.celery_app beat --loglevel=info &

echo "Starting dummy web server on port ${PORT:-8080} to satisfy Cloud Run..."
python3 -m http.server ${PORT:-8080}
