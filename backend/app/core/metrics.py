import os
import redis
import psutil
from prometheus_client import Counter, Summary, Gauge

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

# Redis config
REDIS_URL = os.getenv("REDIS_URL")
redis_client = None

if REDIS_URL:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


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

        redis_client.incr("metrics:requests")

        redis_client.incrbyfloat(
            "metrics:total_latency",
            latency
        )

        if int(status) >= 500:
            redis_client.incr("metrics:errors")


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