from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.core.logger import logger
from app.core.config import settings
from app.services.background_scheduler import EmailSchedulerService
from app.services.cleanup_service import ReservationCleanupSchedulerService
from app.services.agentic_rag.cache_loader import load_learning_cache
from app.services.agentic_rag.rag_service import get_rag_service
from app.core.chat_provider import get_llm_router

def init_rag(app):
    orchestrator = get_rag_service()
    app.state.orchestrator = orchestrator
    logger.info("RAG service initialized")


def init_learning_cache():
    db: Session = SessionLocal()
    try:
        load_learning_cache(db)
        logger.info("Learning cache loaded")
    except Exception as e:
        logger.error(f"Learning cache failed: {e}")
    finally:
        db.close()


def init_schedulers(app):
    # ⚠️ Multi-worker safe check
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