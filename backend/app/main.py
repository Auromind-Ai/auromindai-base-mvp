from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
from app.core.startup import (
    init_rag, init_learning_cache, init_schedulers,
    shutdown_schedulers, init_llm_router,
    init_pubsub, shutdown_pubsub,
    init_metrics, shutdown_metrics,
)

# Routers
from app.routers import (
    auth, inbox, brain, followups, dashboard, chat,
    integrations, gmail, email, automation, admin,
    metric, public, billing, upload
)
from app.routers.feedback import router as feedback_router
from app.routers.template import router as template_router
from app.routers.inbox_chennal import meta_what, conversations, instagram, twilio_webhook
from app.routers.realtime import router as realtime_router


#  Lifespan 
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Auromind Production System Starting...")
    init_rag(app)
    init_learning_cache()
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


#  App ─
app = FastAPI(
    title="Auromind API",
    description="AI-Powered Business Assistant Platform (Production)",
    version="2.0.0",
    lifespan=lifespan,
)

register_exception_handlers(app)

#  Middleware─
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


#  Health 
@app.get("/")
async def root():
    return {"message": "Auromind API", "version": "2.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


#  Routers ─

# Auth
app.include_router(auth.router,         prefix="/auth",      tags=["auth"])

# Inbox
app.include_router(inbox.router)                                          
app.include_router(conversations.router)                                 

# Twilio 
app.include_router(twilio_webhook.router)

# WhatsApp (Meta) 
app.include_router(meta_what.router,    prefix="/api")

# Instagram  
app.include_router(instagram.router,    prefix="/api")

# Brain / AI
app.include_router(brain.router,                             tags=["brain"])
app.include_router(chat.router)

# Features
app.include_router(followups.router)
app.include_router(dashboard.router,    prefix="/dashboard", tags=["dashboard"])
app.include_router(integrations.router)
app.include_router(gmail.router)
app.include_router(email.router)
app.include_router(automation.router)
app.include_router(template_router)
app.include_router(feedback_router)

# Admin / Ops
app.include_router(admin.router,                             tags=["admin"])
app.include_router(metric.router,       prefix="/metrics",   tags=["metrics"])
app.include_router(public.router)

# Billing & Upload
app.include_router(billing.router,                           tags=["billing"])
app.include_router(upload.router,                            tags=["upload"])

# Realtime WebSocket
app.include_router(realtime_router)                         