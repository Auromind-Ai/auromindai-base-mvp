import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, AsyncGenerator, Tuple

from pydantic import BaseModel
from sqlalchemy.orm import Session

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
from app.services.llm_router import LLMRouter 
from app.database import SessionLocal

class ChatServiceConfig(BaseModel):
    model_config = {"arbitrary_types_allowed": True}
    google_api_key: Optional[str] = None
    groq_client: Optional[Any] = None


class ChatService:
    """
    Merged chat service:
    - Workspace access validation
    - Credit reservation / finalize / release
    - Guardrails input/output protection
    - RAG first, then LLM fallback
    - Safe streaming with cleanup in finally
    """

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

    def _reserve_tokens(
        self,
        db: Session,
        workspace_id: str,
        reference_key: str,
        amount: int = 1,
        description: str = "chat operation",
    ) -> Any:
        try:
            reservation = self.billing_service.reserve_tokens(
                db=db,
                workspace_id=workspace_id,
                amount=amount,
                reference_key=reference_key,
                description=description,
            )
            if not reservation:
                raise BillingError("Failed to reserve tokens")
            return reservation
        except BillingError:
            raise
        except Exception as e:
            raise BillingError(f"Token reservation failed: {str(e)}")

    #  Issue 1 Fix: Made Async and reverted to secure_pipeline
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

    #  Issue 1 & 2 Fix: Made Async, returns dict to preserve meta
    async def _get_rag_answer(
        self, db: Session, workspace_id: str, query: str
    ) -> Any:
        try:
            rag = get_rag_service()
            answer = await rag.agent_loop(
                db=db,
                workspace_id=workspace_id,
                query=query,
            )
            return answer
        except Exception as e:
            logger.error(f"RAG retrieval error: {e}")
            raise RAGError(f"Failed to retrieve from knowledge base: {str(e)}")

    def _finalize_billing(
        self,
        db: Session,
        reservation_id: str,
        request_message: str,
        response_text: str,
    ) -> None:
        try:
            actual_tokens_used = self.billing_service.estimate_tokens(
                request_message, response_text
            )
            self.billing_service.finalize_token_usage(
                db=db,
                reservation_id=reservation_id,
                tokens_used=actual_tokens_used,
            )
        except Exception as e:
            logger.error(f"Failed to finalize billing: {e}")
            raise BillingError(f"Billing finalization failed: {str(e)}")

    def _release_token_reservation(
        self, db: Session, reservation_id: str, reason: str
    ) -> None:
        try:
            self.billing_service.release_token_reservation(
                db=db,
                reservation_id=reservation_id,
                reason=reason,
            )
        except Exception as e:
            logger.error(f"Failed to release tokens: {e}")
            raise BillingError(f"tokens release failed: {str(e)}")

    def _force_release_reservation(self, db: Session, reservation_id: str, reason: str):
        try:
            db.rollback()
        except Exception as e:
            logger.warning(f"Failed rollback before release (ignored): {e}")
        self._release_token_reservation(db, reservation_id, reason)
    #  Issue 1 Fix: Made Async
    async def handle_chat_query(
        self,
        db: Session,
        message: str,
        workspace_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        One-shot chat:
        reserve -> guardrails -> RAG -> finalize/release
        """
        reservation_key = f"chat-query:{workspace_id}:{uuid.uuid4()}"
        reservation = None

        try:
            self._validate_workspace_access(db, workspace_id, user_id)

            # Run guardrails BEFORE reserving credits to avoid DoS via blocked prompts
            guard_result = await self._check_guardrails(message)
            safe_query = guard_result["safe_query"]
            estimated_tokens = BillingService.estimate_reservation_amount(message=message, use_rag=True)
            reservation = self._reserve_tokens(
                db=db,
                workspace_id=workspace_id,
                reference_key=reservation_key,
                amount=estimated_tokens,
                description="chat.query reservation",
            )

            answer_data = await self._get_rag_answer(
                db=db,
                workspace_id=workspace_id,
                query=safe_query,
            )

            if answer_data:
                # Handle dict or string to preserve meta
                if isinstance(answer_data, dict):
                    raw_answer = answer_data.get("answer", "")
                    meta = answer_data.get("meta", {})
                else:
                    raw_answer = answer_data
                    meta = {}

                safe_answer = await self.guardrails_service.secure_response(raw_answer)
                self._finalize_billing(db, reservation.id, message, safe_answer)
                return {"answer": safe_answer, "sources": [], "actions": [], "meta": meta}

            self._release_token_reservation(db, reservation.id, "no_answer_generated")
            return {
                "answer": "I'm not sure how to help with that yet.",
                "sources": [],
                "actions": [],
            }

        except (GuardrailError, RAGError, BillingError, WorkspaceAccessError):
            if reservation is not None:
                try:
                    self._force_release_reservation(
                        db, reservation.id, "error:handled_exception"
                    )
                except Exception as release_err:
                    logger.error(f"Failed force-release reservation: {release_err}")
            raise
        except Exception as e:
            if reservation is not None:
                try:
                    self._force_release_reservation(
                        db, reservation.id, f"error:{type(e).__name__}"
                    )
                except Exception as release_err:
                    logger.error(f"Failed force-release reservation: {release_err}")
            raise ChatProcessingError(f"Chat query failed: {str(e)}")

    #  Issue 1, 2, & 3 Fixes applied here
    async def handle_stream_chat(
        self,
        # 🚨 REMOVED: db: Session. We manage DB context explicitly now.
        message: str,
        workspace_id: str,
        session_id: Optional[str],
        use_rag: bool,
        model: str,
        user_id: str,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming chat with Safe Short-Lived DB Transactions:
        1. Pre-stream (Reserve & Save User Msg) -> COMMIT & CLOSE DB
        2. Stream (RAG & LLM) -> NO DB CONNECTION HELD
        3. Post-stream (Finalize & Save AI Msg) -> NEW DB SESSION, COMMIT & CLOSE
        """
        reservation_id = None
        final_billing_reason = "no_response_generated"
        full_response = ""
        chunks_successfully_sent = False
        safe_query = message

        # =========================================================
        # PHASE 1: PRE-STREAM TRANSACTION (Fast & Durable)
        # =========================================================
        with SessionLocal() as db:
            try:
                workspace = self._validate_workspace_access(db, workspace_id, user_id)

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
                    yield f"{json.dumps({'content': guard_result['message']})}\n"
                    return
                safe_query = guard_result["safe_query"]
                estimated_tokens = BillingService.estimate_reservation_amount(
                message=message, 
                use_rag=use_rag)
                # Reserve Tokens
                reservation = self._reserve_tokens(
                    db=db,
                    workspace_id=workspace_id,
                    reference_key=f"api-chat:{workspace_id}:{uuid.uuid4()}",
                    amount=estimated_tokens,
                    description="api.chat reservation",
                )
                reservation_id = reservation.id

                # Save User Message
                if session_id:
                    user_msg = ChatMessage(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        role="user",
                        content=message,
                    )
                    db.add(user_msg)

                # 🔥 COMMIT NOW. The charge is locked, the user message is safe.
                db.commit() 
            except Exception as e:
                db.rollback()
                logger.error(f"Pre-stream setup failed: {e}")
                raise
        
        # --- DB CONNECTION IS NOW RETURNED TO THE POOL ---

        # =========================================================
        # PHASE 2: STREAMING (Slow Network Bound - NO DB HELD)
        # =========================================================
        try:
            rag_answered = False
            if use_rag:
                try:
                    # Open a quick, short-lived session just for the RAG lookup
                    with SessionLocal() as rag_db:
                        answer_data = await asyncio.wait_for(
                            self._get_rag_answer(db=rag_db, workspace_id=workspace_id, query=safe_query),
                            timeout=15,
                        )
                        
                    if answer_data:
                        result = answer_data if isinstance(answer_data, dict) else {
                            "answer": answer_data,
                            "meta": {"query": message, "rewritten_query": safe_query, "source": "fallback"}
                        }

                        safe_answer = await self.guardrails_service.secure_response(result["answer"])
                        full_response = safe_answer
                        rag_answered = True
                        
                        yield json.dumps({"content": safe_answer, "meta": result.get("meta")}) + "\n"
                        chunks_successfully_sent = True

                except asyncio.TimeoutError:
                    logger.warning("RAG call timed out, falling back to LLM")
                except Exception as e:
                    logger.error(f"Unexpected error in RAG: {e}")

            if not rag_answered:
                try:
                    router = LLMRouter()
                    result = await asyncio.wait_for(
                        router.generate(safe_query, model=model),
                        timeout=30,
                    )
                    content = result["content"]
                    full_response = content

                    yield f"{json.dumps({'content': content})}\n"
                    
                    fallback_meta = {
                        "query": message, "rewritten_query": safe_query, 
                        "tool": "reasoning", "model": result.get("model", model), "source": "llm"
                    }
                    yield f"{json.dumps({'meta': fallback_meta})}\n"
                    chunks_successfully_sent = True

                except Exception as e:
                    final_billing_reason = f"llm_error:{type(e).__name__}"
                    logger.error(f"LLMRouter fallback failed: {str(e)}")
                    yield f"{json.dumps({'error': str(e)})}\n"

        except Exception as e:
            final_billing_reason = f"runtime_error:{type(e).__name__}"
            logger.error(f"Stream chat error: {e}")
            raise ChatProcessingError(f"Chat stream failed: {str(e)}")

        # =========================================================
        # PHASE 3: POST-STREAM CLEANUP (Fresh Transaction)
        # =========================================================
        finally:
            if reservation_id:
                # 🔥 Open a FRESH DB session to guarantee cleanup.
                # If the stream died unexpectedly, the previous DB session might be poisoned.
                with SessionLocal() as cleanup_db:
                    try:
                        if chunks_successfully_sent and full_response:
                            # 1. Finalize Billing
                            self._finalize_billing(cleanup_db, reservation_id, message, full_response)

                            # 2. Save AI Response & Update Session
                            if session_id:
                                ai_msg = ChatMessage(
                                    id=str(uuid.uuid4()),
                                    session_id=session_id,
                                    role="assistant",
                                    content=full_response,
                                )
                                cleanup_db.add(ai_msg)

                                session = cleanup_db.query(ChatSession).filter(
                                    ChatSession.id == session_id
                                ).first()
                                if session:
                                    session.updated_at = datetime.utcnow()
                            
                            cleanup_db.commit()
                        else:
                            self._force_release_reservation(cleanup_db, reservation_id, final_billing_reason)
                            cleanup_db.commit()
                            
                    except Exception as billing_cleanup_error:
                        cleanup_db.rollback()
                        # This is now a critical ops alert. If this fails, the DB is unreachable.
                        logger.critical(f"CRITICAL: Failed to finalize billing/save message for reservation {reservation_id}: {billing_cleanup_error}")