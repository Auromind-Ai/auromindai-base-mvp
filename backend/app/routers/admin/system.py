import redis as redis_lib
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any
from app.core.metrics import get_metrics, get_system_metrics_snapshot
from app.core.config import settings
router = APIRouter(tags=["system"])



def get_queue_depth() -> int:
    """Return total pending tasks across Celery queues by inspecting Redis list lengths."""
    try:
        r = redis_lib.Redis.from_url(settings.REDIS_URL)
        default_len = r.llen("default") or 0
        beat_len = r.llen("beat") or 0
        return int(default_len) + int(beat_len)
    except Exception:
        return 0


def get_cache_hit_rate() -> float:
    """Return Redis cache hit rate as a percentage (0.0–100.0), rounded to 1 dp."""
    try:
        r = redis_lib.Redis.from_url(settings.REDIS_URL)
        info = r.info("stats")
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 1)
    except Exception:
        return 0.0


@router.get("/system-health")
async def get_system_health(request: Request) -> Dict[str, Any]:

    try:
        system_metrics = await get_system_metrics_snapshot(request.app)
        metrics_data = await get_metrics()

        return {
            "api_calls": metrics_data["total_api_calls"],
            "avg_response_time": metrics_data["avg_response_time"],
            "error_rate": metrics_data["error_rate"],
            "cpu_percent": system_metrics["cpu_percent"],
            "memory_percent": system_metrics["memory_percent"],
            "system_metrics_updated_at": system_metrics["updated_at"],
            "system_metrics_healthy": system_metrics["healthy"],
            "queue_depth": get_queue_depth(),
            "cache_hit_rate": get_cache_hit_rate(),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching system health: {str(e)}"
        )

