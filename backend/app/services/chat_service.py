import uuid
import json
from typing import Optional, Dict, Any, Generator
from sqlalchemy.orm import Session
from app.services.billing_service import BillingService
from app.services.agentic_rag.guardrails_service import GuardrailsService
from app.services.agentic_rag.rag_service import get_rag_service
from app.models.conversation import ChatMessage, ChatSession
from app.core.exceptions import (BillingError,GuardrailError,ChatProcessingError,RAGError,WorkspaceAccessError,)
from app.core.logger import logger
from datetime import datetime
from pydantic import BaseModel
import google.generativeai as genai
from groq import Groq
from typing import Tuple


class ChatServiceConfig(BaseModel):
    """Configuration for chat service."""
    model_config = {"arbitrary_types_allowed": True}
    google_api_key: Optional[str] = None
    groq_client: Optional[Groq] = None


class ChatService:
    """Service layer for chat operations."""

    def __init__(self, config: ChatServiceConfig):
        self.config = config
        self.billing_service = BillingService()
        self.guardrails_service = GuardrailsService()

    def _validate_workspace_access(
        self, db: Session, workspace_id: str, user_id: str
    ) -> Any:
        """Validate user has access to workspace."""
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
        """Reserve credits for operation."""
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

    def _check_guardrails(self, message: str) -> Tuple[bool, str, str]:
        """Check message against guardrails."""
        try:
            is_safe, reason, safe_query = self.guardrails_service.check_query(message)
            if not is_safe:
                raise GuardrailError(f"Content policy violation: {reason}")
            return is_safe, reason, safe_query
        except GuardrailError:
            raise
        except Exception as e:
            raise GuardrailError(f"Guardrails validation failed: {str(e)}")

    def _get_rag_answer(
        self, db: Session, workspace_id: str, query: str
    ) -> Optional[str]:
        """Retrieve answer from RAG."""
        try:
            rag = get_rag_service()
            answer = rag.agent_loop(
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
        """Finalize credit usage."""
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
        """Release reserved credits."""
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

    def handle_chat_query(
        self,
        db: Session,
        message: str,
        workspace_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Handle synchronous chat query with full transaction safety.
        
        Entire operation is atomic: reserve → process → finalize/release.
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

            is_safe, reason, safe_query = self._check_guardrails(message)
            answer = self._get_rag_answer(db=db, workspace_id=workspace_id, query=safe_query)

            if answer:
                self._finalize_billing(db, reservation.id, message, answer)
                return {"answer": answer, "sources": [], "actions": []}

            self._release_credits(db, reservation.id, "no_answer_generated")
            return {
                "answer": "I'm not sure how to help with that yet.",
                "sources": [],
                "actions": [],
            }

        except (GuardrailError, RAGError, BillingError, WorkspaceAccessError) as e:
            if reservation is not None:
                try:
                    self._force_release_reservation(db, reservation.id, f"error:{type(e).__name__}")
                except Exception as release_err:
                    logger.error(f"Failed force-release reservation: {release_err}")
            raise
        except Exception as e:
            if reservation is not None:
                try:
                    self._force_release_reservation(db, reservation.id, f"error:{type(e).__name__}")
                except Exception as release_err:
                    logger.error(f"Failed force-release reservation: {release_err}")
            raise ChatProcessingError(f"Chat query failed: {str(e)}")

    def handle_stream_chat(
        self,
        db: Session,
        message: str,
        workspace_id: str,
        session_id: Optional[str],
        use_rag: bool,
        model: str,
        user_id: str,
    ) -> Generator[str, None, None]:
        """
        Handle streaming chat with transaction safety.
        
        Yields: JSON-encoded chat chunks
        Raises: Various exceptions on critical failures
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

            # Store user message in session
            if session_id:
                user_msg = ChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    role="user",
                    content=message,
                )
                db.add(user_msg)
                db.flush()

            # Check guardrails
            try:
                guard_result = self.guardrails_service.secure_pipeline_sync(message)
                if guard_result["status"] == "blocked":
                    final_billing_reason = "guardrails_blocked"
                    yield f"{json.dumps({'content': guard_result['message']})}\n"
                    return
                safe_query = guard_result["safe_query"]
            except Exception as e:
                final_billing_reason = f"guardrails_error:{type(e).__name__}"
                raise GuardrailError(f"Guardrails check failed: {str(e)}")

            # Try RAG if enabled
            rag_answered = False
            if use_rag:
                try:
                    answer = self._get_rag_answer(
                        db=db, workspace_id=workspace_id, query=safe_query
                    )
                    if answer:
                        safe_answer = self.guardrails_service.secure_response_sync(answer)
                        full_response = safe_answer
                        rag_answered = True
                        yield f"{json.dumps({'content': safe_answer})}\n"
                        chunks_successfully_sent = True
                except RAGError as e:
                    logger.error(f"RAG failed in stream: {e}")
                except Exception as e:
                    logger.error(f"Unexpected error in RAG: {e}")

            # Fallback to LLM if RAG didn't answer
            if not rag_answered:
                if model == "gemini" or (model == "auto" and not self.config.groq_client):
                    if not self.config.google_api_key:
                        final_billing_reason = "gemini_not_configured"
                        raise ChatProcessingError("Gemini API not configured")

                    try:
                        model_obj = genai.GenerativeModel("gemini-1.5-flash")
                        response = model_obj.generate_content(safe_query, stream=True)

                        for chunk in response:
                            if chunk.text:
                                full_response += chunk.text
                                yield f"{json.dumps({'content': chunk.text})}\n"
                                chunks_successfully_sent = True
                    except Exception as e:
                        final_billing_reason = f"gemini_error:{type(e).__name__}"
                        raise ChatProcessingError(f"Gemini request failed: {str(e)}")

                else:
                    if not self.config.groq_client:
                        final_billing_reason = "groq_not_configured"
                        raise ChatProcessingError("Groq API not configured")

                    try:
                        completion = self.config.groq_client.chat.completions.create(
                            messages=[
                                {
                                    "role": "system",
                                    "content": "You are Auromind, a helpful AI assistant.",
                                },
                                {"role": "user", "content": safe_query},
                            ],
                            model="llama-3.1-8b-instant",
                            temperature=0.7,
                            stream=True,
                        )

                        for chunk in completion:
                            if chunk.choices[0].delta.content:
                                content = chunk.choices[0].delta.content
                                full_response += content
                                yield f"{json.dumps({'content': content})}\n"
                                chunks_successfully_sent = True
                    except Exception as e:
                        final_billing_reason = f"groq_error:{type(e).__name__}"
                        raise ChatProcessingError(f"Groq request failed: {str(e)}")

            # Store AI response in session
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
            # Always finalize or release billing with guaranteed commit on release path.
            if reservation is not None:
                try:
                    if chunks_successfully_sent:
                        self._finalize_billing(db, reservation.id, message, full_response)
                    else:
                        self._force_release_reservation(db, reservation.id, final_billing_reason)
                except Exception as billing_cleanup_error:
                    logger.error(f"Billing cleanup error: {billing_cleanup_error}")
