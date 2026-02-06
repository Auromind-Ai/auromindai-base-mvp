"""
RAG Service - Main Orchestrator for Retrieval-Augmented Generation
Coordinates embedding, retrieval, and LLM response generation.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import logging
import uuid
import os
import os
import google.generativeai as genai
from groq import Groq

from app.services.embedding_service import get_embedding_service
from app.services.vector_store_service import get_vector_store
from app.utils.text_chunker import TextChunker
from sentence_transformers import CrossEncoder
import json
import re

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
        
        # Initialize Re-ranker (Cross-Encoder)
        try:
            logger.info("Loading Cross-Encoder model for RAG re-ranking...")
            self.cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            logger.info("Cross-Encoder loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Cross-Encoder: {e}")
            self.cross_encoder = None

        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            
        # Configure Groq
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            self.groq_client = Groq(api_key=groq_api_key)
        else:
            self.groq_client = None
    
    def ingest_document(
        self,
        db: Session,
        workspace_id: str,
        text: str,
        title: str,
        content_type: str,
        source: str = None,
        metadata: Dict[str, Any] = None,
        existing_entry_id: str = None  # New param for Async support
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
        parent_id = existing_entry_id if existing_entry_id else str(uuid.uuid4())

        
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
        
        if existing_entry_id:
            # Update existing entry
            brain_entry = db.query(BrainEntry).filter(BrainEntry.id == existing_entry_id).first()
            if brain_entry:
                brain_entry.title = title
                brain_entry.content = text[:5000]
                brain_entry.content_type = content_type
        else:
            # Create new entry
            brain_entry = BrainEntry(
                id=parent_id,
                workspace_id=workspace_id,
                title=title,
                content=text[:5000],  # Store summary/preview only
                content_type=content_type,
                embedding=None,  # Embeddings are in BrainChunk table
                version=1,
                status="completed" # Default for synchronous calls
            )
            db.add(brain_entry)
        
        # Flush to ensure parent_id is valid for FK
        db.flush()
        
        # Store in vector database
        self.vector_store.add_documents(
            db=db,
            workspace_id=workspace_id,
            documents=chunk_texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=chunk_ids
        )
        
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
        db: Session,
        workspace_id: str,
        query: str,
        top_k: int = 5,
        min_score: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search with Cross-Encoder Re-ranking.
        """
        if not query or len(query.strip()) < 3:
            return []
        
        # 1. Retrieve MORE candidates for re-ranking (Recall Phase)
        initial_top_k = top_k * 5  # Fetch 5x more results
        
        query_embedding = self.embedding_service.embed_query(query)
        
        results = self.vector_store.search(
            db=db,
            workspace_id=workspace_id,
            query_embedding=query_embedding,
            top_k=initial_top_k
        )
        
        if not results:
            return []
            
        # 2. Re-rank results (Precision Phase)
        return self._re_rank(query, results, top_k)

    def _re_rank(self, query: str, results: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
        """Sort results using Cross-Encoder."""
        if not self.cross_encoder or not results:
            return results[:top_k]
            
        # Prepare pairs for cross-encoder
        pairs = [[query, r["document"]] for r in results]
        
        try:
            # Predict scores
            scores = self.cross_encoder.predict(pairs)
            
            # Attach new scores and sort
            for i, result in enumerate(results):
                result["re_rank_score"] = float(scores[i])
                
            # Sort by re-rank score (descending)
            results.sort(key=lambda x: x["re_rank_score"], reverse=True)
            
            # Return top_k
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Re-ranking failed: {e}")
            return results[:top_k]

    def query(
        self,
        db: Session,
        workspace_id: str,
        question: str,
        top_k: int = 5,
        include_sources: bool = True,
        model_name: str = "gemini"
    ) -> Dict[str, Any]:
        """
        Agentic RAG Query Loop.
        1. Plan: Decompose query if complex.
        2. Execute: Run re-ranked searches.
        3. Answer: Synthesize results.
        """
        
        # Step 1: Agentic Planning - Decompose the question
        sub_queries = self._decompose_query(question)
        logger.info(f"Agent decomposed '{question}' into: {sub_queries}")
        
        all_results = []
        seen_content = set()
        
        # Step 2: Agentic Execution - Search for each sub-query
        for sub_q in sub_queries:
            results = self.search(db=db, workspace_id=workspace_id, query=sub_q, top_k=top_k)
            
            for res in results:
                # Deduplicate based on content hash or simplified content
                # Using snippet as simple key for now to avoid duplicates
                content_key = res["document"][:50]
                if content_key not in seen_content:
                    seen_content.add(content_key)
                    all_results.append(res)
        
        # If no results from any query
        if not all_results:
            return {
                "answer": "I don't have enough information in my knowledge base to answer this question. Please add relevant documents to the Brain first.",
                "sources": [],
                "confidence": 0.0,
                "context_used": False
            }
            
        # Limit total context window
        final_context_results = all_results[:top_k * 2]  # Allow slightly more context for merged queries
        
        # Build context
        context_parts = []
        sources = []
        
        for i, result in enumerate(final_context_results):
            context_parts.append(f"[Source {i+1}]: {result['document']}")
            sources.append({
                "title": result["metadata"].get("title", "Unknown"),
                "content_snippet": result["document"][:200] + "..." if len(result["document"]) > 200 else result["document"],
                "score": result.get("re_rank_score", result.get("score", 0))
            })
        
        context = "\n\n".join(context_parts)
        
        # Step 3: Self-Correction / Grading
        # Check if the context is actually relevant to the question
        is_relevant = self._grade_documents(question, context)
        
        if not is_relevant:
            logger.warning(f"Self-Correction: Context deemed irrelevant for query '{question}'")
            # Fallback: Try one more search with simplified keywords or return honesty
            # For this MVP, we will return a polite "I don't know" to prevent hallucination.
            return {
                "answer": "I searched your knowledge base, but I couldn't find specific information to answer that question accurately. Please try rephrasing or add more documents.",
                "sources": [],
                "confidence": 0.1,
                "context_used": False,
                "chunks_retrieved": len(final_context_results)
            }

        # Step 4: Synthesis
        answer = self._generate_answer(question, context, model_name)
        
        # Calculate confidence
        avg_score = 0
        if final_context_results:
             # Normalize re-rank scores (usually logits) to 0-1 for display if needed, 
             # but here we just take the raw or sigmoid. 
             # For simplicity, we just use the first available score.
             scores = [r.get("re_rank_score", r.get("score", 0)) for r in final_context_results]
             avg_score = sum(scores) / len(scores)

        return {
            "answer": answer,
            "sources": sources if include_sources else [],
            "confidence": round(avg_score, 2),
            "context_used": True,
            "chunks_retrieved": len(final_context_results)
        }

    def _decompose_query(self, question: str) -> List[str]:
        """Use LLM to break down complex questions."""
        try:
            model = genai.GenerativeModel('gemini-2.5-flash-lite')
            prompt = f"""You are an AI Helper. Break down the user's question into 1 to 3 atomic search queries to find the best information.
            
            Rules:
            1. Return ONLY a JSON list of strings.
            2. If the question is simple, return a list with just the original question.
            3. Remove unnecessary words like "please", "tell me".
            
            User Question: "{question}"
            
            Output (JSON):"""
            
            response = model.generate_content(prompt)
            text = response.text.strip()
            # Clean up markdown code blocks if present
            if text.startswith("```"):
                text = text.replace("```json", "").replace("```", "")
            
            queries = json.loads(text)
            if isinstance(queries, list):
                return queries[:3] # Limit to 3 max
            return [question]
            
        except Exception as e:
            logger.warning(f"Query decomposition failed: {e}. Using original question.")
            return [question]

    def _grade_documents(self, question: str, context: str) -> bool:
        """
        Self-Correction Step: Grade if the retrieved documents actually answer the question.
        Returns True if relevant, False if irrelevant/hallucination risk.
        """
        try:
            model = genai.GenerativeModel('gemini-2.5-flash-lite')
            prompt = f"""You are a Grader. 
            
            User Question: "{question}"
            
            Retrieved Documents:
            {context}
            
            Task: Does the information in the documents contain the answer to the user's question? 
            Return ONLY "yes" or "no".
            
            Decision:"""
            
            response = model.generate_content(prompt)
            decision = response.text.strip().lower()
            
            logger.info(f"Grader decision for '{question}': {decision}")
            
            return "yes" in decision
        except Exception as e:
            logger.error(f"Grading failed: {e}")
            return True # Fallback to lenient if grader fails
    
    def _generate_answer(self, question: str, context: str, model_name: str = "gemini") -> str:
        """Generate answer using Gemini or Groq with retrieved context."""
        try:
            prompt = f"""You are a Fact-Focused Assistant. Your ONLY goal is to provide accurate information based on the documents provided.

CRITICAL GROUNDING RULES:
1. ONLY use the information in the "[BUSINESS INFO]" section below.
2. If the answer is not in the info, say: "I'm sorry, my knowledge base doesn't contain that specific information."
3. Provide direct excerpts and specific details from the original text wherever possible.
4. Do NOT hallucinate. Low temperature (0.1) is used to ensure stability.

[BUSINESS INFO]:
{context}

USER QUESTION: {question}

CONCISE GROUNDED ANSWER (Literal and Direct):"""

            if (model_name == "auromind" or model_name == "groq" or model_name == "llama") and self.groq_client:
                # Use Groq (Llama 3) with literal grounding
                completion = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a highly accurate grounding bot. You never lie or guess."},
                        {"role": "user", "content": prompt}
                    ],
                    model="llama-3.1-8b-instant",
                    temperature=0.1, # Lower temperature = Less hallucination
                )
                return completion.choices[0].message.content
                
            else:
                # Default to Gemini with grounding settings
                model = genai.GenerativeModel('gemini-2.0-flash-lite')
                response = model.generate_content(
                    prompt,
                    generation_config={"temperature": 0.1} # Lower temperature = Less hallucination
                )
                return response.text
            
        except Exception as e:
            logger.error(f"LLM generation failed ({model_name}): {e}")
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
            db=db,
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
    
    def get_stats(self, db: Session, workspace_id: str) -> Dict[str, Any]:
        """Get RAG statistics for a workspace."""
        vector_stats = self.vector_store.get_collection_stats(db, workspace_id)
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
