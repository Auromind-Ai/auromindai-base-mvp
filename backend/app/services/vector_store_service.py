"""
Vector Store Service for RAG System
Manages ChromaDB for vector storage and similarity search.
"""

from typing import List, Dict, Any, Optional
import logging
import os
import uuid

logger = logging.getLogger(__name__)

# ChromaDB storage path
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db")


class VectorStoreService:
    """
    Manages vector storage and retrieval using ChromaDB.
    
    Features:
    - Workspace-isolated collections
    - Persistent storage
    - Semantic similarity search
    - Metadata filtering
    """
    
    _instance = None
    _client = None
    
    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _get_client(self):
        """Get or create ChromaDB client."""
        if self._client is None:
            try:
                import chromadb
                from chromadb.config import Settings
                
                # Ensure persist directory exists
                os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
                
                self._client = chromadb.PersistentClient(
                    path=CHROMA_PERSIST_DIR,
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )
                logger.info(f"ChromaDB initialized at {CHROMA_PERSIST_DIR}")
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB: {e}")
                raise RuntimeError(f"Could not initialize vector store: {e}")
        return self._client
    
    def _get_collection(self, workspace_id: str):
        """Get or create collection for a workspace."""
        client = self._get_client()
        collection_name = f"workspace_{workspace_id.replace('-', '_')}"
        
        try:
            collection = client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}  # Use cosine similarity
            )
            return collection
        except Exception as e:
            logger.error(f"Failed to get collection: {e}")
            raise
    
    def add_documents(
        self,
        workspace_id: str,
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]] = None,
        ids: List[str] = None
    ) -> List[str]:
        """
        Add documents to the vector store.
        
        Args:
            workspace_id: Workspace identifier
            documents: List of document texts
            embeddings: List of embedding vectors
            metadatas: Optional list of metadata dicts
            ids: Optional list of document IDs
            
        Returns:
            List of document IDs
        """
        if not documents:
            return []
        
        collection = self._get_collection(workspace_id)
        
        # Generate IDs if not provided
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in documents]
        
        # Ensure metadatas list exists
        if metadatas is None:
            metadatas = [{} for _ in documents]
        
        # Clean metadata (ChromaDB only supports str, int, float, bool)
        cleaned_metadatas = []
        for meta in metadatas:
            cleaned = {}
            for k, v in meta.items():
                if v is not None and isinstance(v, (str, int, float, bool)):
                    cleaned[k] = v
                elif v is not None:
                    cleaned[k] = str(v)
            cleaned_metadatas.append(cleaned)
        
        try:
            collection.add(
                documents=documents,
                embeddings=embeddings,
                metadatas=cleaned_metadatas,
                ids=ids
            )
            logger.info(f"Added {len(documents)} documents to workspace {workspace_id}")
            return ids
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise
    
    def search(
        self,
        workspace_id: str,
        query_embedding: List[float],
        top_k: int = 5,
        where: Dict[str, Any] = None,
        where_document: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.
        
        Args:
            workspace_id: Workspace identifier
            query_embedding: Query embedding vector
            top_k: Number of results to return
            where: Optional metadata filter
            where_document: Optional document content filter
            
        Returns:
            List of search results with document, metadata, and score
        """
        collection = self._get_collection(workspace_id)
        
        try:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where,
                where_document=where_document,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            formatted_results = []
            if results and results["ids"] and results["ids"][0]:
                for i, doc_id in enumerate(results["ids"][0]):
                    # Convert distance to similarity score
                    distance = results["distances"][0][i] if results["distances"] else 0
                    # Cosine distance to similarity: 1 - distance (for cosine, distance is between 0 and 2)
                    similarity = max(0, 1 - distance)
                    
                    formatted_results.append({
                        "id": doc_id,
                        "document": results["documents"][0][i] if results["documents"] else "",
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "score": similarity
                    })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise
    
    def delete_documents(self, workspace_id: str, ids: List[str]) -> bool:
        """
        Delete documents by IDs.
        
        Args:
            workspace_id: Workspace identifier
            ids: List of document IDs to delete
            
        Returns:
            True if successful
        """
        if not ids:
            return True
        
        collection = self._get_collection(workspace_id)
        
        try:
            collection.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} documents from workspace {workspace_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            raise
    
    def delete_by_metadata(self, workspace_id: str, where: Dict[str, Any]) -> bool:
        """
        Delete documents matching metadata filter.
        
        Args:
            workspace_id: Workspace identifier
            where: Metadata filter
            
        Returns:
            True if successful
        """
        collection = self._get_collection(workspace_id)
        
        try:
            collection.delete(where=where)
            logger.info(f"Deleted documents matching filter in workspace {workspace_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete by metadata: {e}")
            raise
    
    def get_collection_stats(self, workspace_id: str) -> Dict[str, Any]:
        """Get statistics for a workspace collection."""
        collection = self._get_collection(workspace_id)
        
        try:
            count = collection.count()
            return {
                "workspace_id": workspace_id,
                "document_count": count
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"workspace_id": workspace_id, "document_count": 0}


# Global instance
_vector_store: Optional[VectorStoreService] = None


def get_vector_store() -> VectorStoreService:
    """Get the global vector store instance."""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
    return _vector_store
