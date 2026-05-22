from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.core.logger import logger
from app.core.config import settings
from app.services.background_scheduler import EmailSchedulerService
from app.services.cleanup_service import ReservationCleanupSchedulerService
from app.services.agentic_rag.cache_loader import load_learning_cache
from app.services.agentic_rag.rag_service import get_rag_service
from app.core.chat_provider import get_llm_router
from app.core.redis_pubsub import RedisPubSubService
import app.core.redis_pubsub as _pubsub_module
from app.core.websockets import manager
from app.core.metrics import init_metrics_redis, close_metrics_redis

def init_rag(app):
    import os
    pid = os.getpid()
    logger.info("[PID %d] Warming up RAG system (model loads once per process)...", pid)
    orchestrator = get_rag_service()
    app.state.orchestrator = orchestrator
    logger.info("[PID %d] RAG service ready.", pid)


def init_learning_cache():
    db: Session = SessionLocal()
    try:
        load_learning_cache(db)
        logger.warning(
            "Learning cache initialization skipped pending tenant-scoped redesign"
        )
    except Exception as e:
        logger.error(f"Learning cache disablement failed: {e}")
    finally:
        db.close()


def init_schedulers(app):
    #  Multi-worker safe check
    if not settings.SCHEDULER_ENABLED:
        logger.warning("Schedulers disabled (multi-worker mode)")
        return

    email_scheduler = EmailSchedulerService(engine)
    email_scheduler.start()
    app.state.email_scheduler = email_scheduler
    logger.info("Email Scheduler started")

    cleanup_scheduler = ReservationCleanupSchedulerService(engine)
    cleanup_scheduler.start()
    app.state.reservation_cleanup_scheduler = cleanup_scheduler
    logger.info("Cleanup Scheduler started")


def shutdown_schedulers(app):
    if hasattr(app.state, "email_scheduler") and app.state.email_scheduler:
        app.state.email_scheduler.stop()

    if hasattr(app.state, "reservation_cleanup_scheduler") and app.state.reservation_cleanup_scheduler:
        app.state.reservation_cleanup_scheduler.stop()

async def init_llm_router(app):
    router = await get_llm_router()
    app.state.llm_router = router
    logger.info("LLMRouter singleton initialized")


async def init_pubsub(app) -> None:
    try:
        service = RedisPubSubService(manager)
        await service.start()
        app.state.pubsub_service = service
        _pubsub_module.pubsub_service = service
        logger.info("Redis Pub/Sub service started")
    except Exception as exc:
        logger.error(
            "[DEGRADED MODE] Redis Pub/Sub failed to start (%s: %s). "
            "Realtime events disabled; REST APIs unaffected.",
            type(exc).__name__,
            exc,
        )
        app.state.pubsub_service = None
        _pubsub_module.pubsub_service = None


async def shutdown_pubsub(app) -> None:
    """Gracefully stop the Redis Pub/Sub subscriber."""
    service = getattr(app.state, "pubsub_service", None)
    if service:
        await service.stop()
        _pubsub_module.pubsub_service = None
        logger.info("Redis Pub/Sub service stopped")


async def init_metrics(app) -> None:
    """Initialise the async Redis client used by the metrics module."""
    await init_metrics_redis()
    logger.info("Metrics Redis client started")


async def shutdown_metrics(app) -> None:
    """Close the async Redis client used by the metrics module."""
    await close_metrics_redis()
    logger.info("Metrics Redis client stopped")
