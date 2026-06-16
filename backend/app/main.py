from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Core
from app.core.config import settings
from app.core.middleware import MetricsMiddleware
from app.core.websockets import manager
from app.core.logger import logger
from app.core.metrics import setup_system_metrics, start_system_metrics_updater, stop_system_metrics_updater
from app.core.request_logger import RequestLoggingMiddleware
from app.core.exception_handlers import register_exception_handlers
from app.core.uuid_validation import UUIDValidationMiddleware
from app.core.admin_middleware import AdminConsoleMiddleware
from app.core.startup import ( init_schedulers,
    shutdown_schedulers, init_llm_router,
    init_pubsub, shutdown_pubsub,
    init_metrics, shutdown_metrics,
)

# Routers
from app.routers import (
    auth, brain, dashboard, chat,
    integrations, gmail, email, automation, admin,
    public, billing, upload
)
from app.routers.feedback import router as feedback_router
from app.routers.template import router as template_router
from app.routers.lead_scoring import router as lead_scoring_router
from app.routers.inbox_chennal import meta_what, conversations, instagram, twilio_webhook
from app.routers.realtime import router as realtime_router
from app.routers.two_factor import router as two_factor_router
from app.routers.account import router as account_router

# Lifespan 
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Auromind Production System Starting...")
    init_schedulers(app)
    await init_llm_router(app)
    await init_pubsub(app)
    await init_metrics(app)              # async Redis for metrics
    setup_system_metrics(app)
    await start_system_metrics_updater(app)
    yield
    await stop_system_metrics_updater(app)
    await shutdown_pubsub(app)
    await shutdown_metrics(app)          # close metrics Redis client
    shutdown_schedulers(app)
    logger.info("Auromind Production System Stopped")


# App
app = FastAPI(
    title="Auromind API",
    description="AI-Powered Business Assistant Platform (Production)",
    version="2.0.0",
    lifespan=lifespan,
)

register_exception_handlers(app)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MetricsMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(UUIDValidationMiddleware)
app.add_middleware(AdminConsoleMiddleware)


# Health 
@app.get("/")
async def root():
    return {"message": "Auromind API", "version": "2.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(account_router, prefix="/account", tags=["account"])
app.include_router(two_factor_router, prefix="/2fa", tags=["2fa"])                                         
app.include_router(conversations.router)                                 
app.include_router(twilio_webhook.router) 
app.include_router(meta_what.router, prefix="/api")
app.include_router(instagram.router, prefix="/api")
app.include_router(brain.router, tags=["brain"])
app.include_router(chat.router)
app.include_router(dashboard.router,    prefix="/dashboard", tags=["dashboard"])
app.include_router(integrations.router)
app.include_router(gmail.router)
app.include_router(email.router)
app.include_router(automation.router)
app.include_router(template_router)
app.include_router(feedback_router)
app.include_router(admin.router, tags=["admin"])
app.include_router(public.router)
app.include_router(billing.router, tags=["billing"])
app.include_router(upload.router,tags=["upload"])
app.include_router(lead_scoring_router, tags=["lead-scoring"])
app.include_router(realtime_router)

