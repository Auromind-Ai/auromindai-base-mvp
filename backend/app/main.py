from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import google.generativeai as genai


load_dotenv()

app = FastAPI(
    title="Auromind API",
    description="AI-Powered Business Assistant Platform",
    version="1.0.0"
)

# CORS middleware - Allow specific origins
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    frontend_url
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Import and include routers
from app.routers import auth, mcp, simulation, inbox, learning, brain, followups

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])
app.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
app.include_router(inbox.router)
app.include_router(learning.router, prefix="/api/learning", tags=["learning"])
app.include_router(brain.router, tags=["brain"])  # RAG Knowledge Base
app.include_router(followups.router)


# Configure Colab API
import httpx
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    history: list = []
    model: str = "auto"  # Default to auto
    workspace_id: str = None  # For RAG context retrieval
    use_rag: bool = True  # Whether to use RAG for context


from fastapi.responses import StreamingResponse
import json
import asyncio

# URL from Colab ngrok
COLAB_API_URL = "https://privative-acidimetrical-jeffrey.ngrok-free.dev/chat"

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        async def event_generator():
            try:
                # Determine which API to use based on model selection
                
                if request.model == "gemini":
                    # Use actual Gemini API with optional RAG
                    if not GOOGLE_API_KEY:
                        yield f"{json.dumps({'error': 'Gemini API key not configured'})}\n"
                        return
                    
                    try:
                        model = genai.GenerativeModel('gemini-2.5-flash-lite')
                        
                        # Build prompt with RAG context if available
                        prompt = request.message
                        rag_sources = []
                        
                        if request.use_rag and request.workspace_id:
                            try:
                                from app.services.rag_service import get_rag_service
                                rag_service = get_rag_service()
                                
                                # Use the new Agentic Query method
                                rag_response = rag_service.query(
                                    workspace_id=request.workspace_id,
                                    question=request.message,
                                    top_k=5,
                                    include_sources=True
                                )
                                
                                # Send sources if available
                                if rag_response.get("sources"):
                                     rag_sources = rag_response["sources"]
                                     yield f"{json.dumps({'sources': rag_sources})}\n"
                                
                                # Stream the answer (since query() returns full text, we fake stream it or just send it)
                                # Ideally query() should support streaming, but for now we just yield the full answer.
                                # To be smoother, we can yield it in chunks if we wanted, but one chunk is fine.
                                yield f"{json.dumps({'content': rag_response['answer']})}\n"
                                return # Stop here, we handled the response via RAG

                            except Exception as rag_error:
                                print(f"RAG Agentic Loop failed: {rag_error}. Fallback to direct generation.")
                                # Fallback logic below (standard prompt)
                                prompt = request.message
                        else:
                             prompt = request.message

                        
                        response = model.generate_content(prompt, stream=True)
                        
                        # If we have sources, send them first
                        if rag_sources:
                            yield f"{json.dumps({'sources': rag_sources})}\n"
                        
                        for chunk in response:
                            if chunk.text:
                                yield f"{json.dumps({'content': chunk.text})}\n"
                                await asyncio.sleep(0)  # Allow other tasks to run
                    except Exception as e:
                        yield f"{json.dumps({'error': f'Gemini API Error: {str(e)}'})}\n"

                        
                elif request.model == "auromind":
                    # Use Auromind (Colab) API
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        response = await client.post(COLAB_API_URL, json={"message": request.message})
                        
                        if response.status_code == 200:
                            data = response.json()
                            ai_text = data.get("response", "")
                            yield f"{json.dumps({'content': ai_text})}\n"
                        else:
                            yield f"{json.dumps({'error': f'Auromind API Error: {response.text}'})}\n"
                            
                else:  # auto - default to Auromind
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        response = await client.post(COLAB_API_URL, json={"message": request.message})
                        
                        if response.status_code == 200:
                            data = response.json()
                            ai_text = data.get("response", "")
                            yield f"{json.dumps({'content': ai_text})}\n"
                        else:
                            yield f"{json.dumps({'error': f'API Error: {response.text}'})}\n"
                        
            except Exception as e:
                yield f"{json.dumps({'error': str(e)})}\n"

        
        # Log learning event (async in background would be better, but for now we'll do sync)
        try:
            from app.models.learning_event import LearningEvent
            from app.database import SessionLocal
            import uuid as uuid_lib
            
            # We'll log this after the response for now (in production, use background task)
            # For now, just pass - we'll log it in a separate endpoint call from frontend
            pass
        except Exception as e:
            print(f"Error logging learning event: {e}")
        
        return StreamingResponse(event_generator(), media_type="text/plain")
    except Exception as e:
        print(f"API Error: {e}")
        return {"response": f"Error: {str(e)}"}

# app.include_router(followups.router, prefix="/followups", tags=["followups"])
# app.include_router(marketing.router, prefix="/marketing", tags=["marketing"])
# app.include_router(promises.router, prefix="/promises", tags=["promises"])
# app.include_router(brain.router, prefix="/brain", tags=["brain"])
