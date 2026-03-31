from dotenv import load_dotenv
from app.core.middleware import MetricsMiddleware
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
<<<<<<< HEAD
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.core.websockets import manager
from app.services.agentic_rag.rag_service import get_rag_service
from app.services.background_scheduler import EmailSchedulerService
from app.routers import auth, mcp, simulation, inbox, learning, brain, followups, dashboard, chat, twilio_webhook, integrations, gmail, email, automation, admin, metric
from app.models.conversation import ChatSession, ChatMessage
import uuid
from datetime import datetime
from fastapi.responses import StreamingResponse
import json
=======
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)
from pydantic import BaseModel
from typing import Optional
import json
import asyncio

from app.database import get_db, engine, Base
import google.generativeai as genai
from groq import Groq

from app.core.websockets import manager
from app.core.logger import logger
from app.core.metrics import (setup_system_metrics,start_system_metrics_updater,stop_system_metrics_updater,)
from app.core.request_logger import RequestLoggingMiddleware
<<<<<<< HEAD
from app.services.llm_router import LLMRouter
from app.routers.feedback import router as feedback_router
from app.services.agentic_rag.cache_loader import load_learning_cache
from app.database import SessionLocal
from app.database import Base, engine

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):

    Base.metadata.create_all(bind=engine)
    
    logger.info("Auromind Production System Starting...")

    db = SessionLocal()
    try:
        load_learning_cache(db)
        logger.info(" Learning cache loaded at startup")
    except Exception as e:
        logger.error(f" Failed to load learning cache: {e}")
    finally:
        db.close()
=======
from app.core.middleware import MetricsMiddleware
from app.core.exception_handlers import register_exception_handlers
from app.core.exceptions import ChatProcessingError, BillingError, GuardrailError, RAGError
from app.core.exception_handlers import register_exception_handlers
from app.services.background_scheduler import EmailSchedulerService
from app.services.cleanup_service import ReservationCleanupSchedulerService
from app.services.chat_service import ChatService, ChatServiceConfig

from app.routers import (auth, mcp, simulation, inbox, learning, brain, followups,dashboard, chat, twilio_webhook, integrations, gmail, email,automation, admin, metric, public, billing)
from app.routers.auth import CurrentUser, get_current_user


# ── Lifespan (startup + shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    Base.metadata.create_all(bind=engine)
    logger.info("Auromind Production System Starting...")
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)

    # Email scheduler
    scheduler = EmailSchedulerService(engine)
    scheduler.start()
    app.state.email_scheduler = scheduler
    logger.info("Email Scheduler Started")
<<<<<<< HEAD
    
    yield
    
    # Shutdown: Cleanup
    scheduler.stop()
    logger.info(" Auromind Production System Stopped")
=======

    reservation_cleanup_scheduler = ReservationCleanupSchedulerService(engine)
    reservation_cleanup_scheduler.start()
    app.state.reservation_cleanup_scheduler = reservation_cleanup_scheduler
    logger.info("Reservation Cleanup Scheduler Started")

    # System metrics
    setup_system_metrics(app)
    await start_system_metrics_updater(app)
    logger.info(
        "System metrics updater started with %.2f second interval",
        app.state.system_metrics.update_interval_seconds,
    )

    yield  # app runs here

    # ── SHUTDOWN ──
    await stop_system_metrics_updater(app)

    scheduler = getattr(app.state, "email_scheduler", None)
    if scheduler is not None:
        scheduler.stop()

    reservation_cleanup_scheduler = getattr(app.state, "reservation_cleanup_scheduler", None)
    if reservation_cleanup_scheduler is not None:
        reservation_cleanup_scheduler.stop()

    logger.info("Auromind Production System Stopped")


# ── App ───────────────────────────────────────────────────────────────────────
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)

app = FastAPI(
    title="Auromind API",
    description="AI-Powered Business Assistant Platform (Production)",
    version="2.0.0",
    lifespan=lifespan,
)

# Register exception handlers
register_exception_handlers(app)


# ── CORS ──────────────────────────────────────────────────────────────────────

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


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


# CORS middleware - Hardened for local development
@app.get("/")
async def root():
<<<<<<< HEAD
    return {
        "message": "Auromind API",
        "version": "1.0.0",
        "status": "running"
    }

# Startup event removed in favor of lifespan
=======
    return {"message": "Auromind API", "version": "2.0.0", "status": "running"}


>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])
app.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
app.include_router(inbox.router)
app.include_router(learning.router, prefix="/api/learning", tags=["learning"])
app.include_router(brain.router, tags=["brain"])
app.include_router(followups.router)
app.include_router(chat.router)
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(twilio_webhook.router)
app.include_router(integrations.router)
app.include_router(gmail.router)
app.include_router(email.router)
app.include_router(automation.router)
<<<<<<< HEAD
app.include_router(admin.router, tags=["admin"])
app.include_router(metric.router, prefix="/metrics", tags=["metrics"])
app.include_router(feedback_router)

# Mock RAG agent interaction
class ChatQueryRequest(BaseModel): # Renamed to avoid conflict with existing ChatRequest
    message: str
    workspace_id: str

@app.post("/chat/query")
async def chat_query(request: ChatQueryRequest, db: Session = Depends(get_db)):
    """
    Simulated chat endpoint with MCP guardrails and RAG
    """
    try:
        # 1. Guardrails Check
        guardrails = GuardrailsService()
        is_safe, reason, safe_query = guardrails.check_query(request.message)
        
        if not is_safe:
            return {
                "answer": f"I cannot process this request. Safety alert: {reason}",
                "sources": [],
                "actions": []
            }
        
        # 2. RAG Loop
        rag = get_rag_service()
        answer = await rag.agent_loop(
            db=db,
            workspace_id=request.workspace_id,
            query=safe_query
        )

        if answer:
            return {
                "answer": answer,
                "sources": [], 
                "actions": [],
            }
            
        return {"answer": "I'm not sure how to help with that yet.", "sources": [], "actions": []}
        
    except Exception as e:
        logger.error(f"Error in chat_query: {e}")
        return {"error": str(e)}
=======
app.include_router(admin.router)
app.include_router(metric.router, prefix="/metrics", tags=["metrics"])
app.include_router(public.router)
app.include_router(billing.router, tags=["billing"])
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)


# ── External AI clients & Chat Service ──────────────────────────────────────────────────────────

<<<<<<< HEAD
=======
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

groq_client = None
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)

# Initialize chat service config
chat_service_config = ChatServiceConfig(
    google_api_key=GOOGLE_API_KEY,
    groq_client=groq_client,
)


# ── Chat Endpoints (REFACTORED) ───────────────────────────────────────────────

class ChatQueryRequest(BaseModel):
    message: str
    workspace_id: str


@app.post("/chat/query")
def chat_query(
    request: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Synchronous chat query endpoint."""
    service = ChatService(chat_service_config)
    return service.handle_chat_query(
        db=db,
        message=request.message,
        workspace_id=request.workspace_id,
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
<<<<<<< HEAD
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        async def event_generator():
            try:
                # 1. Init
                final_message = request.message
                full_response = ""
=======
def chat_endpoint(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Streaming chat endpoint."""
    service = ChatService(chat_service_config)
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)

    # Directly return generator (Sync endpoint allows FastAPI to run in threadpool)
    return StreamingResponse(
        service.handle_stream_chat(
            db=db,
            message=request.message,
            workspace_id=request.workspace_id,
            session_id=request.session_id,
            use_rag=request.use_rag,
            model=request.model,
            user_id=str(current_user.id),
        ),
        media_type="text/plain",
    )


<<<<<<< HEAD
                if request.use_rag and request.workspace_id:
                    try:
                        rag = get_rag_service()

                        guard = GuardrailsService()
    
                        #Secure pipeline (INPUT)
                        guard_result = await guard.secure_pipeline(request.message)

                        if guard_result["status"] == "blocked":
                            yield f"{json.dumps({'content': guard_result['message']})}\n"
                            return

                        safe_query = guard_result["safe_query"]

                        #RAG
                        answer = await rag.agent_loop(
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
                                        "query": final_message,
                                        "rewritten_query": final_message,
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
                            final_message,
                            model=request.model
                        )

                        content = result["content"]
                        full_response = content

                        yield f"{json.dumps({'content': content})}\n"
                        fallback_meta = {
                            "query": final_message,
                            "rewritten_query": final_message,   # fallback safe
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

            except Exception as e:
                yield f"{json.dumps({'error': str(e)})}\n"

        return StreamingResponse(event_generator(), media_type="text/plain")
    except Exception as e:
        print(f"API Error: {e}")
        return {"response": f"Error: {str(e)}"}
=======
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)
