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
                                search_results = rag_service.search(
                                    workspace_id=request.workspace_id,
                                    query=request.message,
                                    top_k=5,
                                    min_score=0.1
                                )
                                
                                if search_results:
                                    context_parts = []
                                    for i, result in enumerate(search_results):
                                        context_parts.append(f"[Source {i+1}]: {result['document']}")
                                        rag_sources.append({
                                            "title": result["metadata"].get("title", "Knowledge Base"),
                                            "score": round(result["score"], 2)
                                        })
                                    
                                    context = "\n\n".join(context_parts)
                                    prompt = f"""You are a helpful assistant for the user's business: ChatterGlow (a voice chat platform).

STRICT RULES - YOU MUST FOLLOW:
1. ONLY answer based on the BUSINESS INFO below - this describes THEIR product/service
2. NEVER use your general knowledge - ONLY use the context provided
3. Do NOT ask questions - just answer based on what you have
4. When they ask "what is voicechatting" or similar, describe what THEIR platform offers
5. When they ask for links, mention it's from their website (ChatterGlow)
6. Be friendly and helpful

THEIR BUSINESS INFO:
{context}

USER QUESTION: {request.message}

ANSWER (use ONLY the info above, be friendly):"""
                                else:
                                    # No RAG context found - tell them to add data
                                    prompt = f"""The user asked: "{request.message}"

You are a business assistant but the user hasn't uploaded relevant information about this topic to their Brain/Knowledge Base yet.

Politely tell them:
"I don't have information about that in your knowledge base yet. To help you better, please:
1. Go to the Brain page
2. Upload your website or documents
3. Then I can answer questions about YOUR business!"

Be friendly and helpful."""
                            except Exception as rag_error:
                                print(f"RAG retrieval failed: {rag_error}")
                                # Continue without RAG context
                        
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
