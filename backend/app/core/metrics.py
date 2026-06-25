import asyncio
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Optional

import psutil
import redis.asyncio as aioredis
from fastapi import FastAPI
from prometheus_client import Counter, Gauge, Summary
from app.core.logger import logger
from app.core.config import settings

# Prometheus metrics
REQUEST_COUNT = Counter(
    "app_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"]
)

REQUEST_LATENCY = Summary(
    "app_request_latency_seconds",
    "Request latency seconds",
    ["method", "path"]
)

ERROR_COUNT = Counter(
    "app_errors_total",
    "Total errors",
    ["path", "status"]
)

CPU_PERCENT = Gauge(
    "system_cpu_percent",
    "CPU usage percent"
)

MEMORY_PERCENT = Gauge(
    "system_memory_percent",
    "Memory usage percent"
)

SYSTEM_METRICS_UPDATE_FAILURES = Counter(
    "system_metrics_update_failures_total",
    "Total system metrics collection failures"
)


_async_redis: Optional[aioredis.Redis] = None


async def init_metrics_redis() -> None:
    """Create the async Redis client.  Call once inside app lifespan startup."""
    global _async_redis
    if settings.REDIS_URL:
        _async_redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
        logger.info("Metrics async Redis client initialised")


async def close_metrics_redis() -> None:
    """Close the async Redis client.  Call once inside app lifespan shutdown."""
    global _async_redis
    if _async_redis is not None:
        try:
            await _async_redis.aclose()
        except Exception:
            pass
        _async_redis = None
        logger.info("Metrics async Redis client closed")


@dataclass
class SystemMetricsSnapshot:
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    updated_at: str | None = None
    healthy: bool = False


class SystemMetricsState:
    def __init__(self, update_interval_seconds: float) -> None:
        self.update_interval_seconds = update_interval_seconds
        self.snapshot = SystemMetricsSnapshot()
        self.lock = asyncio.Lock()

    def _get_lock(self) -> asyncio.Lock:
        if self.lock is None:
            self.lock = asyncio.Lock()  
        return self.lock

    async def update(self, snapshot: SystemMetricsSnapshot) -> None:
        async with self.lock:
            self.snapshot = snapshot

    async def get_snapshot(self) -> dict[str, Any]:
        async with self.lock:
            return asdict(self.snapshot)


def get_metrics_update_interval() -> float:
    from app.services.config_service import config_service
    interval = config_service.get("system_metrics_update_interval", 5)
    
    if interval <= 0:
        logger.warning(
            "Non-positive SYSTEM_METRICS_UPDATE_INTERVAL=%r. Falling back to 5 seconds.",
            interval,
        )
        return 5.0

    return float(interval)


def _collect_system_metrics() -> SystemMetricsSnapshot:
    cpu_percent = psutil.cpu_percent(interval=None)
    memory_percent = psutil.virtual_memory().percent
    collected_at = datetime.now(timezone.utc).isoformat()

    CPU_PERCENT.set(cpu_percent)
    MEMORY_PERCENT.set(memory_percent)

    return SystemMetricsSnapshot(
        cpu_percent=cpu_percent,
        memory_percent=memory_percent,
        updated_at=collected_at,
        healthy=True,
    )


def setup_system_metrics(app: FastAPI, update_interval_seconds: float | None = None) -> None:
    interval = update_interval_seconds if update_interval_seconds is not None else get_metrics_update_interval()
    app.state.system_metrics = SystemMetricsState(update_interval_seconds=interval)
    app.state.system_metrics_task = None


async def collect_and_store_system_metrics(app: FastAPI) -> None:
    state: SystemMetricsState = app.state.system_metrics

    try:
        snapshot = await asyncio.to_thread(_collect_system_metrics)
    except Exception:
        SYSTEM_METRICS_UPDATE_FAILURES.inc()
        logger.exception("System metrics collection failed.")
        previous_snapshot = await state.get_snapshot()
        await state.update(
            SystemMetricsSnapshot(
                cpu_percent=previous_snapshot["cpu_percent"],
                memory_percent=previous_snapshot["memory_percent"],
                updated_at=previous_snapshot["updated_at"],
                healthy=False,
            )
        )
        return

    await state.update(snapshot)


async def system_metrics_updater(app: FastAPI) -> None:
    state: SystemMetricsState = app.state.system_metrics

    while True:
        await collect_and_store_system_metrics(app)
        await asyncio.sleep(state.update_interval_seconds)


async def start_system_metrics_updater(app: FastAPI) -> None:
    if not hasattr(app.state, "system_metrics"):
        setup_system_metrics(app)

    await collect_and_store_system_metrics(app)
    app.state.system_metrics_task = asyncio.create_task(
        system_metrics_updater(app),
        name="system-metrics-updater",
    )


async def stop_system_metrics_updater(app: FastAPI) -> None:
    task = getattr(app.state, "system_metrics_task", None)
    if task is None:
        return

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    finally:
        app.state.system_metrics_task = None


async def get_system_metrics_snapshot(app: FastAPI) -> dict[str, Any]:
    state = getattr(app.state, "system_metrics", None)
    if state is None:
        return asdict(SystemMetricsSnapshot())

    return await state.get_snapshot()



def middleware_record(method: str, path: str, status: int, latency: float) -> None:
    """Record request metrics.  Safe to call from any async context."""

  
    status_str = str(status)
    REQUEST_COUNT.labels(method=method, path=path, status=status_str).inc()
    REQUEST_LATENCY.labels(method=method, path=path).observe(latency)
    if status >= 500:
        ERROR_COUNT.labels(path=path, status=status_str).inc()

    if _async_redis is not None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(
                _redis_record(latency, is_error=(status >= 500)),
                name="metrics-redis-write",
            )
        except RuntimeError:

            pass


async def _redis_record(latency: float, *, is_error: bool) -> None:
    """Fire-and-forget coroutine: write request metrics to Redis."""
    if _async_redis is None:
        return
    try:
        async with _async_redis.pipeline(transaction=False) as pipe:
            pipe.incr("metrics:requests")
            pipe.incrbyfloat("metrics:total_latency", latency)
            if is_error:
                pipe.incr("metrics:errors")
            await pipe.execute()
    except Exception:
        # Redis failures must never surface to callers.
        pass


async def get_metrics() -> dict[str, Any]:

    if _async_redis is None:
        return {"total_api_calls": 0, "avg_response_time": 0, "error_rate": 0}

    try:
        async with _async_redis.pipeline(transaction=False) as pipe:
            pipe.get("metrics:requests")
            pipe.get("metrics:total_latency")
            pipe.get("metrics:errors")
            results = await pipe.execute()

        total = int(results[0] or 0)
        total_latency = float(results[1] or 0)
        errors = int(results[2] or 0)

        avg_response = (total_latency / total) if total > 0 else 0
        error_rate = ((errors / total) * 100) if total > 0 else 0

        return {
            "total_api_calls": total,
            "avg_response_time": round(avg_response * 1000, 2),
            "error_rate": round(error_rate, 2),
        }
    except Exception:
        logger.warning("get_metrics: Redis read failed, returning zeros")
        return {"total_api_calls": 0, "avg_response_time": 0, "error_rate": 0}