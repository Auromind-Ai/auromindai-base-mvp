import logging
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from app.models.brain import BrainChunk
from app.database import engine, SessionLocal

logger = logging.getLogger(__name__)

class VectorStoreService:
    """
    Manages vector storage and retrieval using ChromaDB (Local).
    
    Features:
    - Workspace-isolated collections
    - Local file persistence
    - Semantic similarity search
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def add_documents(
        self,
        db: Session,
        workspace_id: str,
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]] = None,
        ids: List[str] = None
    ) -> List[str]:
        """
        Add document chunks to the PostgreSQL vector store.
        """
        if not documents:
            return []
        
        # Generate IDs if not provided
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in documents]
        
        if metadatas is None:
            metadatas = [{} for _ in documents]

        import json
        
        chunks_to_add = []
        for i in range(len(documents)):
            chunk = BrainChunk(
                id=ids[i],
                workspace_id=workspace_id,
                entry_id=metadatas[i].get("parent_id"),
                content=documents[i],
                embedding=embeddings[i],
                chunk_index=metadatas[i].get("chunk_index", 0),
                metadata_json=json.dumps(metadatas[i])
            )
            chunks_to_add.append(chunk)
            
        try:
            db.bulk_save_objects(chunks_to_add)
            db.commit()
            logger.info(f"Added {len(documents)} chunks to pgvector (workspace {workspace_id})")
            return ids
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to add documents to pgvector: {e}")
            raise

    def search(
        self,
        db: Session,
        workspace_id: str,
        query_embedding: List[float],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using pgvector cosine similarity.
        """
        try:
            import json
            
            # Using <-> for L2 distance, <=> for cosine distance, or <#> for inner product
            # Here we use cosine distance (1 - cosine_similarity)
            # The query calculates: embedding <=> :query_embedding
            results = db.query(
                BrainChunk,
                BrainChunk.embedding.cosine_distance(query_embedding).label("distance")
            ).filter(
                BrainChunk.workspace_id == workspace_id
            ).order_by(
                text("distance ASC")
            ).limit(top_k).all()
            
            formatted_results = []
            for chunk, distance in results:
                # Convert distance to similarity score
                similarity = 1 - float(distance) if distance is not None else 0
                
                try:
                    meta = json.loads(chunk.metadata_json) if chunk.metadata_json else {}
                except:
                    meta = {}

                formatted_results.append({
                    "id": chunk.id,
                    "document": chunk.content,
                    "metadata": meta,
                    "score": similarity
                })
            
            return formatted_results
        except Exception as e:
            logger.error(f"pgvector search failed: {e}")
            raise

    def delete_by_metadata(self, db: Session, workspace_id: str, where: Dict[str, Any]) -> bool:
        """
        Delete chunks matching filters. Currently supports parent_id.
        """
        try:
            query = db.query(BrainChunk).filter(BrainChunk.workspace_id == workspace_id)
            
            if "parent_id" in where:
                query = query.filter(BrainChunk.entry_id == where["parent_id"])
            
            query.delete(synchronize_session=False)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete chunks: {e}")
            return False

    def get_collection_stats(self, db: Session, workspace_id: str) -> Dict[str, Any]:
        """Get statistics for a workspace."""
        try:
            count = db.query(func.count(BrainChunk.id)).filter(
                BrainChunk.workspace_id == workspace_id
            ).scalar()
            return {
                "workspace_id": workspace_id,
                "document_count": count or 0
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"workspace_id": workspace_id, "document_count": 0}

def get_vector_store() -> VectorStoreService:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
    return _vector_store

_vector_store: Optional[VectorStoreService] = None
