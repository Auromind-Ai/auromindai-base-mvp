import os
import sys
import logging
from sqlalchemy import text

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.brain import BrainEntry, BrainChunk

logging.basicConfig(level=logging.INFO)

def check_db():
    workspace_id = "4593bc71-1250-482d-88b6-5df96bc15082"
    db = SessionLocal()
    try:
        # Check documents
        entries = db.query(BrainEntry).filter(BrainEntry.workspace_id == workspace_id).all()
        print(f"Number of BrainEntry documents for workspace {workspace_id}: {len(entries)}")
        for e in entries:
            print(f"  - Entry ID: {e.id} | Title: {e.title} | Status: {e.status}")

        # Check chunks
        chunks = db.query(BrainChunk).filter(BrainChunk.workspace_id == workspace_id).all()
        print(f"Number of BrainChunk chunks for workspace {workspace_id}: {len(chunks)}")
        
        # If there are chunks, try a simple vector search
        if chunks:
            from app.services.agentic_rag.rag_service import get_rag_service
            rag = get_rag_service()
            print("\nTesting RAG service retrieve_context and answer generation...")
            query = "What is the meeting agenda?"
            print(f"Query: {query}")
            
            # test retrieval
            context = rag.retrieve_context(db, workspace_id, query)
            print(f"Retrieved context length: {len(context)}")
            print(f"Retrieved context preview:\n{context[:500]}")
            
            # test agent loop
            print("\nRunning full agent_loop...")
            # We need to yield from the async generator since our RAG uses async stream generator
            # Wait, let's check if agent_loop is synchronous or asynchronous in our branch
            from app.services.agentic_rag.orchestrator_layer import OrchestratorLayer
            # In our branch, orchestrator has agent_loop (sync) and agent_loop_stream (async generator)
            print("Imported OrchestratorLayer successfully.")
    except Exception as e:
        print(f"Error checking DB: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
