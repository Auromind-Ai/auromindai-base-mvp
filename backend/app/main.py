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
from pydantic import BaseModel
from typing import Optional
from app.services.agentic_rag.guardrails_service import GuardrailsService
from app.core.logger import logger
from app.core.request_logger import RequestLoggingMiddleware
from app.services.llm_router import LLMRouter
from app.routers.feedback import router as feedback_router
from app.services.agentic_rag.cache_loader import load_learning_cache
from app.database import SessionLocal
from app.database import Base, engine
from app.services.agentic_rag.rag_service import build_rag_system
from app.routers.inbox_chennal import meta_what, twilio_webhook
from app.routers.inbox_chennal import conversations, instagram
from app.routers.template import router as template_router
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):

    Base.metadata.create_all(bind=engine)
    
    logger.info("Auromind Production System Starting...")
    orchestrator = build_rag_system()
    app.state.orchestrator = orchestrator

    db = SessionLocal()
    try:
        load_learning_cache(db)
        logger.info(" Learning cache loaded at startup")
    except Exception as e:
        logger.error(f" Failed to load learning cache: {e}")
    finally:
        db.close()

    scheduler = EmailSchedulerService(engine)
    scheduler.start()
    logger.info("Email Scheduler Started")
    
    yield
    
    # Shutdown: Cleanup
    scheduler.stop()
    logger.info(" Auromind Production System Stopped")

app = FastAPI(
    title="Auromind API",
    description="AI-Powered Business Assistant Platform (Production)",
    version="2.0.0",
    lifespan=lifespan
)

# Websocket Endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
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

@app.get("/")
async def root():
    return {
        "message": "Auromind API",
        "version": "1.0.0",
        "status": "running"
    }

# Startup event removed in favor of lifespan
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Import and include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])
# app.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
app.include_router(inbox.router)
app.include_router(learning.router, prefix="/api/learning", tags=["learning"])
app.include_router(brain.router, tags=["brain"])  # RAG Knowledge Base
app.include_router(followups.router)
app.include_router(chat.router)
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(twilio_webhook.router)
app.include_router(integrations.router)  # OAuth Integrations
app.include_router(gmail.router)  # Gmail API
app.include_router(email.router)
app.include_router(automation.router)
app.include_router(admin.router, tags=["admin"])
app.include_router(metric.router, prefix="/metrics", tags=["metrics"])
app.include_router(feedback_router)
app.include_router(meta_what.router, prefix="/api")
app.include_router(conversations.router)
app.include_router(instagram.router, prefix="/api")
app.include_router(template_router)

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
        orchestrator = app.state.orchestrator
        answer = await orchestrator.agent_loop(
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


class ChatRequest(BaseModel):
    message: str
    history: list = []
    model: str = "auto"  # Default to auto
    workspace_id: Optional[str] = None  # For RAG context retrieval
    use_rag: bool = True  # Whether to use RAG for context
    document_id: Optional[str] = None  # Optional: Analyze specific document immediately
    chat_mode: str = "auto" # auto, brain_only, web_only
    source: str = "internal" # internal, internal_web
    session_id: Optional[str] = None # For chat history persistence


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        async def event_generator():
            try:
                # 1. Init
                final_message = request.message
                full_response = ""

                # 2. Persist User Message
                if request.session_id:
                     user_msg = ChatMessage(
                        id=str(uuid.uuid4()),
                        session_id=request.session_id,
                        role="user",
                        content=request.message
                     )
                     db.add(user_msg)
                     db.commit()

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
