import uuid
import json
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
from app.services.billing_service import BillingService
from app.services.llm_router import LLMRouter  # 🔥 Added LLMRouter back

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

    def _reserve_credits(
        self,
        db: Session,
        workspace_id: str,
        reference_key: str,
        amount: int = 1,
        description: str = "chat operation",
    ) -> Any:
        try:
            reservation = self.billing_service.reserve_credits(
                db=db,
                workspace_id=workspace_id,
                amount=amount,
                reference_key=reference_key,
                description=description,
            )
            if not reservation:
                raise BillingError("Failed to reserve credits")
            return reservation
        except BillingError:
            raise
        except Exception as e:
            raise BillingError(f"Credit reservation failed: {str(e)}")

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
            tokens_used = self.billing_service.estimate_tokens(
                request_message, response_text
            )
            self.billing_service.finalize_credit_usage(
                db=db,
                reservation_id=reservation_id,
                tokens_used=tokens_used,
            )
        except Exception as e:
            logger.error(f"Failed to finalize billing: {e}")
            raise BillingError(f"Billing finalization failed: {str(e)}")

    def _release_credits(
        self, db: Session, reservation_id: str, reason: str
    ) -> None:
        try:
            self.billing_service.release_credit_reservation(
                db=db,
                reservation_id=reservation_id,
                reason=reason,
            )
        except Exception as e:
            logger.error(f"Failed to release credits: {e}")
            raise BillingError(f"Credit release failed: {str(e)}")

    def _force_release_reservation(self, db: Session, reservation_id: str, reason: str):
        try:
            db.rollback()
        except Exception as e:
            logger.warning(f"Failed rollback before release (ignored): {e}")
        self._release_credits(db, reservation_id, reason)
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

            reservation = self._reserve_credits(
                db=db,
                workspace_id=workspace_id,
                reference_key=reservation_key,
                amount=1,
                description="chat.query reservation",
            )

            guard_result = await self._check_guardrails(message)
            safe_query = guard_result["safe_query"]

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

            self._release_credits(db, reservation.id, "no_answer_generated")
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
        db: Session,
        message: str,
        workspace_id: str,
        session_id: Optional[str],
        use_rag: bool,
        model: str,
        user_id: str,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming chat:
        reserve -> guardrails -> RAG -> LLM fallback -> finalize/release
        """
        reservation = None
        final_billing_reason = "no_response_generated"
        full_response = ""
        chunks_successfully_sent = False

        try:
            workspace = self._validate_workspace_access(db, workspace_id, user_id)

            session = None
            if session_id:
                session = db.query(ChatSession).filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id,
                ).first()
                if not session:
                    raise ChatProcessingError("Session not found")
                if str(session.workspace_id) != str(workspace.id):
                    raise WorkspaceAccessError("Session does not belong to this workspace")

            reservation = self._reserve_credits(
                db=db,
                workspace_id=workspace_id,
                reference_key=f"api-chat:{workspace_id}:{uuid.uuid4()}",
                amount=1,
                description="api.chat reservation",
            )

            if session_id:
                user_msg = ChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    role="user",
                    content=message,
                )
                db.add(user_msg)
                db.flush()

            guard_result = await self.guardrails_service.secure_pipeline(message)
            if guard_result["status"] == "blocked":
                final_billing_reason = "guardrails_blocked"
                yield f"{json.dumps({'content': guard_result['message']})}\n"
                return

            safe_query = guard_result["safe_query"]

            rag_answered = False
            if use_rag:
                try:
                    answer_data = await self._get_rag_answer(
                        db=db,
                        workspace_id=workspace_id,
                        query=safe_query,
                    )
                    if answer_data:
                        if isinstance(answer_data, dict):
                            result = answer_data
                        else:
                            result = {
                                "answer": answer_data,
                                "meta": {
                                    "query": message,
                                    "rewritten_query": safe_query,
                                    "tool": "unknown",
                                    "model": model,
                                    "confidence_score": None,
                                    "source": "fallback"
                                }
                            }

                        safe_answer = await self.guardrails_service.secure_response(result["answer"])
                        full_response = safe_answer
                        rag_answered = True
                        
                        #  Meta Data Yielded correctly
                        yield json.dumps({
                            "content": safe_answer,
                            "meta": result.get("meta")
                        }) + "\n"
                        chunks_successfully_sent = True

                except RAGError as e:
                    logger.error(f"RAG failed in stream: {e}")
                except Exception as e:
                    logger.error(f"Unexpected error in RAG: {e}")

            if not rag_answered:
                try:
                    #  Re-integrated LLMRouter fallback
                    router = LLMRouter()
                    result = await router.generate(
                        safe_query,
                        model=model
                    )

                    content = result["content"]
                    full_response = content

                    yield f"{json.dumps({'content': content})}\n"
                    
                    # 🔥 Fallback Meta Data Yielded correctly
                    fallback_meta = {
                        "query": message,
                        "rewritten_query": safe_query,
                        "tool": "reasoning",
                        "model": result.get("model", model),
                        "confidence_score": None,
                        "source": "llm"
                    }
                    yield f"{json.dumps({'meta': fallback_meta})}\n"

                    chunks_successfully_sent = True
                except Exception as e:
                    final_billing_reason = f"llm_error:{type(e).__name__}"
                    logger.error(f"LLMRouter fallback failed: {str(e)}")
                    yield f"{json.dumps({'error': str(e)})}\n"

            if session_id and full_response:
                ai_msg = ChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    role="assistant",
                    content=full_response,
                )
                db.add(ai_msg)

                session = db.query(ChatSession).filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == user_id,
                ).first()
                if session:
                    session.updated_at = datetime.utcnow()

                db.flush()

        except (BillingError, GuardrailError, ChatProcessingError, RAGError, WorkspaceAccessError):
            raise
        except Exception as e:
            final_billing_reason = f"runtime_error:{type(e).__name__}"
            logger.error(f"Stream chat error: {e}")
            raise ChatProcessingError(f"Chat stream failed: {str(e)}")
        finally:
            if reservation is not None:
                try:
                    if chunks_successfully_sent:
                        self._finalize_billing(db, reservation.id, message, full_response)
                    else:
                        self._force_release_reservation(db, reservation.id, final_billing_reason)
                except Exception as billing_cleanup_error:
                    logger.error(f"Billing cleanup error: {billing_cleanup_error}")