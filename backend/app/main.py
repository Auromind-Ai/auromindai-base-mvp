from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from dotenv import load_dotenv
import os
import google.generativeai as genai
from app.core.websockets import manager
from app.core.middleware import MetricsMiddleware
from app.services.platform_settings_service import get_setting
from app.services.rag_service import get_rag_service
from app.services.background_scheduler import EmailSchedulerService
from app.database import engine
from app.routers import auth, mcp, simulation, inbox, learning, brain, followups, dashboard, chat, twilio_webhook, integrations, gmail, email
from app.routers import automation
from app.routers import admin
from app.routers.metric import router as metric_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources
    from app.database import engine, Base
    import app.models 
    
    # Enable pgvector extension first
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
    
    # Add missing columns to existing tables if they don't exist
    with engine.connect() as conn:
        # Check and add password_hash column to users table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash'"))
        if not result.fetchone():
            print("Adding password_hash column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            conn.commit()
        
        # Check and add is_active column to users table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_active'"))
        if not result.fetchone():
            print("Adding is_active column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
            conn.commit()
        
        # Check and add created_by column to workspaces table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='workspaces' AND column_name='created_by'"))
        if not result.fetchone():
            print("Adding created_by column to workspaces table...")
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN created_by VARCHAR(36) REFERENCES users(id)"))
            conn.commit()
        
        # Check and add updated_at column to workspaces table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='workspaces' AND column_name='updated_at'"))
        if not result.fetchone():
            print("Adding updated_at column to workspaces table...")
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()"))
            conn.commit()
        
        # Check and add workspace_id column to conversations table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='workspace_id'"))
        if not result.fetchone():
            print("Adding workspace_id column to conversations table...")
            conn.execute(text("ALTER TABLE conversations ADD COLUMN workspace_id VARCHAR(36) REFERENCES workspaces(id) ON DELETE CASCADE"))
            conn.commit()
        
        # Check and add title column to conversations table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='title'"))
        if not result.fetchone():
            print("Adding title column to conversations table...")
            conn.execute(text("ALTER TABLE conversations ADD COLUMN title VARCHAR(255)"))
            conn.commit()
        
        # Check and add role column to messages table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='messages' AND column_name='role'"))
        if not result.fetchone():
            print("Adding role column to messages table...")
            conn.execute(text("ALTER TABLE messages ADD COLUMN role VARCHAR(50)"))
            conn.commit()
        
        # Check and add created_at column to messages table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='messages' AND column_name='created_at'"))
        if not result.fetchone():
            print("Adding created_at column to messages table...")
            conn.execute(text("ALTER TABLE messages ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now()"))
            conn.commit()
        
        # Check and add created_at column to workspace_members table
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='workspace_members' AND column_name='created_at'"))
        if not result.fetchone():
            print("Adding created_at column to workspace_members table...")
            conn.execute(text("ALTER TABLE workspace_members ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now()"))
            conn.commit()
        
        # Update followups table schema
        followup_columns = ['conversation_id', 'scheduled_at', 'message_content', 'followup_count', 'mcp_decision', 'mcp_reason', 'executed_at']
        for col in followup_columns:
            result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='followups' AND column_name='{col}'"))
            if not result.fetchone():
                print(f"Adding {col} column to followups table...")
                if col == 'conversation_id':
                    conn.execute(text("ALTER TABLE followups ADD COLUMN conversation_id VARCHAR(36) REFERENCES conversations(id) ON DELETE CASCADE"))
                elif col == 'scheduled_at':
                    conn.execute(text("ALTER TABLE followups ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL"))
                elif col in ['message_content', 'mcp_reason']:
                    conn.execute(text(f"ALTER TABLE followups ADD COLUMN {col} TEXT"))
                elif col == 'followup_count':
                    conn.execute(text(f"ALTER TABLE followups ADD COLUMN {col} INTEGER DEFAULT 0"))
                elif col in ['mcp_decision', 'executed_at']:
                    if col == 'executed_at':
                        conn.execute(text(f"ALTER TABLE followups ADD COLUMN {col} TIMESTAMP WITH TIME ZONE"))
                    else:
                        conn.execute(text(f"ALTER TABLE followups ADD COLUMN {col} VARCHAR(50)"))
                conn.commit()
        
        # Update promises table schema
        promise_columns = ['description', 'due_date', 'source', 'ai_action_id', 'resolved_at']
        for col in promise_columns:
            result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='promises' AND column_name='{col}'"))
            if not result.fetchone():
                print(f"Adding {col} column to promises table...")
                if col == 'description':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN description TEXT NOT NULL"))
                    # Copy data from promise_text if it exists
                    conn.execute(text("UPDATE promises SET description = promise_text WHERE description IS NULL"))
                elif col == 'due_date':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN due_date DATE"))
                elif col == 'source':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN source VARCHAR(50) DEFAULT 'manual'"))
                elif col == 'ai_action_id':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN ai_action_id VARCHAR(36) REFERENCES ai_actions(id) ON DELETE SET NULL"))
                elif col == 'resolved_at':
                    conn.execute(text("ALTER TABLE promises ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE"))
                conn.commit()
        
        # Update ai_actions table schema
        ai_action_columns = ['intent', 'intent_raw', 'confidence', 'mcp_decision', 'mcp_reason', 'rule_results', 'context_refs', 'execution_status', 'human_override', 'action_metadata']
        for col in ai_action_columns:
            result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='ai_actions' AND column_name='{col}'"))
            if not result.fetchone():
                print(f"Adding {col} column to ai_actions table...")
                if col in ['intent', 'intent_raw', 'mcp_reason']:
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} TEXT"))
                elif col == 'confidence':
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} FLOAT"))
                elif col in ['mcp_decision', 'execution_status']:
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} VARCHAR(50)"))
                elif col in ['rule_results', 'context_refs', 'action_metadata']:
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} JSONB"))
                elif col == 'human_override':
                    conn.execute(text(f"ALTER TABLE ai_actions ADD COLUMN {col} BOOLEAN DEFAULT FALSE"))
                conn.commit()
        
        # Rename learning_events table to ai_learning_events and update schema
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='ai_learning_events'"))
        if not result.fetchone():
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='learning_events'"))
            if result.fetchone():
                print("Renaming learning_events to ai_learning_events...")
                conn.execute(text("ALTER TABLE learning_events RENAME TO ai_learning_events"))
                conn.commit()
            
            # Add new columns to ai_learning_events
            learning_columns = ['user_message', 'ai_response', 'conversation_id', 'ai_action_id', 'mcp_verdict', 'mcp_confidence', 'feedback_type', 'feedback_comment', 'feedback_timestamp', 'execution_success', 'user_satisfaction_score', 'pattern_tags', 'used_in_training', 'promoted_to_rule']
            for col in learning_columns:
                result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='ai_learning_events' AND column_name='{col}'"))
                if not result.fetchone():
                    print(f"Adding {col} column to ai_learning_events table...")
                    if col in ['user_message', 'ai_response', 'feedback_comment']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} TEXT"))
                    elif col in ['conversation_id', 'ai_action_id']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} VARCHAR(36)"))
                    elif col in ['mcp_verdict', 'feedback_type']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} VARCHAR(50)"))
                    elif col in ['mcp_confidence', 'user_satisfaction_score']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} FLOAT"))
                    elif col == 'feedback_timestamp':
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} TIMESTAMP WITH TIME ZONE"))
                    elif col in ['execution_success', 'used_in_training', 'promoted_to_rule']:
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} BOOLEAN DEFAULT FALSE"))
                    elif col == 'pattern_tags':
                        conn.execute(text(f"ALTER TABLE ai_learning_events ADD COLUMN {col} JSONB"))
                    conn.commit()
    
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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MetricsMiddleware)

@app.get("/")
async def root():
    return {
        "message": "Auromind API",
        "version": "1.0.0",
        "status": "running"
    }

# Startup event removed in favor of lifespan


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
app.include_router(admin.router)
app.include_router(public.router)
app.include_router(email.router)
app.include_router(automation.router)
app.include_router(metric_router)
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


print("GOOGLE:", os.getenv("GOOGLE_API_KEY"))
print("GROQ:", os.getenv("GROQ_API_KEY"))

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    ai_enabled = get_setting(db, "ai_enabled", True)

    if not ai_enabled:
        return {"response": "⚠ AI system is temporarily disabled by admin."}
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
<<<<<<< HEAD
                            # model_name=get_setting(db, "model_name", request.model),
=======
                            
>>>>>>> origin/veera
                        )

                        if answer:
                            yield f"{json.dumps({'content': answer})}\n"
                            full_response = answer
                            rag_answered = True

                    except Exception as rag_error:
                        print(f"RAG Retrieval failed: {rag_error}")

                # 4. LLM Generation (if no RAG answer)
                if not rag_answered:
                    if get_setting(db, "model_name", request.model) == "gemini" or (get_setting(db, "model_name", request.model) == "auto" and not groq_client):
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