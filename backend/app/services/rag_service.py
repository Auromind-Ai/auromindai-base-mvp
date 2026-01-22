"""
RAG Service - Main Orchestrator for Retrieval-Augmented Generation
Coordinates embedding, retrieval, and LLM response generation.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import logging
import uuid
import os
import google.generativeai as genai

from app.services.embedding_service import get_embedding_service
from app.services.vector_store_service import get_vector_store
from app.utils.text_chunker import TextChunker

logger = logging.getLogger(__name__)


class RAGService:
    """
    Main RAG orchestrator that coordinates:
    1. Document ingestion and chunking
    2. Embedding generation
    3. Vector storage
    4. Semantic retrieval
    5. LLM response generation with context
    """
    
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.vector_store = get_vector_store()
        self.chunker = TextChunker(chunk_size=1500, chunk_overlap=200)
        
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
    
    def ingest_document(
        self,
        db: Session,
        workspace_id: str,
        text: str,
        title: str,
        content_type: str,
        source: str = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Ingest a document into the RAG system.
        
        Steps:
        1. Chunk the document
        2. Generate embeddings for each chunk
        3. Store in vector database
        4. Create BrainEntry records
        
        Args:
            db: Database session
            workspace_id: Workspace identifier
            text: Document text content
            title: Document title
            content_type: Type (pdf, docx, url, manual)
            source: Source URL or filename
            metadata: Additional metadata
            
        Returns:
            Ingestion result with entry ID and chunk count
        """
        from app.models.brain import BrainEntry
        
        if not text or len(text.strip()) < 10:
            raise ValueError("Document text is too short")
        
        # Generate parent entry ID
        parent_id = str(uuid.uuid4())
        
        # Chunk the document
        chunk_metadata = {
            "title": title,
            "content_type": content_type,
            "source": source or "",
            "parent_id": parent_id,
            **(metadata or {})
        }
        
        chunks = self.chunker.split_text(text, chunk_metadata)
        
        if not chunks:
            raise ValueError("No chunks could be created from document")
        
        logger.info(f"Created {len(chunks)} chunks for document: {title}")
        
        # Generate embeddings for all chunks
        chunk_texts = [c["content"] for c in chunks]
        embeddings = self.embedding_service.embed_texts(chunk_texts)
        
        # Prepare data for vector store
        chunk_ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = []
        for i, chunk in enumerate(chunks):
            meta = {
                "title": title,
                "content_type": content_type,
                "source": source or "",
                "parent_id": parent_id,
                "chunk_index": chunk["chunk_index"],
                "word_count": chunk["word_count"]
            }
            metadatas.append(meta)
        
        # Store in vector database
        self.vector_store.add_documents(
            workspace_id=workspace_id,
            documents=chunk_texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=chunk_ids
        )
        
        # Create parent BrainEntry in SQL database
        brain_entry = BrainEntry(
            id=parent_id,
            workspace_id=workspace_id,
            content=text[:5000],  # Store summary/preview only
            content_type=content_type,
            embedding=None,  # Embeddings are in ChromaDB
            version=1
        )
        db.add(brain_entry)
        db.commit()
        
        logger.info(f"Ingested document '{title}' with {len(chunks)} chunks")
        
        return {
            "status": "success",
            "entry_id": parent_id,
            "title": title,
            "content_type": content_type,
            "chunks_created": len(chunks),
            "total_words": sum(c["word_count"] for c in chunks)
        }
    
    def search(
        self,
        workspace_id: str,
        query: str,
        top_k: int = 5,
        min_score: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search across the knowledge base.
        
        Args:
            workspace_id: Workspace identifier
            query: Search query
            top_k: Number of results to return
            min_score: Minimum similarity score threshold
            
        Returns:
            List of search results with content and metadata
        """
        if not query or len(query.strip()) < 3:
            raise ValueError("Query too short")
        
        # Generate query embedding
        query_embedding = self.embedding_service.embed_query(query)
        
        # Search vector store
        results = self.vector_store.search(
            workspace_id=workspace_id,
            query_embedding=query_embedding,
            top_k=top_k
        )
        
        # Filter by minimum score
        filtered_results = [r for r in results if r["score"] >= min_score]
        
        return filtered_results
    
    def query(
        self,
        workspace_id: str,
        question: str,
        top_k: int = 5,
        include_sources: bool = True
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG.
        
        Steps:
        1. Search for relevant context
        2. Build prompt with context
        3. Generate answer using LLM
        4. Return answer with sources
        
        Args:
            workspace_id: Workspace identifier
            question: User's question
            top_k: Number of context chunks to retrieve
            include_sources: Whether to include source citations
            
        Returns:
            Answer with sources and confidence
        """
        # Retrieve relevant context
        search_results = self.search(
            workspace_id=workspace_id,
            query=question,
            top_k=top_k
        )
        
        if not search_results:
            return {
                "answer": "I don't have enough information in my knowledge base to answer this question. Please add relevant documents to the Brain first.",
                "sources": [],
                "confidence": 0.0,
                "context_used": False
            }
        
        # Build context from search results
        context_parts = []
        sources = []
        
        for i, result in enumerate(search_results):
            context_parts.append(f"[Source {i+1}]: {result['document']}")
            sources.append({
                "title": result["metadata"].get("title", "Unknown"),
                "content_snippet": result["document"][:200] + "..." if len(result["document"]) > 200 else result["document"],
                "score": result["score"]
            })
        
        context = "\n\n".join(context_parts)
        
        # Generate answer using Gemini
        answer = self._generate_answer(question, context)
        
        # Calculate average confidence from search scores
        avg_score = sum(r["score"] for r in search_results) / len(search_results)
        
        return {
            "answer": answer,
            "sources": sources if include_sources else [],
            "confidence": round(avg_score, 2),
            "context_used": True,
            "chunks_retrieved": len(search_results)
        }
    
    def _generate_answer(self, question: str, context: str) -> str:
        """Generate answer using Gemini with retrieved context."""
        try:
            model = genai.GenerativeModel('gemini-2.5-flash-lite')
            
            prompt = f"""You are a friendly business assistant. You already KNOW the user's business because they uploaded their information to you.

CRITICAL RULES:
1. You MUST answer using the BUSINESS INFO provided below - this IS their business
2. Do NOT ask clarifying questions - you already have their info
3. Do NOT say "I need more information" - use what's provided
4. Be friendly, warm, and helpful like a knowledgeable friend
5. When they ask "what is my business", describe the business from the info below

THE USER'S BUSINESS INFO (answer based on this):
{context}

USER ASKED: {question}

ANSWER (be direct, friendly, and use the business info above):"""
            
            response = model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return f"I encountered an error generating a response. Please try again. Error: {str(e)}"
    
    def delete_entry(self, db: Session, workspace_id: str, entry_id: str) -> bool:
        """
        Delete a knowledge entry and all its chunks.
        
        Args:
            db: Database session
            workspace_id: Workspace identifier
            entry_id: Entry ID to delete
            
        Returns:
            True if successful
        """
        from app.models.brain import BrainEntry
        
        # Delete from vector store (all chunks with this parent_id)
        self.vector_store.delete_by_metadata(
            workspace_id=workspace_id,
            where={"parent_id": entry_id}
        )
        
        # Delete from SQL database
        db.query(BrainEntry).filter(
            BrainEntry.id == entry_id,
            BrainEntry.workspace_id == workspace_id
        ).delete()
        db.commit()
        
        logger.info(f"Deleted entry {entry_id} from workspace {workspace_id}")
        return True
    
    def get_stats(self, workspace_id: str) -> Dict[str, Any]:
        """Get RAG statistics for a workspace."""
        vector_stats = self.vector_store.get_collection_stats(workspace_id)
        return {
            "workspace_id": workspace_id,
            "indexed_chunks": vector_stats["document_count"],
            "status": "active" if vector_stats["document_count"] > 0 else "empty"
        }


# Global instance
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """Get the global RAG service instance."""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
