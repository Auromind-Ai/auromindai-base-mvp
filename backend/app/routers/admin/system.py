from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import psutil

from app.database import get_db
from app.core.metrics import CPU_PERCENT, MEMORY_PERCENT, get_metrics

router = APIRouter(tags=["system"])


CPU_PERCENT.set(psutil.cpu_percent())
MEMORY_PERCENT.set(psutil.virtual_memory().percent)
@router.get("/system-health")
async def get_system_health(db: Session = Depends(get_db)) -> Dict[str, Any]:

    try:

        metrics_data = get_metrics()

        return {
            "api_calls": metrics_data["total_api_calls"],
            "avg_response_time": metrics_data["avg_response_time"],
            "error_rate": metrics_data["error_rate"],
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            # placeholder values (can be dynamic later)
            "queue_depth": 12,
            "cache_hit_rate": 92.4,
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Error fetching system health: {str(e)}"
        )