from fastapi import APIRouter, Request, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from app.core.metrics import get_system_metrics_snapshot

router = APIRouter(tags=["metrics"])

@router.get("/metrics")
async def metrics(request: Request):
    await get_system_metrics_snapshot(request.app)

    return Response(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
