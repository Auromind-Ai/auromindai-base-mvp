import sys
import os
from sqlalchemy.orm import Session

# Add current dir to path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.services.agentic_rag.ingestion_layer import IngestionLayer
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app.services.agentic_rag.embedding_service import EmbeddingGenerator
from app.services.agentic_rag.retrieval_layer import RetrievalLayer
from app.services.agentic_rag.reranker_service import RerankerService
from app.config.settings import settings

def test_pgvector():
    db = SessionLocal()
    workspace_id = "test-workspace"
    
    # 0. Ensure Workspace Exists
    try:
        from sqlalchemy import text
        db.execute(text("INSERT INTO workspaces (id, name) VALUES (:id, :name) ON CONFLICT DO NOTHING"), {"id": workspace_id, "name": "Test Workspace"})
        db.commit()
    except Exception as e:
        print(f"Warning: Could not create workspace: {e}")
        db.rollback()

    vector_store = VectorStoreService()
    embedding = EmbeddingGenerator()
    reranker = RerankerService()

    ingestion = IngestionLayer(vector_store=vector_store)

    retrieval = RetrievalLayer(
        vector_store=vector_store,
        embedding_generator=embedding,
        reranker=reranker,
        top_k=settings.RAG_TOP_K
    )
    
    print("\n--- Phase 1: Ingestion ---")
    text = "This is a test document about AuromindAI. It explains how the business works and how it helps companies automate their growth."
    title = "Test Doc"
    
    try:
        result = ingestion.ingest_document(
            db=db,
            workspace_id=workspace_id,
            text=text,
            title=title,
            content_type="manual"
        )
        print(f"✅ Ingestion successful! Entry ID: {result['entry_id']}, Chunks: {result['chunks_created']}")
        
        print("\n--- Phase 2: Search Migrated Docs ---")
        query = "What is mentioned in the Regional Sales Report 2025?"
        search_results = retrieval.semantic_search(
            db=db,
            workspace_id=workspace_id,
            query=query
        )
        
        if search_results:
            print(f"✅ Search successful! Found {len(search_results)} results.")
            for i, res in enumerate(search_results):
                print(f"  [{i+1}] Score: {res['score']:.3f} | Source: {res['metadata'].get('title')} | Content: {res['document'][:50]}...")
        else:
            print("❌ Search returned no results.")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_pgvector()
