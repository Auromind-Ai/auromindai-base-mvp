import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, AsyncGenerator
from pydantic import BaseModel
from sqlalchemy.orm import Session
from tenacity import RetryError
from app.core.exceptions import (
    BillingError,
    GuardrailError,
    ChatProcessingError,
    RAGError,
    WorkspaceAccessError,
)
from app.core.logger import logger
from app.models.conversation import ChatMessage, ChatSession
from app.services.agentic_rag.guardrails_service import GuardrailsService
from app.services.agentic_rag.rag_service import get_rag_service
from app.services.billing import BillingService
from app.services.ai.llm_router import LLMRouter
from app.database import SessionLocal
from app.services.ai.execution_service import AIExecutionService, AIFeatureRegistry, AIExecutionContext, current_execution_context

class ChatServiceConfig(BaseModel):
    model_config = {"arbitrary_types_allowed": True}
    google_api_key: Optional[str] = None
    groq_client: Optional[Any] = None

class ChatService:

    def __init__(self, config: ChatServiceConfig):
        self.config = config
        self.billing_service = BillingService()
        self.guardrails_service = GuardrailsService()

    def _validate_workspace_access(
        self, db: Session, workspace_id: str, user_id: str
    ) -> Any:
        try:
            workspace = self.billing_service._get_workspace_for_user(
                db=db, workspace_id=workspace_id, user_id=user_id
            )
            if not workspace:
                raise WorkspaceAccessError("Workspace not found or access denied")
            return workspace
        except WorkspaceAccessError:
            raise
        except Exception as e:
            raise WorkspaceAccessError(f"Failed to validate workspace access: {str(e)}")

    async def _check_guardrails(self, message: str) -> Dict[str, Any]:
        try:
            result = await self.guardrails_service.secure_pipeline(message)
            if not isinstance(result, dict):
                raise GuardrailError("Guardrails returned invalid response")

            if result.get("status") == "blocked":
                raise GuardrailError(result.get("message") or "Content policy violation")

            safe_query = result.get("safe_query")
            if not safe_query:
                raise GuardrailError("Guardrails did not return a safe query")

            return result
        except GuardrailError:
            raise
        except Exception as e:
            raise GuardrailError(f"Guardrails validation failed: {str(e)}")

    async def _get_rag_answer(
        self, db: Session, workspace_id: str, query: str, model: str = "auto",
        source: str = "internal_web", document_id: Optional[str] = None,
    ) -> Any:
        try:
            rag = get_rag_service()
            answer = await rag.agent_loop(
                db=db,
                workspace_id=workspace_id,
                query=query,
                model=model,
                source=source,
                document_id=document_id,
                bypass_billing=True,
            )
            return answer
        except RetryError as e:
            cause = e.last_attempt.exception()
            logger.error(f"RAG retrieval error (inner cause): {cause}", exc_info=cause)
            raise RAGError(f"Failed to retrieve from knowledge base: {str(cause)}")
        except Exception as e:
            logger.error(f"RAG retrieval error: {e}", exc_info=True)
            raise RAGError(f"Failed to retrieve from knowledge base: {str(e)}")

    async def _get_rag_answer_stream(
        self, db: Session, workspace_id: str, query: str, model: str = "auto",
        source: str = "internal_web", document_id: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        try:
            rag = get_rag_service()
            async for chunk in rag.agent_loop_stream(
                db=db,
                workspace_id=workspace_id,
                query=query,
                model=model,
                source=source,
                document_id=document_id,
                bypass_billing=True,
            ):
                yield chunk
        except Exception as e:
            logger.error(f"RAG streaming error: {e}", exc_info=True)
            raise RAGError(f"Failed to stream from knowledge base: {str(e)}")

    async def handle_chat_query(
        self,
        db: Session,
        message: str,
        workspace_id: str,
        user_id: str,
        model: str = "auto",
        use_rag: bool = True,
        document_id: Optional[str] = None,
        source: str = "internal",
    ) -> Dict[str, Any]:
        
        self._validate_workspace_access(db, workspace_id, user_id)
        guard_result = await self._check_guardrails(message)
        safe_query = guard_result["safe_query"]

        async def run_query():
            full_response = ""
            rag_answered = False
            meta = {}
            if use_rag:
                try:
                    answer_data = await self._get_rag_answer(
                        db=db,
                        workspace_id=workspace_id,
                        query=safe_query,
                        model=model,
                        source=source,
                        document_id=document_id,
                    )
                    if answer_data:
                        if isinstance(answer_data, dict):
                            full_response = answer_data.get("answer", "")
                            meta = answer_data.get("meta", {})
                        else:
                            full_response = answer_data
                        rag_answered = True
                except Exception as e:
                    logger.error(f"RAG failed in handle_chat_query: {e}")

            if not rag_answered:
                router = LLMRouter()
                # Use the provider already resolved by execute() — no independent re-discovery.
                _ctx = current_execution_context.get()
                _config = _ctx.resolved_config if _ctx else None
                result = await router.generate(safe_query, model=model, config=_config)
                full_response = result.get("text", "")
                
                # Manually track usage on the active context since LLMRouter returns usage details
                from app.services.ai.execution_service import current_execution_context
                ctx = current_execution_context.get()
                if ctx:
                    usage = result.get("usage", {})
                    ctx.add_usage(usage.get("input_tokens", 0), usage.get("output_tokens", 0))
                    ctx.provider = result.get("provider") or ctx.provider
                    ctx.model = result.get("model") or ctx.model

                meta = {
                    "query": message,
                    "rewritten_query": safe_query,
                    "tool": "reasoning",
                    "model": result.get("model", model),
                    "source": "llm"
                }

            safe_answer = await self.guardrails_service.secure_response(full_response)
            return {
                "answer": safe_answer,
                "sources": [],
                "actions": [],
                "meta": meta
            }

        result = await AIExecutionService.execute(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            feature_key=AIFeatureRegistry.CHAT,
            prompt=message,
            model=model,
            execute_fn=run_query
        )
        return result

    async def validate_and_reserve_stream_tokens(
        self,
        db: Session,
        message: str,
        workspace_id: str,
        session_id: Optional[str],
        use_rag: bool,
        user_id: str,
        model: Optional[str] = "auto",
        document_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            workspace = self._validate_workspace_access(db, workspace_id, user_id)

            if document_id:
                from app.models.brain import BrainEntry
                entry = db.query(BrainEntry).filter(
                    BrainEntry.id == document_id,
                    BrainEntry.workspace_id == workspace.id
                ).first()
                if entry:
                    if entry.status == "failed":
                        return {
                            "status": "blocked",
                            "message": entry.error_message or "Document processing failed. Please delete and re-upload."
                        }
                    if entry.content_type == "image" or entry.content_type in ["png", "jpg", "jpeg", "webp"]:
                        router = LLMRouter()
                        resolved_provider = router.resolve_provider_for_model(model or "auto")
                        if resolved_provider == "groq":
                            return {
                                "status": "blocked",
                                "message": "Groq model does not support image analysis. Please configure Gemini or Claude API keys to enable image analysis."
                            }

            if session_id:
                session = db.query(ChatSession).filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id,
                ).first()
                if not session:
                    raise ChatProcessingError("Session not found")
                if str(session.workspace_id) != str(workspace.id):
                    raise WorkspaceAccessError("Session does not belong to this workspace")

            # Guardrails BEFORE reservation
            guard_result = await self.guardrails_service.secure_pipeline(message)
            if guard_result["status"] == "blocked":
                return {"status": "blocked", "message": guard_result["message"]}
            
            safe_query = guard_result["safe_query"]
            estimated_tokens = BillingService.estimate_reservation_amount(
                message=message,
                use_rag=use_rag,
            )

            # Create Root context
            ctx = AIExecutionContext(
                workspace_id=workspace_id,
                user_id=user_id,
                feature_key=AIFeatureRegistry.CHAT,
                stream=True
            )

            # Check execution policy and reserve credits
            from app.services.billing.feature_billing_service import FeatureBillingService
            from app.services.billing.billing_service import enforce_execution_policy
            credits_cost = FeatureBillingService.calculate_cost(db, ctx.feature_key, float(estimated_tokens))
            if not enforce_execution_policy(db, ctx.workspace_id, amount=float(credits_cost)):
                raise BillingError("Insufficient quota. Please upgrade your plan or enable overages.")

            ref_key = f"ai-exec:{ctx.execution_id}"
            desc = f"Stream execution reservation for {ctx.feature_key}"
            reservation = self.billing_service.token_service.reserve_feature_credits(
                db=db,
                workspace_id=ctx.workspace_id,
                feature_key=ctx.feature_key,
                unit_amount=float(estimated_tokens),
                reference_key=ref_key,
                description=desc
            )
            if reservation:
                ctx.reservation_id = str(reservation.id)
            else:
                raise BillingError("Failed to reserve credits")
            
            # Save User Message
            if session_id:
                user_msg = ChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    role="user",
                    content=message,
                )
                db.add(user_msg)

            db.commit()
            
            return {
                "status": "ok",
                "safe_query": safe_query,
                "context": ctx
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Pre-stream setup failed: {e}")
            raise

    async def handle_stream_chat(
        self,
        preflight: Dict[str, Any],
        message: str,
        workspace_id: str,
        session_id: Optional[str],
        use_rag: bool,
        model: str,
        user_id: str,
        document_id: Optional[str] = None,
        chat_mode: str = "auto",
        source: str = "internal",
    ) -> AsyncGenerator[str, None]:
        
        if preflight.get("status") == "blocked":
            yield f"{json.dumps({'content': preflight['message']})}\n"
            return
            
        safe_query = preflight["safe_query"]
        ctx = preflight["context"]
        
        async def run_stream():
            rag_answered = False
            full_response_parts = []
            meta_payload = {}
            try:
                if use_rag:
                    try:
                        with SessionLocal() as rag_db:
                            async for chunk in self._get_rag_answer_stream(
                                db=rag_db,
                                workspace_id=workspace_id,
                                query=safe_query,
                                model=model,
                                source=source,
                                document_id=document_id,
                            ):
                                content = chunk.get("content", "")
                                meta = chunk.get("meta")
                                if content:
                                    full_response_parts.append(content)
                                    yield {"content": content}
                                if meta:
                                    meta_payload = meta
                                    yield {"meta": meta}
                            
                            words = len("".join(full_response_parts).split())
                            est_output = int(words * 1.3)
                            est_input = int(len(safe_query.split()) * 1.3)
                            ctx.usage["input_tokens"] = est_input
                            ctx.usage["output_tokens"] = est_output
                            ctx.usage["total_tokens"] = est_input + est_output
                            rag_answered = True
                    except asyncio.TimeoutError:
                        logger.warning("RAG call timed out, falling back to LLM")
                    except Exception as e:
                        logger.error(f"Unexpected error in RAG: {e}")

                if not rag_answered:
                    router = LLMRouter()
                 
                    _ctx = current_execution_context.get()
                    _config = _ctx.resolved_config if _ctx else None
                    
                    async for chunk in router.generate_stream(safe_query, model=model, config=_config):
                        text_chunk = chunk.get("text", "")
                        if text_chunk:
                            full_response_parts.append(text_chunk)
                            
                            words = len("".join(full_response_parts).split())
                            est_output = int(words * 1.3)
                            est_input = int(len(safe_query.split()) * 1.3)
                            ctx.usage["input_tokens"] = est_input
                            ctx.usage["output_tokens"] = est_output
                            ctx.usage["total_tokens"] = est_input + est_output
                            
                            yield {"content": text_chunk}
                        
                        if "usage" in chunk:
                            usage = chunk.get("usage", {})
                            ctx.usage["input_tokens"] = usage.get("input_tokens", 0)
                            ctx.usage["output_tokens"] = usage.get("output_tokens", 0)
                            ctx.usage["total_tokens"] = usage.get("total_tokens", 0)
                            ctx.provider = chunk.get("provider") or ctx.provider
                            ctx.model = chunk.get("model") or ctx.model
                            
                            meta_payload = {
                                "query": message,
                                "rewritten_query": safe_query,
                                "tool": "reasoning",
                                "model": chunk.get("model", model),
                                "confidence_score": None,  
                                "source": "llm"
                            }
                            yield {"meta": meta_payload}
            finally:
                full_response = "".join(full_response_parts)
                if session_id and full_response:
                    with SessionLocal() as cleanup_db:
                        try:
                            safe_full_response = await self.guardrails_service.secure_response(full_response)
                            ai_msg = ChatMessage(
                                id=str(uuid.uuid4()),
                                session_id=session_id,
                                role="assistant",
                                content=safe_full_response,
                            )
                            cleanup_db.add(ai_msg)

                            session = cleanup_db.query(ChatSession).filter(
                                ChatSession.id == session_id
                            ).first()
                            if session:
                                session.updated_at = datetime.utcnow()
                            cleanup_db.commit()
                        except Exception as save_err:
                            cleanup_db.rollback()
                            logger.error(f"Failed to save assistant message: {save_err}")

        db = SessionLocal()
        try:
            async for chunk in AIExecutionService.execute_stream(
                db=db,
                workspace_id=workspace_id,
                user_id=user_id,
                feature_key=AIFeatureRegistry.CHAT,
                prompt=message,
                context=ctx,
                execute_fn=run_stream
            ):
                content = chunk.get("content", "")
                meta = chunk.get("meta")
                if content:
                    yield f"{json.dumps({'content': content})}\n"
                if meta:
                    yield f"{json.dumps({'meta': meta})}\n"
            
            db.commit()

        except (asyncio.CancelledError, GeneratorExit) as e:
            try:
                db.commit()
            except Exception as commit_err:
                logger.error(f"Failed to commit db session on stream cancel/exit: {commit_err}")
            raise e
        except Exception as e:
            db.rollback()
            logger.error(f"Stream execution failed: {e}")
            yield f"{json.dumps({'error': str(e)})}\n"
        finally:
            db.close()