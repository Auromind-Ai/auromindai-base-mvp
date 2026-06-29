import contextvars
from enum import Enum
import uuid
import asyncio
from decimal import Decimal
from typing import Any, Dict, Optional, AsyncGenerator
from sqlalchemy.orm import Session
from app.core.exceptions import WorkspaceAccessError, BillingError
from app.core.logger import logger
from app.models.workspace import Workspace
from app.services.billing.billing_service import BillingService, enforce_execution_policy
from app.services.billing.feature_billing_service import FeatureBillingService
from app.services.billing.gateway.base import TOKENS_PER_CREDIT
from app.services.ai.llm_router import LLMRouter

# ContextVar for thread-local tracking of parent execution context
current_execution_context: contextvars.ContextVar[Optional["AIExecutionContext"]] = contextvars.ContextVar(
    "current_execution_context", default=None
)

class ExecutionMode(str, Enum):
    NORMAL = "NORMAL"
    NESTED = "NESTED"
    BYPASS = "BYPASS"
    SYSTEM = "SYSTEM"
    PREVIEW = "PREVIEW"

class AIFeatureRegistry:
    CHAT = "ai_chat"
    RAG = "agentic_rag"
    AGENT = "inbox_agent_message"
    TEMPLATE = "gmail_draft"
    FLOW = "flow_generation"
    KNOWLEDGE_BASE_UPLOAD = "knowledge_base_upload"
    EMAIL_CLASSIFICATION = "email_classification"
    EMAIL_SUMMARY = "email_summary"
    EMAIL_ENTITY_EXTRACTION = "email_entity_extraction"
    EMAIL_PROCESSING = "email_processing"

class AIExecutionContext:
    def __init__(
        self,
        workspace_id: str,
        user_id: str,
        feature_key: str,
        billing_mode: ExecutionMode = ExecutionMode.NORMAL,
        execution_id: str = None,
        provider: str = None,
        model: str = None,
        reservation_id: str = None,
        stream: bool = False,
        metadata: dict = None,
    ):
        self._execution_id = execution_id or str(uuid.uuid4())
        self._workspace_id = workspace_id
        self._user_id = user_id
        self._feature_key = feature_key
        self._billing_mode = billing_mode

        self.provider = provider
        self.model = model
        self.reservation_id = reservation_id
        self.stream = stream
        self.metadata = metadata or {}
        self.usage = {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "token_source": "provider_usage"
        }

    # Immutable fields (Read-Only Properties)
    @property
    def execution_id(self) -> str:
        return self._execution_id

    @property
    def workspace_id(self) -> str:
        return self._workspace_id

    @property
    def user_id(self) -> str:
        return self._user_id

    @property
    def feature_key(self) -> str:
        return self._feature_key

    @property
    def billing_mode(self) -> ExecutionMode:
        return self._billing_mode

    def add_usage(self, input_tokens: int, output_tokens: int):
        self.usage["input_tokens"] += input_tokens
        self.usage["output_tokens"] += output_tokens
        self.usage["total_tokens"] += (input_tokens + output_tokens)

    def to_log_dict(self) -> dict:
        return {
            "execution_id": self.execution_id,
            "workspace_id": self.workspace_id,
            "user_id": self.user_id,
            "feature_key": self.feature_key,
            "billing_mode": self.billing_mode,
            "provider": self.provider,
            "model": self.model,
            "reservation_id": self.reservation_id,
        }

class AIExecutionService:
    @staticmethod
    async def execute(
        db: Session,
        workspace_id: str,
        user_id: str,
        feature_key: str,
        prompt: str,
        model: str = "auto",
        media_data: bytes = None,
        mime_type: str = None,
        context: AIExecutionContext = None,
        bypass_billing: bool = False,
        description: str = None,
        execute_fn: Any = None,
        custom_unit_amount: float = None
    ) -> Dict[str, Any]:
        
        # 1. Resolve Execution Context & Mode
        parent_context = current_execution_context.get()
        is_nested = False

        if context:
            ctx = context
            if parent_context is not None:
                is_nested = True
        elif parent_context:
            ctx = parent_context
            is_nested = True
        else:
            billing_mode = ExecutionMode.BYPASS if bypass_billing else ExecutionMode.NORMAL
            ctx = AIExecutionContext(
                workspace_id=workspace_id,
                user_id=user_id,
                feature_key=feature_key,
                billing_mode=billing_mode,
                stream=False
            )

        sub_exec_id = str(uuid.uuid4())
        if is_nested:
            if not hasattr(ctx, "child_executions"):
                ctx.child_executions = {}
            ctx.child_executions[sub_exec_id] = {
                "feature_key": feature_key,
                "custom_unit_amount": custom_unit_amount,
                "usage": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "total_tokens": 0
                }
            }

        logger.info(f"[AIExecutionService] Starting execute | Execution ID: {ctx.execution_id} | Mode: {ctx.billing_mode} | Feature: {ctx.feature_key}")
        token_token = current_execution_context.set(ctx)

        billing_service = BillingService()
        router = LLMRouter()
        reservation_created = False

        try:
            # Only run validation/reservation at root execution level
            if ctx.billing_mode == ExecutionMode.NORMAL and not is_nested:
                # 2. Workspace Validation
                workspace = db.query(Workspace).filter(Workspace.id == ctx.workspace_id).first()
                if not workspace:
                    raise WorkspaceAccessError("Workspace not found or access denied")
                
                # Check workspace membership (security boundary check)
                if ctx.user_id != "system":
                    from app.models.workspace import WorkspaceMember
                    member = db.query(WorkspaceMember).filter(
                        WorkspaceMember.workspace_id == ctx.workspace_id,
                        WorkspaceMember.user_id == ctx.user_id
                    ).first()
                    if not member:
                        raise WorkspaceAccessError("Workspace membership validation failed")

                # 3. Plan Entitlements & Billing Rule Check
                rule = FeatureBillingService.get_rule(db, ctx.feature_key)
                if not rule:
                    raise ValueError(f"No active billing rule configured for feature: {ctx.feature_key}")

                # 4. Reservation Estimation & Policy Enforcement
                if custom_unit_amount is not None:
                    unit_amount = custom_unit_amount
                elif rule.billing_type == "TOKEN":
                    estimated_tokens = BillingService.estimate_reservation_amount(prompt, use_rag=(ctx.feature_key == AIFeatureRegistry.CHAT or ctx.feature_key == AIFeatureRegistry.RAG))
                    unit_amount = float(estimated_tokens)
                else:
                    unit_amount = 1.0

                credits_cost = FeatureBillingService.calculate_cost(db, ctx.feature_key, unit_amount)

                # enforce billing check
                if not enforce_execution_policy(db, ctx.workspace_id, amount=float(credits_cost)):
                    raise BillingError("Insufficient quota. Please upgrade your plan or enable overages.")

                # 5. Reserve Credits
                if not ctx.reservation_id:
                    ref_key = f"ai-exec:{ctx.execution_id}"
                    desc = description or f"Execution reservation for {ctx.feature_key}"
                    reservation = billing_service.token_service.reserve_feature_credits(
                        db=db,
                        workspace_id=ctx.workspace_id,
                        feature_key=ctx.feature_key,
                        unit_amount=unit_amount,
                        reference_key=ref_key,
                        description=desc
                    )
                    if reservation:
                        ctx.reservation_id = str(reservation.id)
                        reservation_created = True
                else:
                    reservation_created = True

            # 6. Execute Provider (via execute_fn or LLMRouter)
            if execute_fn:
                result = await execute_fn()
                # If usage is returned and was not already accumulated by nested calls
                if result and "usage" in result and ctx.usage["total_tokens"] == 0:
                    usage = result.get("usage", {})
                    ctx.add_usage(usage.get("input_tokens", 0), usage.get("output_tokens", 0))
            else:
                result = await router.generate(prompt, model=model, media_data=media_data, mime_type=mime_type)
                usage = result.get("usage", {})
                ctx.add_usage(usage.get("input_tokens", 0), usage.get("output_tokens", 0))
            
            if result:
                ctx.provider = result.get("provider") or ctx.provider
                ctx.model = result.get("model") or ctx.model
                
                # Update child usage if nested
                if is_nested:
                    if hasattr(ctx, "child_executions") and sub_exec_id in ctx.child_executions:
                        child_usage = result.get("usage", {})
                        ctx.child_executions[sub_exec_id]["usage"]["input_tokens"] += child_usage.get("input_tokens", 0)
                        ctx.child_executions[sub_exec_id]["usage"]["output_tokens"] += child_usage.get("output_tokens", 0)
                        ctx.child_executions[sub_exec_id]["usage"]["total_tokens"] += (child_usage.get("input_tokens", 0) + child_usage.get("output_tokens", 0))

            # 7. Settle Billing from Provider Usage (root level only)
            if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested:
                from app.services.ai.llm_utils import extract_usage, ProviderUsageMissingError
                from app.models.token_ledger import TokenLedger as _TL

                # Idempotency safeguard — skip if already settled
                ref_key = f"ai-exec:{ctx.execution_id}"
                existing_ledger = db.query(_TL).filter(
                    _TL.reference_key.like(f"{ref_key}%"),
                    _TL.status == "posted"
                ).first()
                if existing_ledger:
                    logger.info(f"[AIExecutionService] Billing already settled for {ctx.execution_id}. Skipping.")
                    reservation_created = False
                else:
                    try:
                        # Build a synthetic result dict from accumulated ctx.usage
                        # so extract_usage() can read it uniformly.
                        aggregated_result = {
                            "provider": ctx.provider or "unknown",
                            "model":    ctx.model    or "unknown",
                            "usage": {
                                "input_tokens":  ctx.usage["input_tokens"],
                                "output_tokens": ctx.usage["output_tokens"],
                                "total_tokens":  ctx.usage["total_tokens"],
                            },
                        }
                        provider_usage = extract_usage(aggregated_result)
                    except ProviderUsageMissingError as pume:
                        logger.error(
                            f"[AIExecutionService] Provider returned no usage for {ctx.execution_id}: {pume}. "
                            "Releasing reservation — workspace will NOT be charged."
                        )
                        with db.begin_nested():
                            billing_service.token_service.release_token_reservation(
                                db=db,
                                reservation_id=ctx.reservation_id,
                                reason=f"Provider usage missing: {pume}",
                            )
                        db.commit()
                        reservation_created = False
                        return result

                    # Settle: deduct actual provider tokens, not the reservation estimate
                    billing_service.token_service.settle_from_provider_usage(
                        db=db,
                        reservation_id=ctx.reservation_id,
                        usage=provider_usage,
                        feature_key=ctx.feature_key,
                        execution_id=ctx.execution_id,
                    )
                    logger.info(
                        f"[AIExecutionService] Settled | execution={ctx.execution_id} "
                        f"provider={provider_usage['provider']} model={provider_usage['model']} "
                        f"tokens={provider_usage['total_tokens']}"
                    )
                    reservation_created = False

            return result

        except asyncio.CancelledError as e:
            logger.info(f"[AIExecutionService] Execution cancelled ({type(e).__name__}) for {ctx.execution_id}")
            if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                try:
                    with db.begin_nested():
                        billing_service.token_service.release_token_reservation(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            reason=f"Execution cancelled: {type(e).__name__}"
                        )
                    logger.info(f"[AIExecutionService] Released reservation {ctx.reservation_id} successfully.")
                except Exception as release_err:
                    logger.error(f"CRITICAL: Failed to release reservation {ctx.reservation_id} on fallback: {release_err}")
            raise e
        except GeneratorExit as e:
            logger.info(f"[AIExecutionService] Execution exited ({type(e).__name__}) for {ctx.execution_id}")
            if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                try:
                    with db.begin_nested():
                        billing_service.token_service.release_token_reservation(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            reason=f"Execution exited: {type(e).__name__}"
                        )
                    logger.info(f"[AIExecutionService] Released reservation {ctx.reservation_id} successfully.")
                except Exception as release_err:
                    logger.error(f"CRITICAL: Failed to release reservation {ctx.reservation_id} on fallback: {release_err}")
            raise e
        except Exception as e:
            logger.error(f"[AIExecutionService] Failure in execution {ctx.execution_id}: {e}", exc_info=True)
            # 8. Release Reservation on Failure
            if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                try:
                    with db.begin_nested():
                        billing_service.token_service.release_token_reservation(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            reason=f"Execution failed: {type(e).__name__}"
                        )
                    logger.info(f"[AIExecutionService] Released reservation {ctx.reservation_id} successfully.")
                except Exception as release_err:
                    logger.error(f"CRITICAL: Failed to release reservation {ctx.reservation_id} on fallback: {release_err}")
            raise e
        finally:
            current_execution_context.reset(token_token)

    @staticmethod
    async def execute_stream(
        db: Session,
        workspace_id: str,
        user_id: str,
        feature_key: str,
        prompt: str,
        model: str = "auto",
        execute_fn: Any = None,
        context: AIExecutionContext = None,
        bypass_billing: bool = False,
        description: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        
        parent_context = current_execution_context.get()
        is_nested = False

        if context:
            ctx = context
            if parent_context is not None:
                is_nested = True
        elif parent_context:
            ctx = parent_context
            is_nested = True
        else:
            billing_mode = ExecutionMode.BYPASS if bypass_billing else ExecutionMode.NORMAL
            ctx = AIExecutionContext(
                workspace_id=workspace_id,
                user_id=user_id,
                feature_key=feature_key,
                billing_mode=billing_mode,
                stream=True
            )

        logger.info(f"[AIExecutionService] Starting execute_stream | Execution ID: {ctx.execution_id} | Mode: {ctx.billing_mode}")
        token_token = current_execution_context.set(ctx)

        billing_service = BillingService()
        router = LLMRouter()
        reservation_created = False

        try:
            if ctx.billing_mode == ExecutionMode.NORMAL and not is_nested:
                workspace = db.query(Workspace).filter(Workspace.id == ctx.workspace_id).first()
                if not workspace:
                    raise WorkspaceAccessError("Workspace not found or access denied")
                
                if ctx.user_id != "system":
                    from app.models.workspace import WorkspaceMember
                    member = db.query(WorkspaceMember).filter(
                        WorkspaceMember.workspace_id == ctx.workspace_id,
                        WorkspaceMember.user_id == ctx.user_id
                    ).first()
                    if not member:
                        raise WorkspaceAccessError("Workspace membership validation failed")

                rule = FeatureBillingService.get_rule(db, ctx.feature_key)
                if not rule:
                    raise ValueError(f"No active billing rule configured for feature: {ctx.feature_key}")

                if rule.billing_type == "TOKEN":
                    estimated_tokens = BillingService.estimate_reservation_amount(prompt, use_rag=(ctx.feature_key == AIFeatureRegistry.CHAT or ctx.feature_key == AIFeatureRegistry.RAG))
                    unit_amount = float(estimated_tokens)
                else:
                    unit_amount = 1.0

                credits_cost = FeatureBillingService.calculate_cost(db, ctx.feature_key, unit_amount)

                if not enforce_execution_policy(db, ctx.workspace_id, amount=float(credits_cost)):
                    raise BillingError("Insufficient quota. Please upgrade your plan or enable overages.")

                if not ctx.reservation_id:
                    ref_key = f"ai-exec:{ctx.execution_id}"
                    desc = description or f"Stream execution reservation for {ctx.feature_key}"
                    reservation = billing_service.token_service.reserve_feature_credits(
                        db=db,
                        workspace_id=ctx.workspace_id,
                        feature_key=ctx.feature_key,
                        unit_amount=unit_amount,
                        reference_key=ref_key,
                        description=desc
                    )
                    if reservation:
                        ctx.reservation_id = str(reservation.id)
                        reservation_created = True
                else:
                    reservation_created = True

            # 6. Execute Provider (via execute_fn or LLMRouter)
            if execute_fn:
                async for chunk in execute_fn():
                    yield chunk
            else:
                result = await router.generate(prompt, model=model)
                ctx.provider = result.get("provider")
                ctx.model = result.get("model")
                usage = result.get("usage", {})
                ctx.add_usage(usage.get("input_tokens", 0), usage.get("output_tokens", 0))
                yield {"content": result.get("text", "")}

            # Settle Billing from Provider Usage (streaming — root level only)
            if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested:
                from app.services.ai.llm_utils import extract_usage, ProviderUsageMissingError
                try:
                    aggregated_result = {
                        "provider": ctx.provider or "unknown",
                        "model":    ctx.model    or "unknown",
                        "usage": {
                            "input_tokens":  ctx.usage["input_tokens"],
                            "output_tokens": ctx.usage["output_tokens"],
                            "total_tokens":  ctx.usage["total_tokens"],
                        },
                    }
                    provider_usage = extract_usage(aggregated_result)
                except ProviderUsageMissingError as pume:
                    logger.error(
                        f"[AIExecutionService] Stream provider returned no usage for {ctx.execution_id}: {pume}. "
                        "Releasing reservation — workspace will NOT be charged."
                    )
                    with db.begin_nested():
                        billing_service.token_service.release_token_reservation(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            reason=f"Provider usage missing: {pume}",
                        )
                    db.commit()
                    reservation_created = False
                    return

                billing_service.token_service.settle_from_provider_usage(
                    db=db,
                    reservation_id=ctx.reservation_id,
                    usage=provider_usage,
                    feature_key=ctx.feature_key,
                    execution_id=ctx.execution_id,
                )
                logger.info(
                    f"[AIExecutionService] Stream settled | execution={ctx.execution_id} "
                    f"provider={provider_usage['provider']} tokens={provider_usage['total_tokens']}"
                )
                reservation_created = False

        except asyncio.CancelledError as e:
            logger.info(f"[AIExecutionService] Stream cancelled ({type(e).__name__}) for {ctx.execution_id}")
            if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                try:
                    with db.begin_nested():
                        billing_service.token_service.release_token_reservation(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            reason=f"Stream cancelled: {type(e).__name__}"
                        )
                    logger.info(f"[AIExecutionService] Released reservation {ctx.reservation_id} successfully.")
                except Exception as release_err:
                    logger.error(f"CRITICAL: Failed to release reservation {ctx.reservation_id} on stream fallback: {release_err}")
            raise e
        except GeneratorExit as e:
            logger.info(f"[AIExecutionService] Stream exited ({type(e).__name__}) for {ctx.execution_id}")
            if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                try:
                    with db.begin_nested():
                        billing_service.token_service.release_token_reservation(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            reason=f"Stream exited: {type(e).__name__}"
                        )
                    logger.info(f"[AIExecutionService] Released reservation {ctx.reservation_id} successfully.")
                except Exception as release_err:
                    logger.error(f"CRITICAL: Failed to release reservation {ctx.reservation_id} on stream fallback: {release_err}")
            raise e
        except Exception as e:
            logger.error(f"[AIExecutionService] Failure in stream execution {ctx.execution_id}: {e}", exc_info=True)
            if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                try:
                    with db.begin_nested():
                        billing_service.token_service.release_token_reservation(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            reason=f"Stream execution failed: {type(e).__name__}"
                        )
                    logger.info(f"[AIExecutionService] Released reservation {ctx.reservation_id} successfully.")
                except Exception as release_err:
                    logger.error(f"CRITICAL: Failed to release reservation {ctx.reservation_id} on stream fallback: {release_err}")
            raise e
        finally:
            current_execution_context.reset(token_token)

    @classmethod
    def cleanup_reservation(cls, db: Session, reservation_id: str, reason: str) -> None:
        """Helper to release/cleanup a reservation in case of external router/orchestrator failures."""
        if not reservation_id:
            return
        try:
            from app.services.billing.billing_service import BillingService
            BillingService().release_token_reservation(db, reservation_id, reason)
            logger.info(f"[AIExecutionService] Defensive cleanup of reservation {reservation_id} succeeded.")
        except Exception as err:
            logger.error(f"[AIExecutionService] Failed to defensively clean up reservation {reservation_id}: {err}")
