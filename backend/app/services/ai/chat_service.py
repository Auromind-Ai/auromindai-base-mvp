import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, AsyncGenerator
from pydantic import BaseModel
from sqlalchemy.orm import Session
from tenacity import RetryError
from fastapi import HTTPException
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

async def _drain_queue(queue: asyncio.Queue):
    """Async generator that yields items from an asyncio.Queue until None sentinel."""
    while True:
        item = await queue.get()
        if item is None:
            break
        yield item


class ChatServiceConfig(BaseModel):
    model_config = {"arbitrary_types_allowed": True}
    google_api_key: Optional[str] = None
    groq_client: Optional[Any] = None

class ChatService:

    _redis_url: str = None

    @classmethod
    def _get_redis_url(cls) -> str:
        if cls._redis_url is None:
            from app.core.config import settings
            cls._redis_url = settings.REDIS_URL
        return cls._redis_url

    def __init__(self, config: ChatServiceConfig):
        self.config = config
        self.billing_service = BillingService()
        self.guardrails_service = GuardrailsService()

    async def stop_generation(self, session_id: str, user_id: str) -> None:
        """Publish a CANCEL signal for the given session's active generation.

        Rate-limited to 1 publish per session per second via Redis NX key to
        prevent Pub/Sub floods from rapid Stop/Send spam.
        """
        import redis.asyncio as aioredis
        task_key = f"session:{session_id}" if session_id else f"user:{user_id}"
        channel = f"chat_cancel_channel:{task_key}"
        rate_key = f"stop_rate:{task_key}"
        try:
            r = aioredis.from_url(self._get_redis_url(), decode_responses=True)
            # SET NX EX 1 — only succeeds if key doesn't exist (i.e. no recent publish)
            acquired = await r.set(rate_key, "1", nx=True, ex=1)
            if not acquired:
                logger.debug(f"[ChatService] CANCEL rate-limited for {task_key} — skipping publish")
                await r.aclose()
                return
            await r.publish(channel, "CANCEL")
            await r.aclose()
            logger.info(f"[ChatService] Published CANCEL to {channel}")
        except Exception as e:
            logger.warning(f"[ChatService] Redis publish failed for CANCEL: {e}")

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
        session_id: Optional[str] = None,
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
                session_id=session_id,
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
            
            # ── One active generation per conversation ───────────────────────────────────────
            import redis.asyncio as aioredis
            import time as _time
            task_key = f"session:{session_id}" if session_id else f"user:{user_id}"
            redis_active_key = f"active_generation:{task_key}"
            channel = f"chat_cancel_channel:{task_key}"
            try:
                _r = aioredis.from_url(self._get_redis_url(), decode_responses=True)
                existing = await _r.exists(redis_active_key)
                if existing:
                    logger.info(f"[ChatService] Active generation detected for {task_key} — publishing CANCEL")
                    await _r.publish(channel, "CANCEL")
                    # State-based wait: poll until key removed OR timeout (5 seconds)
                    _deadline = _time.monotonic() + 5.0
                    _cleared = False
                    while _time.monotonic() < _deadline:
                        await asyncio.sleep(0.15)
                        still_exists = await _r.exists(redis_active_key)
                        if not still_exists:
                            _cleared = True
                            break
                    if not _cleared:
                        await _r.aclose()
                        raise HTTPException(
                            status_code=409,
                            detail="previous_generation_stopping"
                        )
                await _r.aclose()
            except HTTPException:
                raise
            except Exception as _redis_err:
                logger.warning(f"[ChatService] Redis check failed (continuing): {_redis_err}")
            # ── End enforcement ────────────────────────────────────────────────────────────

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

        import redis.asyncio as aioredis
        import socket
        import time as _time

        task_key = f"session:{session_id}" if session_id else f"user:{user_id}"
        redis_active_key = f"active_generation:{task_key}"
        cancel_channel = f"chat_cancel_channel:{task_key}"
        worker_id = socket.gethostname()

        # Fetch conversation history
        history_messages = []
        if session_id:
            try:
                from app.models.conversation import ChatMessage as CM
                import uuid as _uuid
                sess_uuid = _uuid.UUID(session_id) if isinstance(session_id, str) else session_id
                with SessionLocal() as db_hist:
                    history_messages = (
                        db_hist.query(CM)
                        .filter(CM.session_id == sess_uuid)
                        .order_by(CM.created_at.desc())
                        .limit(6)
                        .all()
                    )
                    history_messages = list(reversed(history_messages))
            except Exception as e:
                logger.error(f"Failed to fetch conversation history: {e}")

        # Insert placeholder assistant message with status=GENERATING
        placeholder_id = str(uuid.uuid4())
        if session_id:
            with SessionLocal() as ph_db:
                try:
                    ph_msg = ChatMessage(
                        id=placeholder_id,
                        session_id=session_id,
                        role="assistant",
                        content="",
                        status="GENERATING",
                    )
                    ph_db.add(ph_msg)
                    ph_db.commit()
                except Exception as e:
                    logger.error(f"Failed to insert placeholder message: {e}")

        # Queue for streaming chunks to the HTTP client
        queue: asyncio.Queue = asyncio.Queue()
        _cancelled = asyncio.Event()

        async def _refresh_redis_key(r) -> None:
            """Keep the Redis active key alive during generation."""
            while not _cancelled.is_set():
                try:
                    await r.expire(redis_active_key, 120)
                except Exception:
                    pass
                await asyncio.sleep(30)

        async def _listen_for_cancel(r) -> None:
            """Subscribe to Redis cancel channel and set _cancelled on CANCEL signal."""
            try:
                pubsub = r.pubsub()
                await pubsub.subscribe(cancel_channel)
                async for msg in pubsub.listen():
                    if _cancelled.is_set():
                        break
                    if msg.get("type") == "message" and msg.get("data") == "CANCEL":
                        logger.info(f"[ChatService] Received CANCEL for {task_key}")
                        _cancelled.set()
                        break
                await pubsub.unsubscribe(cancel_channel)
            except Exception as e:
                logger.warning(f"[ChatService] Cancel listener error: {e}")

        async def _run_generation() -> None:
            """Background task: runs LLM/RAG generation, pushes to queue, saves to DB."""
            token = current_execution_context.set(ctx)
            r = None
            full_response_parts = []
            meta_payload = {}
            final_status = "COMPLETED"
            try:
                r = aioredis.from_url(self._get_redis_url(), decode_responses=True)
                # Register this worker as active
                await r.setex(redis_active_key, 120, worker_id)

                # Start Redis maintenance tasks
                refresh_task = asyncio.create_task(_refresh_redis_key(r))
                cancel_task = asyncio.create_task(_listen_for_cancel(r))

                rag_answered = False
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
                                    session_id=session_id,
                                ):
                                    if _cancelled.is_set():
                                        break
                                    content = chunk.get("content", "")
                                    meta = chunk.get("meta")
                                    status = chunk.get("status")
                                    error = chunk.get("error")
                                    if content:
                                        full_response_parts.append(content)
                                        await queue.put({"content": content})
                                    if meta:
                                        meta_payload = meta
                                        await queue.put({"meta": meta})
                                    if status:
                                        await queue.put({"status": status})
                                    if error:
                                        await queue.put({"error": error})
                                if full_response_parts:
                                    rag_answered = True
                        except asyncio.CancelledError:
                            pass
                        except Exception as e:
                            logger.error(f"RAG error: {e}")

                    if not rag_answered and not _cancelled.is_set():
                        router = LLMRouter()
                        _ctx = current_execution_context.get()
                        _config = _ctx.resolved_config if _ctx else None
                        async for chunk in router.generate_stream(safe_query, model=model, config=_config, history=history_messages):
                            if _cancelled.is_set():
                                break
                            text_chunk = chunk.get("text", "")
                            if text_chunk:
                                full_response_parts.append(text_chunk)
                                await queue.put({"content": text_chunk})
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
                                await queue.put({"meta": meta_payload})
                finally:
                    refresh_task.cancel()
                    cancel_task.cancel()
                    try:
                        await refresh_task
                    except asyncio.CancelledError:
                        pass
                    try:
                        await cancel_task
                    except asyncio.CancelledError:
                        pass

                if _cancelled.is_set():
                    final_status = "CANCELLED"

            except asyncio.CancelledError:
                final_status = "CANCELLED"
            except Exception as e:
                logger.error(f"[ChatService] Generation error: {e}")
                final_status = "FAILED"
                await queue.put({"error": str(e)})
            finally:
                # Always signal end of stream
                await queue.put(None)

                # Persist to DB
                full_response = "".join(full_response_parts)
                if session_id:
                    with SessionLocal() as cleanup_db:
                        try:
                            safe_full_response = await self.guardrails_service.secure_response(full_response) if full_response else ""
                            msg = cleanup_db.query(ChatMessage).filter(
                                ChatMessage.id == placeholder_id
                            ).first()
                            if msg:
                                msg.content = safe_full_response
                                msg.status = final_status
                            else:
                                # Fallback: create new message record
                                ai_msg = ChatMessage(
                                    id=placeholder_id,
                                    session_id=session_id,
                                    role="assistant",
                                    content=safe_full_response,
                                    status=final_status,
                                )
                                cleanup_db.add(ai_msg)

                            session_obj = cleanup_db.query(ChatSession).filter(
                                ChatSession.id == session_id
                            ).first()
                            if session_obj:
                                session_obj.updated_at = datetime.utcnow()
                            cleanup_db.commit()
                            logger.info(f"[ChatService] Saved message {placeholder_id} with status={final_status}")
                        except Exception as save_err:
                            cleanup_db.rollback()
                            logger.error(f"Failed to save assistant message: {save_err}")

                # Remove Redis active key so the next generation can start
                if r:
                    try:
                        await r.delete(redis_active_key)
                        await r.aclose()
                    except Exception:
                        pass
                current_execution_context.reset(token)

        # Start background generation — not tied to HTTP connection lifecycle
        generation_task = asyncio.create_task(_run_generation())

        # Execute through billing wrapper
        db = SessionLocal()
        try:
            # Stream chunks to client from the queue
            async for chunk in AIExecutionService.execute_stream(
                db=db,
                workspace_id=workspace_id,
                user_id=user_id,
                feature_key=AIFeatureRegistry.CHAT,
                prompt=message,
                context=ctx,
                execute_fn=lambda: _drain_queue(queue)
            ):
                content = chunk.get("content", "")
                meta = chunk.get("meta")
                status_val = chunk.get("status")
                error = chunk.get("error")
                if content:
                    yield f"{json.dumps({'content': content})}\n"
                if meta:
                    yield f"{json.dumps({'meta': meta})}\n"
                if status_val:
                    yield f"{json.dumps({'status': status_val})}\n"
                if error:
                    yield f"{json.dumps({'error': error})}\n"
            db.commit()
        except (asyncio.CancelledError, GeneratorExit):
            # Client disconnected — do NOT cancel generation_task
            # Let it complete in background and save to DB
            logger.info(f"[ChatService] Client disconnected for {task_key} — generation continues in background")
            try:
                db.commit()
            except Exception:
                pass
        except Exception as e:
            db.rollback()
            logger.error(f"Stream execution failed: {e}")
            yield f"{json.dumps({'error': str(e)})}\n"
        finally:
            db.close()