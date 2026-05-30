import asyncio
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any
import psutil
import redis
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

# Redis config
REDIS_URL = settings.REDIS_URL
redis_client = None

if REDIS_URL:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


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
    interval = settings.SYSTEM_METRICS_UPDATE_INTERVAL
    
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


def middleware_record(method, path, status, latency):

    REQUEST_COUNT.labels(
        method=method,
        path=path,
        status=str(status)
    ).inc()

    REQUEST_LATENCY.labels(
        method=method,
        path=path
    ).observe(latency)

    if int(status) >= 500:
        ERROR_COUNT.labels(
            path=path,
            status=str(status)
        ).inc()

    if redis_client:
        try:
            redis_client.incr("metrics:requests")
            redis_client.incrbyfloat("metrics:total_latency", latency)  
            if int(status) >= 500:
                redis_client.incr("metrics:errors")
        except Exception:
            pass  


def get_metrics():

    if not redis_client:
        return {
            "total_api_calls": 0,
            "avg_response_time": 0,
            "error_rate": 0
        }

    total = int(redis_client.get("metrics:requests") or 0)
    total_latency = float(redis_client.get("metrics:total_latency") or 0)
    errors = int(redis_client.get("metrics:errors") or 0)

    avg_response = 0
    error_rate = 0

    if total > 0:
        avg_response = total_latency / total
        error_rate = (errors / total) * 100

    return {
        "total_api_calls": total,
        "avg_response_time": round(avg_response * 1000, 2),
        "error_rate": round(error_rate, 2)
    }