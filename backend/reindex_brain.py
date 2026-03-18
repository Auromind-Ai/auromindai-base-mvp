import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.brain import BrainEntry, BrainChunk
from app.services.agentic_rag.rag_service import get_rag_service

def reindex_brain():
    db = SessionLocal()
    rag_service = get_rag_service()
    
    try:
        # Get all brain entries
        entries = db.query(BrainEntry).all()
        print(f"Found {len(entries)} brain entries.")
        
        for entry in entries:
            # Check if it already has chunks
            chunk_count = db.query(BrainChunk).filter(BrainChunk.entry_id == entry.id).count()
            
            if chunk_count > 0:
                print(f"Skipping '{entry.title}' (already has {chunk_count} chunks)")
                continue
                
            print(f"Re-indexing '{entry.title}'...")
            
            # Simple re-indexing logic: manually trigger the ingestion steps
            # 1. Chunking
            chunk_metadata = {
                "title": entry.title,
                "content_type": entry.content_type,
                "source": "migrated",
                "parent_id": entry.id
            }
            chunks_data = rag_service.chunker.split_text(entry.content, chunk_metadata)
            
            if not chunks_data:
                print(f"  ⚠️ No chunks created for '{entry.title}'.")
                continue
                
            chunks = [c["content"] for c in chunks_data]
            # 2. Embedding
            embeddings = rag_service.embedding_service.embed_texts(chunks)
            
            # 3. Save Chunks
            metadatas = []
            chunk_ids = []
            import uuid
            
            for i in range(len(chunks)):
                chunk_ids.append(str(uuid.uuid4()))
                metadatas.append({
                    "title": entry.title,
                    "content_type": entry.content_type,
                    "source": "migrated",
                    "parent_id": entry.id,
                    "chunk_index": i
                })
            
            rag_service.vector_store.add_documents(
                db=db,
                workspace_id=entry.workspace_id,
                documents=chunks,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=chunk_ids
            )
            
            print(f"  ✅ Added {len(chunks)} chunks.")
            
        db.commit()
        print("\n🏆 Brain re-indexing complete!")
        
    except Exception as e:
        print(f"Error during re-indexing: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reindex_brain()
