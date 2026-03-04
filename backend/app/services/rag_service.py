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
from groq import Groq

from app.services.embedding_service import get_embedding_service
from app.services.vector_store_service import get_vector_store
from app.utils.text_chunker import TextChunker
from sentence_transformers import CrossEncoder
import json
import re
from app.services.orchestration_service import OrchestrationService

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
            # Include custom metadata in each chunk
            if metadata:
                meta.update(metadata)
            metadatas.append(meta)
        
        import json
        metadata_json_str = json.dumps(metadata) if metadata else None

        if existing_entry_id:
            # Update existing entry
            brain_entry = db.query(BrainEntry).filter(BrainEntry.id == existing_entry_id).first()
            if brain_entry:
                brain_entry.title = title
                brain_entry.content = text[:5000]
                brain_entry.content_type = content_type
                brain_entry.metadata_json = metadata_json_str
        else:
            # Create new entry
            brain_entry = BrainEntry(
                id=parent_id,
                workspace_id=workspace_id,
                title=title,
                content=text[:5000] if text else "Pending processing...",  # Ensure non-null content
                content_type=content_type,
                embedding=None,  # Embeddings are in BrainChunk table
                version=1,
                status="completed", # Default for synchronous calls
                metadata_json=metadata_json_str
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
        model_name: str = "gemini",
        context_document_id: str = None, # Optional: Force focus on specific document
        chat_mode: str = "auto", # auto, brain_only, web_only
        source: str = "internal" # internal, internal_web
    ) -> Dict[str, Any]:
        """
        Agentic RAG Query Loop with Strict Modes.
        Modes:
        - auto: Decide best approach.
        - brain_only: Use ONLY internal DB.
        - web_only: Use ONLY external knowledge/web.
        
        Source:
        - internal: DB (+ Web if auto/web_only)
        - internal_web: Force web search if available.
        """
        
        # 1. Select System Prompt based on Persona
        # Strict Business Persona
        system_prompt = """You are AuromindAI, a business execution assistant.
        
        CORE RULES:
        1. MODE: {mode_description}
        2. SOURCE: {source_description}
        3. TONE: Professional, concise, actionable. No technical jargon.
        4. GOAL: Turn user intent into clear business outcomes.
        
        RESTRICTIONS:
        - Never expose technical routing or internal tools.
        - Never ask user to choose tools.
        - Respect selected dropdown state exactly.
        """
        
        mode_desc = "Decide best approach automatically."
        source_desc = "Internal data first. Web only if needed."
        
        if chat_mode == "brain_only":
            mode_desc = "Use ONLY internal data. Do NOT use web."
            source_desc = "Internal data only."
        elif chat_mode == "web_only":
            mode_desc = "Use ONLY external/general data. Ignore internal context."
            source_desc = "Web/General knowledge only."
            
        system_prompt = system_prompt.format(mode_description=mode_desc, source_description=source_desc)
        
        
        # Step 1: Retrieval (Context Gathering)
        all_results = []
        
        # SKIP RAG IF WEB_ONLY
        if chat_mode != "web_only":
            
            # PRIORITIZE SPECIFIC DOCUMENT IF PROVIDED
            if context_document_id:
                logger.info(f"Targeting specific document: {context_document_id}")
                try:
                    from app.models.brain import BrainEntry
                    target_doc = db.query(BrainEntry).filter(BrainEntry.id == context_document_id).first()
                    if target_doc:
                        logger.info(f"Found target document: {target_doc.title}")
                        # Create a synthetic result for the target doc
                        content_preview = target_doc.content
                        if not content_preview or len(content_preview) < 10:
                            content_preview = f"Document '{target_doc.title}' is currently processing. Please wait a moment."
                        
                        all_results.append({
                            "document": content_preview, # Use stored content (summary/preview)
                            "metadata": {"title": target_doc.title, "source": target_doc.id, "type": "Direct Context"},
                            "score": 1.0 # Highest priority
                        })
                    else:
                        logger.warning(f"Target document {context_document_id} not found in DB.")
                except Exception as e:
                    logger.error(f"Failed to retrieve target document {context_document_id}: {e}")
            
            # STANDARD RAG SEARCH (If no specific doc forced)
            if not all_results and not context_document_id: 
                sub_queries = self._decompose_query(question)
                logger.info(f"Agent decomposed '{question}' into: {sub_queries}")
                
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
        else:
            logger.info("Chat Mode is WEB_ONLY. Skipping RAG retrieval.")
        
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
            title = result["metadata"].get("title", "Unknown")
            context_parts.append(f"[Source {i+1}] (Title: {title}): {result['document']}")
            sources.append({
                "title": title,
                "content_snippet": result["document"][:200] + "..." if len(result["document"]) > 200 else result["document"],
                "score": result.get("re_rank_score", result.get("score", 0))
            })
        
        context = "\n\n".join(context_parts)
        logger.info(f"RAG Context built with {len(final_context_results)} chunks. Total length: {len(context)}")
        
        # Step 3: Self-Correction / Grading
        # Check if the context is actually relevant to the question
        is_relevant = self._grade_documents(question, context)
        
        if not is_relevant:
            logger.warning(f"Self-Correction: Grader rejected context for query '{question}'")
            # Log the context that was rejected (truncated for logs)
            logger.debug(f"Rejected context snippet: {context[:500]}...")
            return {
                "answer": "I searched your knowledge base, but I couldn't find specific information to answer that question accurately. Please try rephrasing or add more documents.",
                "sources": [],
                "confidence": 0.1,
                "context_used": False,
                "chunks_retrieved": len(final_context_results)
            }

        # Step 4: Synthesis
        answer = self._generate_answer(db, question, context, workspace_id, model_name)
        
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
            model = genai.GenerativeModel('gemini-1.5-flash')
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
            logger.warning(f"Query decomposition failed: {e}. Trying Groq fallback.")
            if self.groq_client:
                try:
                    prompt = f"Break down this question into 1-3 atomic search queries. Return ONLY a JSON list of strings. Question: {question}"
                    completion = self.groq_client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model="llama-3.1-8b-instant",
                        temperature=0.1,
                        response_format={"type": "json_object"}
                    )
                    content = completion.choices[0].message.content
                    data = json.loads(content)
                    if "queries" in data: return data["queries"]
                    if isinstance(data, list): return data
                    # Fallback if it's an object with other keys
                    for val in data.values():
                        if isinstance(val, list): return val
                except Exception as groq_err:
                    logger.error(f"Groq decomposition fallback failed: {groq_err}")
            
            return [question]

    def _grade_documents(self, question: str, context: str) -> bool:
        """
        Self-Correction Step: Grade if the retrieved documents actually answer the question.
        Returns True if relevant, False if irrelevant/hallucination risk.
        """
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
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
            logger.warning(f"Grading failed: {e}. Trying Groq fallback.")
            if self.groq_client:
                try:
                    prompt = f"""Identify if the provided context contains information that can answer the user's question.
Question: {question}

Context:
{context}

Answer with 'yes' if there is ANY relevant info, or 'no' if there is absolutely nothing related.
Return ONLY 'yes' or 'no'."""
                    completion = self.groq_client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model="llama-3.1-8b-instant",
                        temperature=0.1
                    )
                    decision = completion.choices[0].message.content.strip().lower()
                    logger.info(f"Groq grading decision: {decision}")
                    return "yes" in decision
                except Exception as groq_err:
                    logger.error(f"Groq grading fallback failed: {groq_err}")
            return True # Fallback to lenient if grader fails
    
    def _generate_answer(self, db: Session, question: str, context: str, workspace_id: str, model_name: str = "gemini") -> str:
        """Generate answer using Gemini or Groq with retrieved context, capable of tool use."""
        try:
            tools = self._get_tools()
            
            prompt_parts = [

                f"""You are Auromind AI, a business-only AI assistant.

                CORE BEHAVIOR:
                1.  **Greetings/Chat**: If the user says "hi", "hello", or asks a general business question, respond professionally and offer help. DO NOT refuse greetings.
                2.  **Business Only**: For specific requests, handle ONLY business-related topics.
                3.  **Refusal**: If the user asks for personal advice, entertainment, or unrelated topics, refuse politely.

                FILE/CONTEXT ANALYSIS RULES (Only apply if context is provided):
                1.  **Business Check**: Is the content a business document (invoice, report, contract, dashboard)?
                2.  **Strict Refusal**: If the *content* is personal/irrelevant (e.g. holiday photo, personal blog), refuse with: "This file doesn’t seem business-related. Please upload a business document or image."

                PDF ANALYSIS SPECIFICS:
                1.  **Identify Type**: Contract, Proposal, Invoice, Report, Policy, or Pitch Deck.
                2.  **Extract**: Important clauses, financial figures, timelines, obligations, risks.
                3.  **Unreadable**: If scanned/illegible, say: "This document appears to be unreadable or scanned. Please upload a clearer version."

                IMAGE ANALYSIS SPECIFICS:
                1.  **Context**: Invoice, Dashboard, Product, Marketing Creative, Legal Screenshot, or Error Screen.
                2.  **Extract**: Key numbers, dates, names, issues, opportunities.
                3.  **Unclear**: If illegible, say: "Please re-upload a clearer image."

                STRICT OUTPUT FORMAT (For Business Files):
                **Document Type**: [Context/Type from above]
                **Summary**: [One sentence summary]
                **Key Insights/Findings**: [Bullet points - data, findings, clauses, figures]
                **Risks / Red Flags**: [Specific warnings, obligations, or issues]
                **Recommended Actions**: [Specific opportunities, fixes, or next steps]

                TONE & GROUNDING:
                - Professional, concise, actionable.
                - Use ONLY provided context.
                - If answer is missing, say: "I'm sorry, my knowledge base doesn't contain that specific information."

                CONFIDENTIALITY & PRIVACY:
                1.  **Confidential**: Treat this as sensitive business data.
                2.  **Scope**: Do NOT reference this content outside this specific analysis.
                3.  **No Personal Inference**: Do NOT infer or mention personal details (home address, family, non-business habits) unless explicitly relevant to the business context.

                [BUSINESS INFO]:
                {context}
                
                USER QUESTION: {question}
                
                CONCISE BUSINESS RESPONSE:"""
            ]

            if (model_name == "auromind" or model_name == "groq" or model_name == "llama") and self.groq_client:
                # Use Groq (Llama 3) with literal grounding
                completion = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": prompt_parts[0]},
                        {"role": "user", "content": question}
                    ],
                    model="llama-3.1-8b-instant",
                    temperature=0.1, # Lower temperature = Less hallucination
                    # Groq tool use would be integrated here if available
                )
                return completion.choices[0].message.content
                
            else:
                # Default to Gemini with grounding settings and tool use
                model = genai.GenerativeModel('gemini-1.5-flash')
                chat_session = model.start_chat(tools=tools)
                
                response = chat_session.send_message(
                    prompt_parts + [question],
                    generation_config={"temperature": 0.1}
                )
                
                # Check for tool calls
                try:
                    tool_call = response.candidates[0].content.parts[0].function_call
                    logger.info(f"LLM called tool: {tool_call.function.name} with args: {tool_call.function.args}")
                    
                    # Execute the tool
                    tool_output = self._call_tool(tool_call, db, workspace_id) # Use the passed db
                    
                    # Send tool output back to the model
                    tool_response_parts = [
                        response.candidates[0].content,
                        genai.protos.Part(function_response=genai.protos.FunctionResponse(
                            name=tool_call.function.name,
                            response=tool_output
                        ))
                    ]
                    final_response = chat_session.send_message(tool_response_parts)
                    return final_response.text
                    
                except AttributeError:
                    # No tool call, just a regular text response
                    return response.text
                    
        except Exception as e:
            logger.error(f"Primary LLM generation failed ({model_name}): {e}. Attempting cascade fallback.")
            
            # Cascade Fallback: If not already using Groq, and Gemini failed, try Groq
            if model_name != "groq" and model_name != "llama" and model_name != "auromind" and self.groq_client:
                try:
                    logger.info("Cascade Fallback: Triggering Groq (Llama 3) after Gemini failure.")
                    completion = self.groq_client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": prompt_parts[0]},
                            {"role": "user", "content": question}
                        ],
                        model="llama-3.1-8b-instant",
                        temperature=0.1
                    )
                    return completion.choices[0].message.content
                except Exception as groq_err:
                    logger.error(f"Cascade Fallback failed: {groq_err}")
            
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

    def _get_tools(self):
        """Returns the list of tools available to the RAG agent."""
        return [
            genai.protos.FunctionDeclaration(
                name="trigger_followup",
                description="Triggers an automated follow-up email to a lead or customer. Use this tool when the user's intent clearly indicates a need to send a follow-up, or when a sales opportunity requires direct communication.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "to_email": genai.protos.Schema(type=genai.protos.Type.STRING, description="The email address of the recipient."),
                        "subject": genai.protos.Schema(type=genai.protos.Type.STRING, description="The subject line of the follow-up email."),
                        "body": genai.protos.Schema(type=genai.protos.Type.STRING, description="The main content/body of the follow-up email."),
                        "workspace_id": genai.protos.Schema(type=genai.protos.Type.STRING, description="The ID of the current workspace.")
                    },
                    required=["to_email", "subject", "body", "workspace_id"],
                ),
            ),
        ]

    def _call_tool(self, tool_call, db: Session, workspace_id: str):
        """Executes the specified tool call."""
        if tool_call.function.name == "trigger_followup":
            args = {k: v for k, v in tool_call.function.args.items()}
            
            # Ensure workspace_id from tool call matches current workspace_id
            if args.get("workspace_id") != workspace_id:
                logger.error(f"Mismatch in workspace_id for tool call: {args.get('workspace_id')} vs {workspace_id}")
                return {"error": "Workspace ID mismatch for tool call."}

            try:
                # Call OrchestrationService to process the intent
                result = OrchestrationService.process_intent(
                    db=db,
                    workspace_id=uuid.UUID(workspace_id), # Use the workspace_id from the query context
                    action_type="followup",
                    intent_raw=f"Triggered follow-up to {args['to_email']}",
                    metadata={
                        "to_email": args["to_email"],
                        "subject": args["subject"],
                        "body": args["body"]
                    }
                )
                return result
            except Exception as e:
                logger.error(f"Error executing trigger_followup tool: {e}")
                return {"error": str(e)}
        return {"error": f"Tool {tool_call.function.name} not found."}


# Global instance
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """Get the global RAG service instance."""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
