import os
import json
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

import google.generativeai as genai
from groq import Groq

# Database
from app.database import get_db, engine, Base, SessionLocal

# Core & Middleware
from app.core.websockets import manager
from app.core.logger import logger
from app.core.metrics import setup_system_metrics, start_system_metrics_updater, stop_system_metrics_updater
from app.core.request_logger import RequestLoggingMiddleware
from app.core.middleware import MetricsMiddleware
from app.core.exception_handlers import register_exception_handlers

# Services
from app.services.background_scheduler import EmailSchedulerService
from app.services.cleanup_service import ReservationCleanupSchedulerService
from app.services.chat_service import ChatService, ChatServiceConfig
from app.services.agentic_rag.cache_loader import load_learning_cache

# Routers
from app.routers import (
    auth, mcp, simulation, inbox, learning, brain, followups,
    dashboard, chat, twilio_webhook, integrations, gmail, email,
    automation, admin, metric, public, billing,upload
)
from app.routers.auth import CurrentUser, get_current_user
from app.routers.feedback import router as feedback_router  # Integrated from V2
from app.core.security import verify_workspace_access

load_dotenv()

# ── Lifespan (startup + shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    Base.metadata.create_all(bind=engine)
    logger.info("Auromind Production System Starting...")

    # 1. Load Learning Cache (Integrated from V2)
    db = SessionLocal()
    try:
        load_learning_cache(db)
        logger.info("Learning cache loaded successfully at startup")
    except Exception as e:
        logger.error(f"Failed to load learning cache: {e}")
    finally:
        db.close()

    # 2. Start Schedulers
    scheduler = EmailSchedulerService(engine)
    scheduler.start()
    app.state.email_scheduler = scheduler
    logger.info("Email Scheduler Started")

    reservation_cleanup_scheduler = ReservationCleanupSchedulerService(engine)
    reservation_cleanup_scheduler.start()
    app.state.reservation_cleanup_scheduler = reservation_cleanup_scheduler
    logger.info("Reservation Cleanup Scheduler Started")

    # 3. System metrics
    setup_system_metrics(app)
    await start_system_metrics_updater(app)
    logger.info(
        "System metrics updater started with %.2f second interval",
        app.state.system_metrics.update_interval_seconds,
    )

    yield  # app runs here

    # ── SHUTDOWN ──
    await stop_system_metrics_updater(app)

    if hasattr(app.state, "email_scheduler") and app.state.email_scheduler:
        app.state.email_scheduler.stop()

    if hasattr(app.state, "reservation_cleanup_scheduler") and app.state.reservation_cleanup_scheduler:
        app.state.reservation_cleanup_scheduler.stop()

    logger.info("Auromind Production System Stopped")


# ── App Initialization ────────────────────────────────────────────────────────
app = FastAPI(
    title="Auromind API",
    description="AI-Powered Business Assistant Platform (Production)",
    version="2.0.0",
    lifespan=lifespan,
)

register_exception_handlers(app)

# ── CORS & Middleware ─────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000," \
    "http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MetricsMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# UUID validation middleware — catches malformed UUIDs in path params
from app.core.uuid_validation import UUIDValidationMiddleware
app.add_middleware(UUIDValidationMiddleware)


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id, websocket)


# ── Health Checks ─────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "Auromind API", "version": "2.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])
app.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
app.include_router(inbox.router)
#  app.include_router(learning.router, prefix="/api/learning", tags=["learning"])
app.include_router(brain.router, tags=["brain"])
app.include_router(followups.router)
app.include_router(chat.router)
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(twilio_webhook.router)
app.include_router(integrations.router)
app.include_router(gmail.router)
app.include_router(email.router)
app.include_router(automation.router)
app.include_router(admin.router, tags=["admin"])
app.include_router(metric.router, prefix="/metrics", tags=["metrics"])
app.include_router(public.router)
app.include_router(billing.router, tags=["billing"])
app.include_router(feedback_router)  
app.include_router(upload.router, tags=["upload"])

# ── External AI clients & Chat Service Config ─────────────────────────────────
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

groq_client = None
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)

chat_service_config = ChatServiceConfig(
    google_api_key=GOOGLE_API_KEY,
    groq_client=groq_client,
)


# ── Chat Endpoints (Using ChatService) ────────────────────────────────────────

class ChatQueryRequest(BaseModel):
    message: str
    workspace_id: str


def _verify_workspace(db: Session, current_user: CurrentUser) -> str:
    """Thin wrapper to match the (db, user) arg order used in main.py endpoints."""
    return verify_workspace_access(current_user, db)

@app.post("/chat/query")
async def chat_query(
    request: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Synchronous chat query endpoint (One-off) - Now Async."""
    service = ChatService(chat_service_config)
    workspace_id = _verify_workspace(db, current_user)
    return await service.handle_chat_query(
        db=db,
        message=request.message,
        workspace_id=workspace_id,
        user_id=str(current_user.id),
    )


class ChatRequest(BaseModel):
    message: str
    history: list = []
    model: str = "auto"
    workspace_id: str
    use_rag: bool = True
    document_id: Optional[str] = None
    chat_mode: str = "auto"
    source: str = "internal"
    session_id: Optional[str] = None

@app.post("/api/chat")
async def chat_endpoint(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Streaming chat endpoint using ChatService."""
    service = ChatService(chat_service_config)
    workspace_id = _verify_workspace(db, current_user)

    return StreamingResponse(
        service.handle_stream_chat(

            message=request.message,
            workspace_id=workspace_id,
            session_id=request.session_id,
            use_rag=request.use_rag,
            model=request.model,
            user_id=str(current_user.id),
            document_id=request.document_id,
            chat_mode=request.chat_mode,
            source=request.source,
        ),
        media_type="text/event-stream",
    )
