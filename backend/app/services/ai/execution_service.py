import contextvars
from enum import Enum
import uuid
import asyncio
from decimal import Decimal
from typing import Any, Dict, Optional, AsyncGenerator
from sqlalchemy.orm import Session
from app.core.exceptions import WorkspaceAccessError, BillingError, AIProviderError
from app.core.logger import logger
from app.models.workspace import Workspace,WorkspaceMember
from app.services.billing.billing_service import BillingService, enforce_execution_policy
from app.services.billing.feature_billing_service import FeatureBillingService
from app.services.billing.gateway.base import TOKENS_PER_CREDIT
from app.services.ai.llm_router import LLMRouter
from app.services.model_config_service import ModelConfigService
from app.services.config_service import config_service
from app.services.ai.llm_utils import extract_usage, ProviderUsageMissingError
from app.models.token_ledger import TokenLedger as _TL

_PROVIDER_KEY_MAP: Dict[str, str] = {
    "claude":  "anthropic_api_key",
    "openai":  "openai_api_key",
    "gemini":  "google_api_key",
    "groq":    "groq_api_key",
}


def _to_experience_level(model: str) -> str:
    """Normalize model alias to ModelConfigService experience-level key."""
    _ALIAS = {
        "sonnet":       "smart",
        "gemini":       "flash",
        "groq":         "fast",
        "opus":         "deep",
        "gemini_flash": "flash",
    }
    return _ALIAS.get(model, model)


def _resolve_provider_config(db, feature_key: str, experience_level: str):
   


    primary   = ModelConfigService(db).get_config_for_feature(feature_key, experience_level)
    provider  = primary.get("provider", "")

    # ── Check primary provider credentials ────────────────────────────────────
    key_name     = _PROVIDER_KEY_MAP.get(provider)
    key_val      = config_service.get(key_name) if key_name else None
    primary_ok   = bool(key_val and isinstance(key_val, str) and key_val.strip())

    if primary_ok:
        logger.info(f"[AIExecutionService] Using primary provider: '{provider}'")
        return primary, False

    # ── Primary unavailable — check fallback ──────────────────────────────────
    if not primary.get("fallback_enabled"):
        raise AIProviderError(
            f"Primary provider '{provider}' is unavailable (key missing) "
            "and no fallback is configured."
        )

    fallback_provider  = primary.get("fallback_provider", "")
    fb_key_name        = _PROVIDER_KEY_MAP.get(fallback_provider)
    fb_key_val         = config_service.get(fb_key_name) if fb_key_name else None
    fallback_ok        = bool(fb_key_val and isinstance(fb_key_val, str) and fb_key_val.strip())

    if not fallback_ok:
        raise AIProviderError(
            f"Primary provider '{provider}' and fallback provider '{fallback_provider}' "
            "are both unavailable (keys missing)."
        )

    fallback_config = {
        "provider":          fallback_provider,
        "model":             primary.get("fallback_model"),
        "temperature":       primary.get("temperature", 0.7),
        "max_tokens":        primary.get("max_tokens", 800),
        "top_p":             primary.get("top_p", 1.0),
        "frequency_penalty": primary.get("frequency_penalty", 0.0),
        "presence_penalty":  primary.get("presence_penalty", 0.0),
        "api_key_env":       None,
    }
    logger.warning(
        f"[AIExecutionService] Primary provider '{provider}' unavailable (key missing). "
        f"Using fallback: provider='{fallback_provider}' model='{fallback_config['model']}'"
    )
    return fallback_config, True


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
    CHAT = "chat"
    RAG = "rag"
    INBOX = "inbox"
    FLOW = "flow"
    TEMPLATE = "template"

    KNOWLEDGE = "knowledge"

    EMAIL_CLASSIFICATION = "email_classification"
    EMAIL_SUMMARY = "email_summary"
    EMAIL_ENTITY_EXTRACTION = "email_entity_extraction"
    EMAIL_PROCESSING = "email_processing"

    # Future Features (No database redesign needed)
    VISION = "vision"
    SPEECH = "speech"
    IMAGE = "image"
    OCR = "ocr"

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
       
        self.resolved_config: Optional[dict] = None
        self.used_fallback: bool = False

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
    def _handle_reservation_cleanup(
        db: Session,
        reservation_id: str,
        is_internal_db: bool,
        reason: str,
        success: bool = False,
        actual_units: float = None,
    ) -> None:
        """
        Helper method to centralize token reservation release/finalization.
        Ensures that if is_internal_db is True, db.commit() is executed exactly once
        at the end of the transaction. Otherwise, transaction control is left to the caller.
        """
        if not reservation_id:
            return

        from app.services.billing.billing_service import BillingService
        billing_service = BillingService()

        try:
            with db.begin_nested():
                if success:
                    billing_service.token_service.finalize_feature_credits(
                        db=db,
                        reservation_id=reservation_id,
                        actual_units=float(actual_units) if actual_units is not None else 0.0
                    )
                else:
                    billing_service.token_service.release_token_reservation(
                        db=db,
                        reservation_id=reservation_id,
                        reason=reason
                    )
            if is_internal_db:
                db.commit()
            logger.info(f"[AIExecutionService] Successfully {'finalized' if success else 'released'} reservation {reservation_id}.")
        except Exception as err:
            logger.error(f"CRITICAL: Failed to {'finalize' if success else 'release'} reservation {reservation_id}: {err}")

    @staticmethod
    async def execute(
        db: Optional[Session] = None,
        workspace_id: Optional[str] = None,
        user_id: Optional[str] = None,
        feature_key: Optional[str] = None,
        prompt: Optional[str] = None,
        system_prompt: Optional[str] = None,
        structured_output: bool = False,
        model: str = "auto",
        media_data: bytes = None,
        mime_type: str = None,
        context: AIExecutionContext = None,
        bypass_billing: bool = False,
        description: str = None,
        execute_fn: Any = None,
        custom_unit_amount: float = None
    ) -> Dict[str, Any]:
        
        is_internal_db = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            is_internal_db = True

        try:
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

                # 6. Execute Provider
                #    Provider config is resolved ONCE here and cached on ctx.resolved_config.
                #    All nested AI calls reuse ctx.resolved_config — no per-call re-discovery.
                if execute_fn:
                    # Pre-resolve provider config before calling execute_fn.
                    # Credential checking belongs in the orchestration layer, not in LLMRouter.
                    if not ctx.resolved_config:
                        _exp = _to_experience_level(model)
                        _resolved, _used_fb = _resolve_provider_config(db, ctx.feature_key, _exp)
                        ctx.resolved_config = _resolved
                        ctx.used_fallback   = _used_fb
                        ctx.provider        = _resolved.get("provider")
                        ctx.model           = _resolved.get("model")
                        logger.info(
                            f"[AIExecutionService] Resolved provider for exec {ctx.execution_id}: "
                            f"provider='{ctx.provider}' model='{ctx.model}' fallback={ctx.used_fallback}"
                        )

                    result = await execute_fn()
                    # If usage is returned and was not already accumulated by nested calls
                    if result and "usage" in result and ctx.usage["total_tokens"] == 0:
                        usage = result.get("usage", {})
                        ctx.add_usage(usage.get("input_tokens", 0), usage.get("output_tokens", 0))
                else:
                    _exp = _to_experience_level(model)

                    if ctx.resolved_config:
                       
                        config = ctx.resolved_config
                    else:
                        # Root non-fn execution — resolve provider and cache on context.
                        config, _used_fb = _resolve_provider_config(db, ctx.feature_key, _exp)
                        ctx.resolved_config = config
                        ctx.used_fallback   = _used_fb
                        ctx.provider        = config.get("provider")
                        ctx.model           = config.get("model")
                        logger.info(
                            f"[AIExecutionService] Resolved provider for exec {ctx.execution_id}: "
                            f"provider='{ctx.provider}' model='{ctx.model}' fallback={ctx.used_fallback}"
                        )

                    try:
                        result = await router.generate(
                            prompt, model=model, feature_key=ctx.feature_key,
                            media_data=media_data, mime_type=mime_type, config=config,
                            system_prompt=system_prompt, structured_output=structured_output
                        )
                    except Exception as primary_err:
                        from app.services.ai.llm_router import is_retryable_provider_error
                        if not is_retryable_provider_error(primary_err):
                            raise primary_err

                        # Runtime failure (network/rate-limit, not a key issue).
                        # Guard against infinite cycles if we are already on the fallback.
                        if ctx.used_fallback:
                            logger.error(
                                f"[AIExecutionService] Fallback provider '{config.get('provider')}' "
                                f"also failed at runtime: {primary_err}"
                            )
                            raise AIProviderError("AI services are temporarily unavailable. Please try again later.")

                        from app.services.model_config_service import ModelConfigService
                        _primary_cfg = ModelConfigService(db).get_config_for_feature(ctx.feature_key, _exp)
                        if not _primary_cfg.get("fallback_enabled"):
                            logger.error(f"[AIExecutionService] Primary AI call failed and fallback is disabled: {primary_err}")
                            raise AIProviderError("AI services are temporarily unavailable. Please try again later.")

                        fallback_config = {
                            "provider":          _primary_cfg.get("fallback_provider"),
                            "model":             _primary_cfg.get("fallback_model"),
                            "temperature":       _primary_cfg.get("temperature", 0.7),
                            "max_tokens":        _primary_cfg.get("max_tokens", 800),
                            "top_p":             _primary_cfg.get("top_p", 1.0),
                            "frequency_penalty": _primary_cfg.get("frequency_penalty", 0.0),
                            "presence_penalty":  _primary_cfg.get("presence_penalty", 0.0),
                            "api_key_env":       None,
                        }
                        logger.warning(
                            f"[AIExecutionService] Runtime fallback: "
                            f"provider='{fallback_config.get('provider')}' model='{fallback_config.get('model')}' "
                            f"(triggered by: {primary_err})"
                        )
                        # Update context so subsequent nested calls use the runtime fallback too
                        ctx.resolved_config = fallback_config
                        ctx.used_fallback   = True
                        ctx.provider        = fallback_config.get("provider")
                        ctx.model           = fallback_config.get("model")

                        try:
                            result = await router.generate(
                                prompt, model=model, feature_key=ctx.feature_key,
                                media_data=media_data, mime_type=mime_type, config=fallback_config,
                                system_prompt=system_prompt, structured_output=structured_output
                            )
                        except Exception as fallback_err:
                            logger.error(f"[AIExecutionService] Fallback AI call also failed: {fallback_err}")
                            raise AIProviderError("AI services are temporarily unavailable. Please try again later.")

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
                            AIExecutionService._handle_reservation_cleanup(
                                db=db,
                                reservation_id=ctx.reservation_id,
                                is_internal_db=is_internal_db,
                                reason=f"Provider usage missing: {pume}"
                            )
                            reservation_created = False
                            return result

                        # Settle: deduct actual provider tokens, not the reservation estimate
                        billing_service.token_service.settle_from_provider_usage(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            usage=provider_usage,
                            feature_key=ctx.feature_key,
                            execution_id=ctx.execution_id,
                            commit=is_internal_db
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
                    AIExecutionService._handle_reservation_cleanup(
                        db=db,
                        reservation_id=ctx.reservation_id,
                        is_internal_db=is_internal_db,
                        reason=f"Execution cancelled: {type(e).__name__}"
                    )
                raise e
            except GeneratorExit as e:
                logger.info(f"[AIExecutionService] Execution exited ({type(e).__name__}) for {ctx.execution_id}")
                if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                    AIExecutionService._handle_reservation_cleanup(
                        db=db,
                        reservation_id=ctx.reservation_id,
                        is_internal_db=is_internal_db,
                        reason=f"Execution exited: {type(e).__name__}"
                    )
                raise e
            except Exception as e:
                logger.error(f"[AIExecutionService] Failure in execution {ctx.execution_id}: {e}", exc_info=True)
                # 8. Release Reservation on Failure
                if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                    AIExecutionService._handle_reservation_cleanup(
                        db=db,
                        reservation_id=ctx.reservation_id,
                        is_internal_db=is_internal_db,
                        reason=f"Execution failed: {type(e).__name__}"
                    )
                raise e
            finally:
                current_execution_context.reset(token_token)
        finally:
            if is_internal_db:
                db.close()

    @staticmethod
    async def execute_stream(
        db: Optional[Session] = None,
        workspace_id: Optional[str] = None,
        user_id: Optional[str] = None,
        feature_key: Optional[str] = None,
        prompt: Optional[str] = None,
        model: str = "auto",
        execute_fn: Any = None,
        context: AIExecutionContext = None,
        bypass_billing: bool = False,
        description: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        
        is_internal_db = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            is_internal_db = True

        try:
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
                    provider=model if model != "auto" else None,
                    model=model if model != "auto" else None,
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
                #    Provider config is resolved ONCE and cached on ctx.resolved_config.
                #    All nested AI calls (RAG, tool planner, follow-up…) reuse it.
                if execute_fn:
                    # Pre-resolve provider config before calling execute_fn.
                    # Credential checking belongs in the orchestration layer, not in LLMRouter.
                    if not ctx.resolved_config:
                        _exp = _to_experience_level(model)
                        _resolved, _used_fb = _resolve_provider_config(db, ctx.feature_key, _exp)
                        ctx.resolved_config = _resolved
                        ctx.used_fallback   = _used_fb
                        ctx.provider        = _resolved.get("provider")
                        ctx.model           = _resolved.get("model")
                        logger.info(
                            f"[AIExecutionService] Stream resolved provider for exec {ctx.execution_id}: "
                            f"provider='{ctx.provider}' model='{ctx.model}' fallback={ctx.used_fallback}"
                        )

                    async for chunk in execute_fn():
                        yield chunk
                else:
                    _exp = _to_experience_level(model)

                    if ctx.resolved_config:
                        # Nested call — reuse the provider already chosen for this request.
                        config = ctx.resolved_config
                    else:
                        # Root non-fn stream execution — resolve provider and cache on context.
                        config, _used_fb = _resolve_provider_config(db, ctx.feature_key, _exp)
                        ctx.resolved_config = config
                        ctx.used_fallback   = _used_fb
                        ctx.provider        = config.get("provider")
                        ctx.model           = config.get("model")
                        logger.info(
                            f"[AIExecutionService] Stream resolved provider for exec {ctx.execution_id}: "
                            f"provider='{ctx.provider}' model='{ctx.model}' fallback={ctx.used_fallback}"
                        )

                    try:
                        result = await router.generate(
                            prompt, model=model, feature_key=ctx.feature_key, config=config
                        )
                    except Exception as primary_err:
                        from app.services.ai.llm_router import is_retryable_provider_error
                        if not is_retryable_provider_error(primary_err):
                            raise primary_err

                        # Runtime failure — guard against cycles if already on fallback.
                        if ctx.used_fallback:
                            logger.error(
                                f"[AIExecutionService] Stream fallback provider '{config.get('provider')}' "
                                f"also failed at runtime: {primary_err}"
                            )
                            raise AIProviderError("AI services are temporarily unavailable. Please try again later.")

                        
                        _primary_cfg = ModelConfigService(db).get_config_for_feature(ctx.feature_key, _exp)
                        if not _primary_cfg.get("fallback_enabled"):
                            logger.error(f"[AIExecutionService] Primary AI stream call failed and fallback is disabled: {primary_err}")
                            raise AIProviderError("AI services are temporarily unavailable. Please try again later.")

                        fallback_config = {
                            "provider":          _primary_cfg.get("fallback_provider"),
                            "model":             _primary_cfg.get("fallback_model"),
                            "temperature":       _primary_cfg.get("temperature", 0.7),
                            "max_tokens":        _primary_cfg.get("max_tokens", 800),
                            "top_p":             _primary_cfg.get("top_p", 1.0),
                            "frequency_penalty": _primary_cfg.get("frequency_penalty", 0.0),
                            "presence_penalty":  _primary_cfg.get("presence_penalty", 0.0),
                            "api_key_env":       None,
                        }
                        logger.warning(
                            f"[AIExecutionService] Stream runtime fallback: "
                            f"provider='{fallback_config.get('provider')}' model='{fallback_config.get('model')}' "
                            f"(triggered by: {primary_err})"
                        )
                        # Update context so subsequent nested calls use the runtime fallback too
                        ctx.resolved_config = fallback_config
                        ctx.used_fallback   = True
                        ctx.provider        = fallback_config.get("provider")
                        ctx.model           = fallback_config.get("model")

                        try:
                            result = await router.generate(
                                prompt, model=model, feature_key=ctx.feature_key, config=fallback_config
                            )
                        except Exception as fallback_err:
                            logger.error(f"[AIExecutionService] Stream fallback AI call also failed: {fallback_err}")
                            raise AIProviderError("AI services are temporarily unavailable. Please try again later.")

                    ctx.provider = result.get("provider") or ctx.provider
                    ctx.model    = result.get("model")    or ctx.model
                    usage = result.get("usage", {})
                    ctx.add_usage(usage.get("input_tokens", 0), usage.get("output_tokens", 0))
                    yield {"content": result.get("text", "")}

                # Settle Billing from Provider Usage (streaming — root level only)
                if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested:
                   
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
                        AIExecutionService._handle_reservation_cleanup(
                            db=db,
                            reservation_id=ctx.reservation_id,
                            is_internal_db=is_internal_db,
                            reason=f"Provider usage missing: {pume}"
                        )
                        reservation_created = False
                        return

                    billing_service.token_service.settle_from_provider_usage(
                        db=db,
                        reservation_id=ctx.reservation_id,
                        usage=provider_usage,
                        feature_key=ctx.feature_key,
                        execution_id=ctx.execution_id,
                        commit=is_internal_db
                    )
                    logger.info(
                        f"[AIExecutionService] Stream settled | execution={ctx.execution_id} "
                        f"provider={provider_usage['provider']} tokens={provider_usage['total_tokens']}"
                    )
                    reservation_created = False

            except asyncio.CancelledError as e:
                logger.info(f"[AIExecutionService] Stream cancelled ({type(e).__name__}) for {ctx.execution_id}")
                if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                    AIExecutionService._handle_reservation_cleanup(
                        db=db,
                        reservation_id=ctx.reservation_id,
                        is_internal_db=is_internal_db,
                        reason=f"Stream cancelled: {type(e).__name__}"
                    )
                raise e
            except GeneratorExit as e:
                logger.info(f"[AIExecutionService] Stream exited ({type(e).__name__}) for {ctx.execution_id}")
                if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                    AIExecutionService._handle_reservation_cleanup(
                        db=db,
                        reservation_id=ctx.reservation_id,
                        is_internal_db=is_internal_db,
                        reason=f"Stream exited: {type(e).__name__}"
                    )
                raise e
            except Exception as e:
                logger.error(f"[AIExecutionService] Failure in stream execution {ctx.execution_id}: {e}", exc_info=True)
                if reservation_created and ctx.billing_mode == ExecutionMode.NORMAL and not is_nested and ctx.reservation_id:
                    AIExecutionService._handle_reservation_cleanup(
                        db=db,
                        reservation_id=ctx.reservation_id,
                        is_internal_db=is_internal_db,
                        reason=f"Stream execution failed: {type(e).__name__}"
                    )
                raise e
            finally:
                current_execution_context.reset(token_token)
        finally:
            if is_internal_db:
                db.close()

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
