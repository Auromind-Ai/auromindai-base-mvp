from fastapi import APIRouter, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import psutil
from app.core.metrics import CPU_PERCENT, MEMORY_PERCENT

router = APIRouter(tags=["metrics"])

@router.get("/metrics")
def metrics():

    CPU_PERCENT.set(psutil.cpu_percent())
    MEMORY_PERCENT.set(psutil.virtual_memory().percent)

    return Response(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )