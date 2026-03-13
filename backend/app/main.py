from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db
from dotenv import load_dotenv
import os
import google.generativeai as genai
from app.core.websockets import manager
from app.core.middleware import MetricsMiddleware
from app.services.rag_service import get_rag_service
from app.services.platform_settings_service import get_setting
from app.services.background_scheduler import EmailSchedulerService
from app.database import engine
from app.routers import auth, mcp, simulation, inbox, learning, brain, followups, dashboard, chat, twilio_webhook, integrations, gmail, email
from app.routers import automation
from app.routers import admin
from app.routers.metric import router as metric_router
from app.core.logger import logger
from app.core.request_logger import RequestLoggingMiddleware

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources
    from app.database import engine, Base
    import app.models 
    Base.metadata.create_all(bind=engine)
    
    # Initialize basic logging
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("app.main")
    logger.info("Auromind Production System Starting...")

    # #START SCHEDULER HERE
    scheduler = EmailSchedulerService(engine)
    scheduler.start()
    print("🚀 Email Scheduler Started")

    yield

    #STOP SCHEDULER HERE
    scheduler.stop()
    print("🛑 Email Scheduler Stopped")
    logger.info("Shutting down...")
    
    yield
    
    # Shutdown: Cleanup
    logger.info("Shutting down...")

app = FastAPI(
    title="Auromind API",
    description="AI-Powered Business Assistant Platform (Production)",
    version="2.0.0",
    lifespan=lifespan
)
app.add_middleware(MetricsMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Websocket Endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


# CORS middleware - Allow all origins for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
from app.routers import auth, mcp, simulation, inbox, learning, brain, followups, dashboard, chat, twilio_webhook, integrations, gmail, admin, public

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])
app.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
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
app.include_router(metric_router)
app.include_router(admin.router)
app.include_router(public.router)

# Configure Colab API
import httpx
from pydantic import BaseModel
from typing import Optional

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

from app.models.conversation import ChatSession, ChatMessage
import uuid
from datetime import datetime


from fastapi.responses import StreamingResponse
import json
import asyncio
from groq import Groq

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Configure Groq
groq_client = None
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        async def event_generator():
            try:
                # 1. Init
                context = ""
                rag_sources = []
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
                        rag = get_rag_service()

                        answer = rag.agent_loop(
                            db=db,
                            workspace_id=request.workspace_id,
                            query=request.message,
                            
                        )

                        if answer:
                            yield f"{json.dumps({'content': answer})}\n"
                            full_response = answer
                            rag_answered = True

                    except Exception as rag_error:
                        print(f"RAG Retrieval failed: {rag_error}")

                # 4. LLM Generation (if no RAG answer)
                if not rag_answered:
                    if request.model == "gemini" or (request.model == "auto" and not groq_client):
                        if not GOOGLE_API_KEY:
                            yield f"{json.dumps({'error': 'Gemini API key not configured'})}\n"
                            return
                        
                        model = genai.GenerativeModel('gemini-1.5-flash')
                        # Note: We are not passing full history here yet, can be improved later
                        response = model.generate_content(final_message, stream=True)
                        for chunk in response:
                            if chunk.text:
                                full_response += chunk.text
                                yield f"{json.dumps({'content': chunk.text})}\n"
                                await asyncio.sleep(0)
                                
                    else:  # auto/llama/auromind - default to Groq
                        if not groq_client:
                            yield f"{json.dumps({'error': 'Auromind AI (Groq) not configured'})}\n"
                            return
    
                        completion = groq_client.chat.completions.create(
                            messages=[
                                {"role": "system", "content": "You are Auromind, a helpful AI assistant."},
                                {"role": "user", "content": final_message}
                            ],
                            model="llama-3.1-8b-instant",
                            temperature=0.7,
                            stream=True,
                        )
    
                        for chunk in completion:
                            if chunk.choices[0].delta.content:
                                content = chunk.choices[0].delta.content
                                full_response += content
                                yield f"{json.dumps({'content': content})}\n"
                                await asyncio.sleep(0)

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
