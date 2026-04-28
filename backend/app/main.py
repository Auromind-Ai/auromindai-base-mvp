import os

from dotenv import load_dotenv
from app.core.middleware import MetricsMiddleware
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.core.websockets import manager
from app.services.background_scheduler import EmailSchedulerService
from app.routers import auth, mcp, simulation, inbox, learning, brain, followups, dashboard, chat, integrations, gmail, email, automation, admin, metric

from app.models.conversation import ChatSession, ChatMessage
import uuid
from datetime import datetime
from fastapi.responses import StreamingResponse
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
from app.database import SessionLocal
from app.database import Base, engine
from app.services.agentic_rag.rag_service import build_rag_system
from app.routers.inbox_chennal import meta_what, twilio_webhook
from app.routers.inbox_chennal import conversations, instagram
from app.routers.template import router as template_router

# Routers
from app.routers import (
    auth, mcp, simulation, inbox, learning, brain, followups,
    dashboard, chat, twilio_webhook, integrations, gmail, email,
    automation, admin, metric, public, billing,upload
)
from app.routers.auth import CurrentUser, get_current_user
from app.routers.feedback import router as feedback_router  # Integrated from V2
from app.core.security import verify_workspace_access
from app.services.agentic_rag.guardrails_service import GuardrailsService
from app.services.llm_router import LLMRouter

load_dotenv()

# ── Lifespan (startup + shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    Base.metadata.create_all(bind=engine)
    logger.info("Auromind Production System Starting...")
    orchestrator = build_rag_system()
    app.state.orchestrator = orchestrator

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


# CORS middleware - Hardened for local development
# IMPORTANT: In FastAPI, middleware runs in REVERSE order of addition.
# CORSMiddleware must be added LAST so it runs FIRST (outermost),
# ensuring CORS headers are set before other middleware can interfere.
FRONTEND_URL = os.getenv("FRONTEND_URL", "")

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(filter(None, [
        "http://localhost:3000",
        "https://hkfpvzwm-3000.inc1.devtunnels.ms",
        FRONTEND_URL,  # picks up from .env automatically
    ])),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Health Checks ─────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "Auromind API", "version": "2.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])
# app.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
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
app.include_router(feedback_router)
app.include_router(meta_what.router, prefix="/api")
app.include_router(conversations.router)
app.include_router(instagram.router, prefix="/api")
app.include_router(template_router)
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

@app.post("/chat/query")
async def chat_query(
    request: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Safe chat query with guardrails + RAG"""
    try:
        workspace_id = _verify_workspace(db, current_user)

        # Guardrails
        guard = GuardrailsService()
        is_safe, reason, safe_query = guard.check_query(request.message)

        if not is_safe:
            return {
                "answer": f"Blocked: {reason}",
                "sources": [],
                "actions": []
            }

        # RAG
        orchestrator = app.state.orchestrator
        result = await orchestrator.agent_loop(
            db=db,
            workspace_id=workspace_id,
            query=safe_query
        )

        return result

    except Exception as e:
        logger.error(f"Chat query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _verify_workspace(db: Session, current_user: CurrentUser) -> str:
    """Thin wrapper to match the (db, user) arg order used in main.py endpoints."""
    return verify_workspace_access(current_user, db)



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

    async def event_generator():
        full_response = None  # always defined; set when RAG or LLM produces a response
        # 3. RAG Retrieval
        rag_answered = False

        if request.use_rag and request.workspace_id:
            try:

                guard = GuardrailsService()

                #Secure pipeline (INPUT)
                guard_result = await guard.secure_pipeline(request.message)

                if guard_result["status"] == "blocked":
                    yield f"{json.dumps({'content': guard_result['message']})}\n"
                    return

                safe_query = guard_result["safe_query"]

                #RAG
                orchestrator = app.state.orchestrator
                answer = await orchestrator.agent_loop(
                    db=db,
                    workspace_id=request.workspace_id,
                    query=safe_query
                )

                if answer:
                   
                    if isinstance(answer, dict):
                        result = answer
                    else:
                        result = {
                            "answer": answer,
                            "meta": {
                                "query": request.message,
                                "rewritten_query": request.message,
                                "tool": "unknown",
                                "model": request.model,
                                "confidence_score": None,
                                "source": "fallback"
                            }
                        }

                    safe_answer = await guard.secure_response(result["answer"])

                    yield json.dumps({
                        "content": safe_answer,
                        "meta": result.get("meta")
                    })
                    full_response = safe_answer
                    rag_answered = True

                    #DEBUG
                    print("RAG META SENT:", result.get("meta"))

            except Exception as rag_error:
                print(f"RAG Retrieval failed: {rag_error}")

        # 4. LLM Generation (if no RAG answer)
        if not rag_answered:
            try:
                router = LLMRouter()

                result = await router.generate(
                    request.message,
                    model=request.model
                )

                content = result["content"]
                full_response = content

                yield f"{json.dumps({'content': content})}\n"
                fallback_meta = {
                    "query": request.message,
                    "rewritten_query": request.message,   # fallback safe
                    "tool": "reasoning",                # 🔥 NOT hardcoded random — logical default
                    "model": result.get("model", request.model),
                    "confidence_score": None,           # unknown → don’t fake
                    "source": "llm"
                }

                yield f"{json.dumps({'meta': fallback_meta})}\n"

                print("LLM RESPONSE SENT (no meta)")

            except Exception as e:
                yield f"{json.dumps({'error': str(e)})}\n"
        

        # 5. Persist AI Message
        if request.session_id and full_response:
             ai_msg = ChatMessage(
                id=str(uuid.uuid4()),
                session_id=request.session_id,
                role="assistant",
                content=full_response
             )
             db.add(ai_msg)
             
             # Update session timestamp
             session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
             if session:
                 session.updated_at = datetime.utcnow()
             
             db.commit()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
