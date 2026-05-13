import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from jinja2 import Environment, Undefined
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import exc as sa_exc
from sqlalchemy.exc import IntegrityError
from collections import OrderedDict

from app.core.config import settings
from app.models.automation import AutomationFlow
from app.models.conversation import Conversation
from app.models.flow_execution import FlowExecutionState
from app.models.outbound_message import OutboundMessage
from app.services.agentic_rag.rag_service import get_rag_service
from app.services.execution_tracer import ExecutionTracer
from app.services.llm_utils import safe_llm_call
from app.services.trigger_engine import match_button_target, match_trigger


class SilentUndefined(Undefined):
    def _fail_with_undefined_error(self, *args, **kwargs):
        return ""


logger = logging.getLogger(__name__)

# Module-level singletons (avoid re-instantiation per request)──────────
_rag_singleton = get_rag_service()


class _LRULockCache:
    """Bounded cache of asyncio.Lock objects keyed by conversation ID.

    Caps memory usage at `max_size` entries. Least-recently-used entries
    are evicted when the cap is reached, which is safe because a lock
    that has been idle long enough to be evicted will never be held.
    """

    def __init__(self, max_size: int = 10_000):
        self._max = max_size
        self._cache: OrderedDict[str, asyncio.Lock] = OrderedDict()

    def __getitem__(self, key: str) -> asyncio.Lock:
        if key in self._cache:
            self._cache.move_to_end(key)
        else:
            if len(self._cache) >= self._max:
                self._cache.popitem(last=False)
            self._cache[key] = asyncio.Lock()
        return self._cache[key]


_conversation_locks = _LRULockCache(max_size=10_000)
# Configurable fallback message─
FLOW_FALLBACK_MESSAGE = (
    settings.FLOW_FALLBACK_MESSAGE or "Sorry, something went wrong. Please try again."
)
EXECUTION_LEASE_SECONDS = 120


class ConversationExecutionBusy(Exception):
    pass


class FlowServiceV2:
    def __init__(self):
        self.rag = _rag_singleton

        self.tracer = ExecutionTracer()
        self.max_iterations = 50
        self.template_env = Environment(undefined=SilentUndefined)
        self.template_env.globals.update({"safe": lambda x: x})

    def _calculate_cost(self, tokens_in: int, tokens_out: int, model: str) -> float:
        pricing = {
            "claude": {"input": 0.003 / 1000, "output": 0.015 / 1000},
            "gpt": {"input": 0.0005 / 1000, "output": 0.0015 / 1000},
            "groq": {"input": 0.000025 / 1000, "output": 0.00010 / 1000},
        }
        provider_prices = pricing.get(model, pricing["groq"])
        return (tokens_in * provider_prices["input"]) + (
            tokens_out * provider_prices["output"]
        )

    # ───────────────────────
    # PUBLIC ENTRY POINT
    # ───────────────────────

    async def execute_incoming_message(
        self,
        db: Session,
        *,
        conversation_id: Any,
        inbound_text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        logger.info(f"🚨 FLOW STARTED! Message: '{inbound_text}'")
        metadata = metadata or {}

        conversation = (
            db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )
        if not conversation:
            logger.warning(
                "Conversation %s not found for flow execution", conversation_id
            )
            return False

        execution_token = str(uuid.uuid4())
        state = self._claim_execution_slot(db, conversation.id, execution_token)
        state.runtime_context = state.runtime_context or {}
        state.runtime_context["last_user_message"] = inbound_text

        try:
            # Priority 1: pending button reply────────────────────────
            if state.pending_button:
                handled = await self._handle_pending_button(
                    db=db,
                    conversation=conversation,
                    state=state,
                    inbound_text=inbound_text,
                    metadata=metadata,
                    execution_token=execution_token,
                )
                if handled:
                    self._persist_state(db, state)
                    from app.workers.flow_execution import send_next_pending_message

                    send_next_pending_message.apply_async(
                        args=[str(conversation_id)], countdown=1
                    )
                    return True

            # Priority 2: pending question reply──────────────────────
            if state.pending_question:
                handled = await self._handle_pending_question(
                    db=db,
                    conversation=conversation,
                    state=state,
                    inbound_text=inbound_text,
                    execution_token=execution_token,
                )
                if handled:
                    self._persist_state(db, state)
                    from app.workers.flow_execution import send_next_pending_message

                    send_next_pending_message.apply_async(
                        args=[str(conversation_id)], countdown=1
                    )
                    return True

            # Only if NO pending state → trigger match───────────────────

            match = self._find_trigger_match(
                db=db,
                workspace_id=conversation.workspace_id,
                inbound_text=inbound_text,
            )

            if not match:
                self.tracer.trace(
                    db,
                    conversation_id=conversation.id,
                    event_type="trigger_matched",
                    status="miss",
                    metadata={"message": inbound_text},
                )
                db.commit()
                return False
            flow, trigger_node, trigger_match = match
            self.tracer.trace(
                db,
                conversation_id=conversation.id,
                flow_id=flow.id,
                node_id=trigger_node.get("id"),
                event_type="trigger_matched",
                metadata={
                    "match_type": trigger_match.match_type,
                    "keyword": trigger_match.matched_keyword,
                    "confidence": trigger_match.confidence,
                },
            )

            state.active_flow_id = flow.id
            state.current_node_id = trigger_node.get("id")
            state.runtime_context["node_visit_counts"] = {}
            state.runtime_context["executed_nodes"] = []

            # Cancel all old-flow messages that haven't been sent yet.
            # "pending" AND "in_progress" — if send_whatsapp_message_task
            # hasn't started, it will find status='cancelled' and skip.
            (
                db.query(OutboundMessage)
                .filter(
                    OutboundMessage.conversation_id == conversation.id,
                    OutboundMessage.status.in_(["pending", "in_progress"]),
                    OutboundMessage.flow_id != flow.id,
                )
                .update({"status": "cancelled"}, synchronize_session=False)
            )
            # Cancel any pending scheduled resumes from old delayed nodes
            from app.models.scheduled_resume import ScheduledResume

            db.query(ScheduledResume).filter(
                ScheduledResume.conversation_id == conversation.id,
                ScheduledResume.status == "pending",
            ).update({"status": "cancelled"}, synchronize_session=False)
            db.flush()
            next_node_id = self._get_default_target(
                flow.edges or [], trigger_node.get("id")
            )
            logger.info(f"🎯 Matched Flow ID: {flow.id} | Next Node ID: {next_node_id}")

            if not next_node_id:
                logger.warning("⚠️ Trigger node has no outgoing connection. Stopping.")
                self._persist_state(db, state)
                return True

            await self._execute_from_node(
                db=db,
                conversation=conversation,
                flow=flow,
                state=state,
                node_id=next_node_id,
                inbound_text=inbound_text,
                execution_token=execution_token,
            )
            self._persist_state(db, state)
            # Kick off sequential dispatch — countdown=1 ensures all
            # outbound rows from this execution are committed and visible.
            from app.workers.flow_execution import send_next_pending_message

            send_next_pending_message.apply_async(
                args=[str(conversation_id)], countdown=1
            )
            return True

        except Exception as exc:
            db.rollback()
            executed = (state.runtime_context or {}).get("executed_nodes", [])
            logger.exception(
                "Flow execution failed for conversation %s | executed_nodes=%s",
                conversation.id,
                executed,
            )
            self.tracer.trace(
                db,
                conversation_id=conversation.id,
                flow_id=state.active_flow_id,
                node_id=state.current_node_id,
                event_type="error",
                status="failed",
                error_message=str(exc),
                metadata={"message": inbound_text, "executed_nodes": executed},
            )
            db.commit()
            return False
        finally:
            self._release_execution_slot(db, conversation.id, execution_token)

    # ───────────────────────
    # RESUME EXECUTION (Triggered by Celery after delay)
    # ───────────────────────

    async def resume_node_execution(
        self,
        db: Session,
        conversation_id: str,
        node_id: str,
        inbound_text: str,
        msg_sequence_val: int,
    ) -> None:
        conversation = (
            db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )
        if not conversation:
            return

        execution_token = str(uuid.uuid4())
        state = self._claim_execution_slot(db, conversation.id, execution_token)
        try:
            flow = (
                db.query(AutomationFlow)
                .filter(AutomationFlow.id == state.active_flow_id)
                .first()
            )
            if not flow:
                return

            # NOTE: node_visit_counts intentionally persists across delay resumes
            # to enforce total execution safety over the entire flow run.
            logger.info(f"⏳ Resuming flow {flow.id} from node {node_id} after delay!")
            msg_sequence = [msg_sequence_val]

            await self._execute_from_node(
                db=db,
                conversation=conversation,
                flow=flow,
                state=state,
                node_id=node_id,
                inbound_text=inbound_text,
                msg_sequence=msg_sequence,
                skip_delay=True,
                execution_token=execution_token,
            )
            self._persist_state(db, state)
            # Kick off sequential dispatch — countdown=1 ensures all
            # outbound rows from this execution are committed and visible.
            from app.workers.flow_execution import send_next_pending_message

            send_next_pending_message.apply_async(
                args=[str(conversation_id)], countdown=1
            )
        finally:
            self._release_execution_slot(db, conversation.id, execution_token)

    # ───────────────────────
    # STATE
    # ───────────────────────

    def _get_or_create_state(
        self, db: Session, conversation_id: Any
    ) -> FlowExecutionState:
        state = (
            db.query(FlowExecutionState)
            .filter(FlowExecutionState.conversation_id == conversation_id)
            .first()
        )
        if state:
            if state.runtime_context is None:
                state.runtime_context = {}
            return state

        try:
            state = FlowExecutionState(
                conversation_id=conversation_id,
                context={},
                runtime_context={},
                version=1,
            )
            db.add(state)
            db.flush()
            return state
        except IntegrityError:
            db.rollback()
            state = (
                db.query(FlowExecutionState)
                .filter(FlowExecutionState.conversation_id == conversation_id)
                .first()
            )
            if state:
                if state.runtime_context is None:
                    state.runtime_context = {}
                return state
            raise Exception("Failed to create or fetch FlowExecutionState")

    def _persist_state(self, db: Session, state: FlowExecutionState) -> None:
        state.version = (state.version or 0) + 1
        flag_modified(state, "runtime_context")
        db.add(state)
        db.commit()

    def _claim_execution_slot(
        self,
        db: Session,
        conversation_id: Any,
        execution_token: str,
        lease_seconds: int = EXECUTION_LEASE_SECONDS,
    ) -> FlowExecutionState:
        self._get_or_create_state(db, conversation_id)
        state = (
            db.query(FlowExecutionState)
            .filter(FlowExecutionState.conversation_id == conversation_id)
            .with_for_update()
            .first()
        )
        if not state:
            raise RuntimeError(
                f"Execution state not found for conversation {conversation_id}"
            )

        control = self._get_execution_control(state)
        now = datetime.now(timezone.utc)
        lease_expires_at = self._parse_utc(control.get("lease_expires_at"))
        if (
            control.get("is_active")
            and control.get("token") != execution_token
            and lease_expires_at
            and lease_expires_at > now
        ):
            db.rollback()
            raise ConversationExecutionBusy(
                f"Conversation {conversation_id} is already executing"
            )

        self._set_execution_control(
            state,
            {
                "is_active": True,
                "token": execution_token,
                "lease_expires_at": (
                    now + timedelta(seconds=lease_seconds)
                ).isoformat(),
            },
        )
        state.version = (state.version or 0) + 1
        db.add(state)
        db.commit()
        db.refresh(state)
        return state

    def _refresh_execution_slot(
        self,
        db: Session,
        conversation_id: Any,
        execution_token: Optional[str],
        lease_seconds: int = EXECUTION_LEASE_SECONDS,
    ) -> None:
        if not execution_token:
            return

        state = (
            db.query(FlowExecutionState)
            .filter(FlowExecutionState.conversation_id == conversation_id)
            .with_for_update()
            .first()
        )
        if not state:
            raise RuntimeError(
                f"Execution state not found for conversation {conversation_id}"
            )

        control = self._get_execution_control(state)
        if control.get("token") != execution_token:
            db.rollback()
            raise ConversationExecutionBusy(
                f"Conversation {conversation_id} execution token lost ownership"
            )

        control["is_active"] = True
        control["lease_expires_at"] = (
            datetime.now(timezone.utc) + timedelta(seconds=lease_seconds)
        ).isoformat()
        self._set_execution_control(state, control)
        state.version = (state.version or 0) + 1
        db.add(state)
        db.commit()
        db.refresh(state)

    def _release_execution_slot(
        self,
        db: Session,
        conversation_id: Any,
        execution_token: Optional[str],
    ) -> None:
        if not execution_token:
            return

        try:
            state = (
                db.query(FlowExecutionState)
                .filter(FlowExecutionState.conversation_id == conversation_id)
                .with_for_update()
                .first()
            )
            if not state:
                db.rollback()
                return

            control = self._get_execution_control(state)
            if control.get("token") != execution_token:
                db.rollback()
                return

            self._set_execution_control(state, None)
            state.version = (state.version or 0) + 1
            db.add(state)
            db.commit()
        except sa_exc.SQLAlchemyError:
            db.rollback()
            logger.exception(
                "Failed to release execution slot | conversation=%s",
                conversation_id,
            )

    def _get_execution_control(self, state: FlowExecutionState) -> Dict[str, Any]:
        runtime_context = state.runtime_context or {}
        return dict(runtime_context.get("_execution_control") or {})

    def _set_execution_control(
        self,
        state: FlowExecutionState,
        control: Optional[Dict[str, Any]],
    ) -> None:
        rc = dict(state.runtime_context or {})
        if control:
            rc["_execution_control"] = control
        else:
            rc.pop("_execution_control", None)
        state.runtime_context = rc  # assignment → SQLAlchemy detects the change

    @staticmethod
    def _parse_utc(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        parsed = datetime.fromisoformat(value)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

    # ───────────────────────
    # TRIGGER MATCHING
    # ───────────────────────

    def _find_trigger_match(self, db, workspace_id, inbound_text: str):
        logger.info(f"🔍 Searching flows for Workspace ID: {workspace_id}")
        flows = (
            db.query(AutomationFlow)
            .filter(
                AutomationFlow.workspace_id == workspace_id,
                AutomationFlow.status == "Active",
                AutomationFlow.trigger_type == "msg_recv",
            )
            .order_by(AutomationFlow.created_at.asc())
            .all()
        )

        best_match = None

        # STEP 1: Keyword / fuzzy match (fast path)
        for flow in flows:
            trigger_node = next(
                (n for n in (flow.nodes or []) if n.get("type") == "trigger"), None
            )
            if not trigger_node:
                continue
            match = match_trigger(trigger_node, event="msg_recv", message=inbound_text)
            if match.matched:
                if not best_match or match.confidence > best_match[2].confidence:
                    best_match = (flow, trigger_node, match)

        if best_match:
            return best_match

        # STEP 2: Semantic fallback via PgVector — guarded
        logger.info("🧠 No keyword match. Trying semantic trigger fallback…")
        try:
            trigger_corpus = []
            for flow in flows:
                trigger_node = next(
                    (n for n in (flow.nodes or []) if n.get("type") == "trigger"), None
                )
                if not trigger_node:
                    continue
                for kw in (trigger_node.get("config") or {}).get("keywords", []):
                    trigger_corpus.append(
                        {"flow": flow, "node": trigger_node, "phrase": kw}
                    )

            if not trigger_corpus:
                return None

            #  Guard: only call if the method actually exists on this RAG backend
            if not hasattr(self.rag, "find_semantic_similarity"):
                logger.debug(
                    "RAG backend does not support find_semantic_similarity — skipping"
                )
                return None

            semantic_results = self.rag.find_semantic_similarity(
                query=inbound_text,
                corpus=[item["phrase"] for item in trigger_corpus],
            )

            if semantic_results and semantic_results[0]["score"] > 0.7:
                idx = semantic_results[0]["index"]
                matched_item = trigger_corpus[idx]
                from app.services.trigger_engine import TriggerMatchResult

                semantic_match = TriggerMatchResult(
                    matched=True,
                    confidence=semantic_results[0]["score"],
                    match_type="semantic",
                    matched_keyword=matched_item["phrase"],
                )
                logger.info(
                    f"🎯 Semantic match: '{inbound_text}' → '{matched_item['phrase']}' "
                    f"(score={semantic_results[0]['score']:.2f})"
                )
                return (matched_item["flow"], matched_item["node"], semantic_match)

        except Exception as sem_exc:
            # Semantic search failure must never prevent a keyword-matched flow from running.
            # Log and return None — the caller will treat it as a trigger miss.
            logger.warning(f"⚠️ Semantic trigger fallback failed: {sem_exc}")

        return None

    # ───────────────────────
    # BUTTON HANDLING
    # ───────────────────────

    async def _handle_pending_button(
        self,
        db: Session,
        *,
        conversation: Conversation,
        state: FlowExecutionState,
        inbound_text: str,
        metadata: Dict[str, Any],
        execution_token: Optional[str] = None,
    ) -> bool:
        pending = dict(state.pending_button or {})
        if not pending:
            return False

        expires_at = state.button_expires_at
        now = datetime.now(timezone.utc)
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < now:
                logger.info(
                    "⏰ Button expired for conversation %s. Sending fallback.",
                    conversation.id,
                )
                state.pending_button = None
                state.button_expires_at = None
                # Send expiry fallback so the user isn't left without feedback
                from app.workers.flow_execution import send_next_pending_message

                await self._queue_outbound_message(
                    db=db,
                    conversation_id=conversation.id,
                    to_number=self._get_conversation_destination(conversation),
                    body="Your session has expired. Please start again.",
                    metadata={
                        "source": "button_expired",
                        "node_id": pending.get("node_id"),
                    },
                    msg_sequence=[0],
                    execution_token=execution_token,
                    state=state,
                )
                self._persist_state(db, state)
                send_next_pending_message.apply_async(
                    args=[str(conversation.id)], countdown=1
                )
                return True  # handled — don't fall through to trigger matching

        flow = (
            db.query(AutomationFlow)
            .filter(
                AutomationFlow.id == state.active_flow_id,
                AutomationFlow.workspace_id == conversation.workspace_id,
            )
            .first()
        )
        if not flow:
            state.pending_button = None
            state.button_expires_at = None
            return False

        matched_button = match_button_target(
            pending.get("buttons", []),
            inbound_text=inbound_text,
            interactive_value=metadata.get("interactive_value"),
            interactive_label=metadata.get("interactive_label"),
        )
        if not matched_button:
            return False

        self.tracer.trace(
            db,
            conversation_id=conversation.id,
            flow_id=flow.id,
            node_id=pending.get("node_id"),
            event_type="button_matched",
            metadata={
                "button_label": matched_button.get("label"),
                "button_value": matched_button.get("value"),
            },
        )

        state.pending_button = None
        state.button_expires_at = None

        # Resolve target from the EDGE GRAPH (single source of truth)
        # Look for an edge where source == button_node_id and
        # sourceHandle == button.value  (the handle the frontend wires).
        button_node_id = pending.get("node_id")
        button_value = matched_button.get("value") or ""
        target_node_id = next(
            (
                e.get("target")
                for e in (flow.edges or [])
                if e.get("source") == button_node_id
                and e.get("sourceHandle") == button_value
            ),
            None,
        )
        # Fallback: use config-embedded target if edge lookup fails
        # (guards against older flows saved before edge-based routing)
        if not target_node_id:
            target_node_id = matched_button.get("target")
            if target_node_id:
                logger.warning(
                    "⚠️ Button edge not found for handle '%s' on node '%s'. "
                    "Falling back to config.target=%s",
                    button_value,
                    button_node_id,
                    target_node_id,
                )

        if not target_node_id:
            logger.warning(
                "⚠️ No target found for button '%s' on node '%s'. Stopping flow.",
                button_value,
                button_node_id,
            )
            return True

        await self._execute_from_node(
            db=db,
            conversation=conversation,
            flow=flow,
            state=state,
            node_id=target_node_id,
            inbound_text=inbound_text,
            execution_token=execution_token,
        )
        return True

    # ───────────────────────
    # ASK QUESTION HANDLING  ← NEW
    # ───────────────────────

    async def _handle_pending_question(
        self,
        db: Session,
        *,
        conversation: Conversation,
        state: FlowExecutionState,
        inbound_text: str,
        execution_token: Optional[str] = None,
    ) -> bool:
        """
        Called when state.pending_question is set.
        Stores the user's answer in runtime_context[variable_name],
        then continues execution from the next node.
        """
        pending = dict(state.pending_question or {})
        if not pending:
            return False

        # Check expiry
        expires_at = state.question_expires_at
        now = datetime.now(timezone.utc)
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < now:
                logger.info(
                    "⏰ Question expired for conversation %s. Sending fallback.",
                    conversation.id,
                )
                state.pending_question = None
                state.question_expires_at = None
                # Send expiry fallback so the user isn't left without feedback
                from app.workers.flow_execution import send_next_pending_message

                await self._queue_outbound_message(
                    db=db,
                    conversation_id=conversation.id,
                    to_number=self._get_conversation_destination(conversation),
                    body="Your session has expired. Please start again.",
                    metadata={
                        "source": "question_expired",
                        "node_id": pending.get("node_id"),
                    },
                    msg_sequence=[0],
                    execution_token=execution_token,
                    state=state,
                )
                self._persist_state(db, state)
                send_next_pending_message.apply_async(
                    args=[str(conversation.id)], countdown=1
                )
                return True  # handled — don't fall through to trigger matching

        # Load flow (workspace boundary check)
        flow = (
            db.query(AutomationFlow)
            .filter(
                AutomationFlow.id == state.active_flow_id,
                AutomationFlow.workspace_id == conversation.workspace_id,
            )
            .first()
        )
        if not flow:
            state.pending_question = None
            state.question_expires_at = None
            return False

        # Store the reply in context under the configured variable name
        variable_name = pending.get("variable_name") or "user_reply"
        state.runtime_context = state.runtime_context or {}
        state.runtime_context[variable_name] = inbound_text
        state.runtime_context["last_user_message"] = inbound_text
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(state, "runtime_context")
        state.pending_question = None
        state.question_expires_at = None
        db.add(state)
        db.flush()
        self.tracer.trace(
            db,
            conversation_id=conversation.id,
            flow_id=flow.id,
            node_id=pending.get("node_id"),
            event_type="question_answered",
            metadata={
                "variable": variable_name,
                "answer": inbound_text[:200],
            },
        )
        logger.info(
            f" Question answered! Stored '{inbound_text}' → context['{variable_name}']"
        )

        # Clear pending state
        state.pending_question = None
        state.question_expires_at = None

        # Continue from the next node after the ask_question node
        next_node_id = pending.get("next_node_id")
        if next_node_id:
            await self._execute_from_node(
                db=db,
                conversation=conversation,
                flow=flow,
                state=state,
                node_id=next_node_id,
                inbound_text=inbound_text,
                execution_token=execution_token,
            )

        return True

    # ───────────────────────
    # CORE EXECUTION LOOP
    # ───────────────────────

    async def _execute_from_node(
        self,
        db: Session,
        *,
        conversation: Conversation,
        flow: AutomationFlow,
        state: FlowExecutionState,
        node_id: Optional[str],
        inbound_text: str,
        msg_sequence: List[int] = None,
        skip_delay: bool = False,
        execution_token: Optional[str] = None,
    ) -> None:

        if msg_sequence is None:
            msg_sequence = [0]

        nodes = {node.get("id"): node for node in (flow.nodes or [])}
        current_node_id = node_id
        iterations = 0

        while current_node_id:
            self._refresh_execution_slot(db, conversation.id, execution_token)
            iterations += 1
            if iterations > self.max_iterations:
                self.tracer.trace(
                    db,
                    conversation_id=conversation.id,
                    flow_id=flow.id,
                    node_id=current_node_id,
                    event_type="error",
                    status="failed",
                    error_message="Max iteration limit reached",
                )
                return

            state.runtime_context = state.runtime_context or {}
            state.current_node_id = current_node_id
            node = nodes.get(current_node_id)
            if not node:
                return

            # Per-node loop_limit enforcement─────────────────────
            visit_counts = state.runtime_context.setdefault("node_visit_counts", {})
            visit_counts[current_node_id] = visit_counts.get(current_node_id, 0) + 1
            loop_limit = (node.get("config") or {}).get("loop_limit", 3)
            if visit_counts[current_node_id] > loop_limit:
                logger.warning(
                    "⛔ Node '%s' exceeded loop_limit (%d/%d) — stopping execution",
                    current_node_id,
                    visit_counts[current_node_id],
                    loop_limit,
                )
                self.tracer.trace(
                    db,
                    conversation_id=conversation.id,
                    flow_id=flow.id,
                    node_id=current_node_id,
                    event_type="loop_limit_reached",
                    status="stopped",
                    error_message=f"Node visited {visit_counts[current_node_id]} times, limit is {loop_limit}",
                )
                state.current_node_id = None
                return

            # Delay handling──
            config = node.get("config") or {}
            delay_amount = int(config.get("delay_amount") or 0)
            delay_unit = config.get("delay_unit", "minutes")

            if delay_unit == "hours":
                node_delay_seconds = delay_amount * 3600
            elif delay_unit == "minutes":
                node_delay_seconds = delay_amount * 60
            else:
                node_delay_seconds = delay_amount

            if node_delay_seconds > 0 and not skip_delay:
                self._persist_state(db, state)

                # Short delay (<30 min): Celery countdown (in-memory, fast)
                # Long delay (>=30 min): DB-persisted (survives restarts)
                _SHORT_DELAY_THRESHOLD = 1800  # 30 minutes in seconds

                if node_delay_seconds < _SHORT_DELAY_THRESHOLD:
                    logger.info(
                        f"⏳ Node '{current_node_id}' short delay {node_delay_seconds}s → Celery countdown"
                    )
                    from app.workers.flow_execution import resume_flow_node

                    resume_flow_node.apply_async(
                        kwargs={
                            "conversation_id": str(conversation.id),
                            "node_id": current_node_id,
                            "inbound_text": inbound_text,
                            "msg_sequence_val": msg_sequence[0],
                        },
                        countdown=node_delay_seconds,
                    )
                else:
                    logger.info(
                        f"⏳ Node '{current_node_id}' long delay {node_delay_seconds}s → DB scheduled_resumes"
                    )
                    from app.models.scheduled_resume import ScheduledResume

                    run_at = datetime.now(timezone.utc) + timedelta(
                        seconds=node_delay_seconds
                    )
                    sr = ScheduledResume(
                        conversation_id=conversation.id,
                        node_id=current_node_id,
                        inbound_text=inbound_text,
                        msg_sequence_val=msg_sequence[0],
                        flow_id=state.active_flow_id,
                        run_at=run_at,
                        status="pending",
                    )
                    db.add(sr)
                    db.commit()
                    logger.info(
                        "Scheduled resume persisted | conversation=%s node=%s run_at=%s id=%s",
                        conversation.id,
                        current_node_id,
                        run_at.isoformat(),
                        sr.id,
                    )
                return

            started_at = time.perf_counter()
            self.tracer.trace(
                db,
                conversation_id=conversation.id,
                flow_id=flow.id,
                node_id=current_node_id,
                event_type="node_executed",
                metadata={"node_type": node.get("type")},
            )

            if node.get("type") == "action":
                try:
                    stop_execution = await self._handle_action_node(
                        db=db,
                        conversation=conversation,
                        flow=flow,
                        node=node,
                        inbound_text=inbound_text,
                        msg_sequence=msg_sequence,
                        execution_token=execution_token,
                        state=state,
                    )
                except Exception as node_exc:
                    #  Never silently stop — always reply
                    logger.exception(
                        "❌ Node '%s' in flow '%s' raised: %s",
                        current_node_id,
                        flow.id,
                        node_exc,
                    )
                    executed = state.runtime_context.get("executed_nodes", [])
                    self.tracer.trace(
                        db,
                        conversation_id=conversation.id,
                        flow_id=flow.id,
                        node_id=current_node_id,
                        event_type="error",
                        status="failed",
                        error_message=str(node_exc),
                        metadata={
                            "node_label": node.get("label"),
                            "executed_nodes": executed,
                        },
                    )

                    #  Check for an explicit "error" branch edge first
                    error_target = next(
                        (
                            e.get("target")
                            for e in (flow.edges or [])
                            if e.get("source") == current_node_id
                            and e.get("sourceHandle") == "error"
                        ),
                        None,
                    )

                    if error_target:
                        # Route to designer-defined error node
                        logger.info(f"🔀 Routing to error node: {error_target}")
                        current_node_id = error_target
                        skip_delay = False
                        continue
                    else:
                        # Send fallback message and stop
                        await self._queue_outbound_message(
                            db=db,
                            conversation_id=conversation.id,
                            to_number=self._get_conversation_destination(conversation),
                            body=FLOW_FALLBACK_MESSAGE,
                            metadata={
                                "source": "node_error_fallback",
                                "node_id": current_node_id,
                            },
                            msg_sequence=msg_sequence,
                            execution_token=execution_token,
                            state=state,
                        )
                        return

                duration_ms = int((time.perf_counter() - started_at) * 1000)
                self.tracer.trace(
                    db,
                    conversation_id=conversation.id,
                    flow_id=flow.id,
                    node_id=current_node_id,
                    event_type="node_completed",
                    duration_ms=duration_ms,
                    metadata={"action_type": config.get("type")},
                )
                # Track successfully executed nodes for partial-execution visibility
                state.runtime_context.setdefault("executed_nodes", []).append(
                    current_node_id
                )
                if stop_execution:
                    return

            skip_delay = False
            current_node_id = self._get_default_target(
                flow.edges or [], current_node_id
            )

        state.current_node_id = None

    # ───────────────────────
    # ACTION DISPATCH
    # ───────────────────────

    async def _handle_action_node(
        self,
        db: Session,
        *,
        conversation: Conversation,
        flow: AutomationFlow,
        state: FlowExecutionState,
        node: Dict[str, Any],
        inbound_text: str,
        msg_sequence: List[int],
        execution_token: Optional[str] = None,
    ) -> bool:
        config = node.get("config") or {}
        action_type = config.get("type")
        state.runtime_context = state.runtime_context or {}

        # Send Message
        if action_type == "send_msg":
            return await self._handle_send_message_node(
                db=db,
                conversation=conversation,
                flow=flow,
                state=state,
                node=node,
                inbound_text=inbound_text,
                msg_sequence=msg_sequence,
                execution_token=execution_token,
            )

        # AI Brain Query──────
        if action_type == "brain_query":
            response, usage = await self._generate_guardrailed_ai_response(
                db=db,
                workspace_id=conversation.workspace_id,
                prompt=config.get("prompt") or "",
                inbound_text=inbound_text,
                context=state.runtime_context or {},
                collection=config.get("collection"),
                entry_ids=config.get("entry_ids"),
            )
            cost = self._calculate_cost(
                usage.get("input_tokens", 0),
                usage.get("output_tokens", 0),
                usage.get("model", "gpt"),
            )
            self.tracer.trace(
                db,
                conversation_id=conversation.id,
                flow_id=flow.id,
                node_id=node.get("id"),
                event_type="ai_called",
                status="success" if response != "Not Found" else "miss",
                tokens_in=usage.get("input_tokens"),
                tokens_out=usage.get("output_tokens"),
                total_tokens=usage.get("total_tokens"),
                cost=cost,
                metadata={"answer": response},
            )

            if response != "Not Found":
                state.runtime_context["last_ai_response"] = response
                await self._queue_outbound_message(
                    db=db,
                    conversation_id=conversation.id,
                    to_number=self._get_conversation_destination(conversation),
                    body=response,
                    metadata={"source": "brain_query", "node_id": node.get("id")},
                    msg_sequence=msg_sequence,
                    execution_token=execution_token,
                    state=state,
                )
            else:
                # User requested: DO NOT send fallback message when no data is found.
                # Just proceed to the next node silently.
                logger.warning(
                    f"⚠️ brain_query returned NOT_FOUND for node {node.get('id')} — skipping fallback and continuing to next node"
                )
            return False

        # Ask Question (NEW)──
        if action_type == "ask_question":
            return await self._handle_ask_question_node(
                db=db,
                conversation=conversation,
                flow=flow,
                state=state,
                node=node,
                inbound_text=inbound_text,
                msg_sequence=msg_sequence,
                execution_token=execution_token,
            )

        # Assign Agent
        if action_type == "assign_agent":
            strategy = config.get("strategy", "round_robin")
            state.runtime_context["assigned_agent_strategy"] = strategy
            # TODO: wire to your actual agent assignment service here
            # e.g. agent_service.assign(conversation.id, strategy, db)
            logger.info(f"🧑 Assign agent triggered: strategy={strategy}")
            return False

        # Move Deal Stage─────
        if action_type == "move_stage":
            stage = config.get("stage")
            state.runtime_context["deal_stage"] = stage
            # TODO: wire to your CRM/pipeline service here
            # e.g. crm_service.move_stage(conversation.id, stage, db)
            logger.info(f"📊 Move stage triggered: stage={stage}")
            return False

        # Notification (FIXED: was checking 'send_notification')──────
        if action_type in ("notification", "send_notification"):
            text = config.get("text") or config.get("message") or ""
            state.runtime_context["last_notification"] = text
            # TODO: wire to your internal notification service
            # e.g. notify_service.send(conversation.workspace_id, text)
            logger.info(f"🔔 Notification triggered: {text[:80]}")
            return False

        logger.warning(
            f"⚠️ Unknown action type: '{action_type}' on node {node.get('id')}"
        )
        return False

    # ───────────────────────
    # ASK QUESTION NODE HANDLER  ← NEW
    # ───────────────────────

    async def _handle_ask_question_node(
        self,
        db: Session,
        *,
        conversation: Conversation,
        flow: AutomationFlow,
        state: FlowExecutionState,
        node: Dict[str, Any],
        inbound_text: str,
        msg_sequence: List[int],
        execution_token: Optional[str] = None,
    ) -> bool:
        """
        Sends the question text, then PAUSES the flow.
        Execution resumes only when the user sends the next message.
        The answer is stored in runtime_context[variable_name].
        """
        config = node.get("config") or {}
        question_text = self._render_template(
            config.get("question") or config.get("text") or "",
            state.runtime_context or {},
        )
        variable_name = config.get("variable_name") or "user_reply"
        timeout_minutes = int(config.get("timeout_minutes") or 60)

        # Resolve the next node BEFORE pausing (default edge out of this node)
        next_node_id = self._get_default_target(flow.edges or [], node.get("id"))

        if question_text:
            await self._queue_outbound_message(
                db=db,
                conversation_id=conversation.id,
                to_number=self._get_conversation_destination(conversation),
                body=question_text,
                metadata={"source": "ask_question", "node_id": node.get("id")},
                msg_sequence=msg_sequence,
                execution_token=execution_token,
                state=state,
            )
            logger.info(
                f"❓ Ask question sent. Waiting for reply → context['{variable_name}']"
            )

        # Set pending state — execution will resume in _handle_pending_question
        state.pending_question = {
            "node_id": node.get("id"),
            "variable_name": variable_name,
            "next_node_id": next_node_id,
        }
        state.question_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=timeout_minutes
        )

        self.tracer.trace(
            db,
            conversation_id=conversation.id,
            flow_id=flow.id,
            node_id=node.get("id"),
            event_type="question_sent",
            metadata={
                "variable": variable_name,
                "timeout_minutes": timeout_minutes,
                "next_node_id": next_node_id,
            },
        )

        return True  # Stop execution — wait for human reply

    # ───────────────────────
    # MESSAGE HANDLERS
    # ───────────────────────

    async def _handle_send_message_node(
        self,
        db: Session,
        *,
        conversation: Conversation,
        flow: AutomationFlow,
        state: FlowExecutionState,
        node: Dict[str, Any],
        inbound_text: str,
        msg_sequence: List[int],
        execution_token: Optional[str] = None,
    ) -> bool:
        config = node.get("config") or {}
        context = state.runtime_context or {}
        message_type = config.get("message_type", "text")
        mode = config.get("mode", "manual")

        # Media messages──────
        if message_type in {"image", "video", "document"}:
            media_url = (config.get("media_url") or "").strip()
            caption = config.get("text", "")

            # Validate media_url before queueing
            media_error = self._validate_media_url(media_url, message_type)
            if media_error:
                logger.warning(
                    "⚠️ Media validation failed for node %s: %s | url=%s type=%s",
                    node.get("id"),
                    media_error,
                    media_url,
                    message_type,
                )
                self.tracer.trace(
                    db,
                    conversation_id=conversation.id,
                    flow_id=flow.id,
                    node_id=node.get("id"),
                    event_type="media_validation_failed",
                    status="skipped",
                    error_message=media_error,
                    metadata={"media_url": media_url, "message_type": message_type},
                )
                # Send fallback text so the user isn't left hanging
                await self._queue_outbound_message(
                    db=db,
                    conversation_id=conversation.id,
                    to_number=self._get_conversation_destination(conversation),
                    body=caption or "Media could not be delivered.",
                    metadata={
                        "source": "media_fallback",
                        "node_id": node.get("id"),
                        "error": media_error,
                    },
                    msg_sequence=msg_sequence,
                    execution_token=execution_token,
                    state=state,
                )
                return False

            await self._queue_outbound_message(
                db=db,
                conversation_id=conversation.id,
                to_number=self._get_conversation_destination(conversation),
                body=caption or "",
                metadata={
                    "source": "media_message",
                    "node_id": node.get("id"),
                    "media_url": media_url,
                    "message_type": message_type,
                },
                msg_sequence=msg_sequence,
                execution_token=execution_token,
                state=state,
            )
            return False

        # Button message──────
        if message_type in {"button_message", "button"}:
            buttons = self._normalize_buttons(config.get("buttons", []))
            header_text = self._render_template(
                config.get("text") or config.get("message") or "", context
            )
            if header_text:
                await self._queue_outbound_message(
                    db=db,
                    conversation_id=conversation.id,
                    to_number=self._get_conversation_destination(conversation),
                    body=header_text,
                    metadata={
                        "source": "button_message",
                        "node_id": node.get("id"),
                        "buttons": buttons,
                    },
                    msg_sequence=msg_sequence,
                    execution_token=execution_token,
                    state=state,
                )
            state.pending_button = {
                "node_id": node.get("id"),
                "buttons": buttons,
                "mode": mode,
            }
            state.button_expires_at = datetime.now(timezone.utc) + timedelta(
                minutes=int(config.get("button_timeout_minutes", 60))
            )
            return True  # Stop execution — wait for button reply

        # Plain text
        outbound_text = self._render_template(
            config.get("message") or config.get("text") or "", context
        )
        logger.info(f"✉️ Generated Text: '{outbound_text}' | Mode: {mode}")
        if not outbound_text:
            logger.warning("⚠️ Outbound text is EMPTY — message will NOT be queued.")

        if mode in {"ai", "hybrid"}:
            ai_response, usage = await self._generate_guardrailed_ai_response(
                db=db,
                workspace_id=conversation.workspace_id,
                prompt=config.get("prompt") or "",
                inbound_text=inbound_text,
                context=context,
            )
            self.tracer.trace(
                db,
                conversation_id=conversation.id,
                flow_id=flow.id,
                node_id=node.get("id"),
                event_type="ai_called",
                status="success" if ai_response else "miss",
                tokens_in=usage.get("input_tokens"),
                tokens_out=usage.get("output_tokens"),
                total_tokens=usage.get("total_tokens"),
                cost=0,
                metadata={"mode": mode},
            )
            if ai_response != "Not Found" and mode == "ai":
                outbound_text = ai_response
            elif ai_response != "Not Found" and mode == "hybrid" and not outbound_text:
                outbound_text = ai_response
            elif ai_response == "Not Found" and mode == "ai":
                # Ensure we don't send any configured placeholder/fallback message
                # and just proceed silently to the next node
                outbound_text = ""

        if outbound_text:
            logger.info("🚀 Queuing outbound message!")
            await self._queue_outbound_message(
                db=db,
                conversation_id=conversation.id,
                to_number=self._get_conversation_destination(conversation),
                body=outbound_text,
                metadata={"source": mode, "node_id": node.get("id")},
                msg_sequence=msg_sequence,
                execution_token=execution_token,
                state=state,
            )
        return False

    # ───────────────────────
    # OUTBOX: queue & dispatch
    # ───────────────────────

    async def _queue_outbound_message(
        self,
        *,
        db: Session,
        conversation_id: Any,
        to_number: str,
        body: str,
        metadata: Optional[Dict[str, Any]] = None,
        msg_sequence: Optional[List[int]],
        execution_token: Optional[str] = None,
        state: FlowExecutionState,
    ) -> None:
        """Insert message into the outbound_messages outbox.

        Sequence is computed as MAX(sequence)+1 per conversation under a
        SELECT FOR UPDATE lock so concurrent insertions never collide.
        Also saves to Message table so the inbox displays automation messages.
        """
        metadata = metadata or {}
        self._refresh_execution_slot(db, conversation_id, execution_token)

        # Compute monotonic sequence under row-lock────────────────────
        existing = (
            db.query(OutboundMessage)
            .filter(OutboundMessage.conversation_id == conversation_id)
            .with_for_update()
            .order_by(OutboundMessage.sequence.desc())
            .first()
        )
        next_seq = (existing.sequence + 1) if existing else 1

        # OutboundMessage (phone delivery)────────────────────────────
        msg = OutboundMessage(
            conversation_id=conversation_id,
            to_number=to_number,
            body=body,
            metadata_json=metadata,
            status="pending",
            sequence=next_seq,
            flow_id=state.active_flow_id,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        # Keep msg_sequence counter consistent with existing callers──
        if msg_sequence is not None:
            async with _conversation_locks[str(conversation_id)]:
                msg_sequence[0] = next_seq

        logger.info(
            "Outbound message enqueued | conversation=%s seq=%d id=%s",
            conversation_id,
            next_seq,
            msg.id,
        )
        # Kick off delivery if nothing is in-progress──────────────────
        #  ALWAYS trigger dispatcher

    # ───────────────────────
    # AI RESPONSE
    # ───────────────────────

    async def _generate_guardrailed_ai_response(
        self,
        db: Session,
        *,
        workspace_id: Any,
        prompt: str,
        inbound_text: str,
        context: Dict[str, Any],
        collection: Optional[str] = None,
        entry_ids: Optional[List[str]] = None,
    ) -> tuple[str, Dict[str, Any]]:

        NOT_FOUND = "Not Found"

        # ───
        #  RETRY HELPER
        # ───
        async def _retry_async(fn, retries=3, delay=0.5):
            last_exception = None
            for attempt in range(retries):
                try:
                    return await fn()
                except Exception as e:
                    last_exception = e
                    logger.warning(f"[RETRY] attempt={attempt+1} error={e}")
                    await asyncio.sleep(delay * (attempt + 1))
            logger.error("[RETRY FAILED] All attempts failed")
            raise last_exception

        # ───
        #  RAG SEARCH (WITH RETRY)
        # ───
        async def call_rag_async():
            return await self.rag.iterative_retrieval(
                db=db,
                workspace_id=workspace_id,
                query=inbound_text,
                max_iterations=1,
                collection=collection,
            )

        try:
            retrieved = await _retry_async(call_rag_async)
        except Exception:
            logger.exception("[RAG ERROR] Failed after retries")
            return NOT_FOUND, {}

        # ───
        #  CONTEXT BUILD
        # ───
        retrieved_context = ""
        docs = retrieved.get("docs", []) if isinstance(retrieved, dict) else []
        if docs:
            retrieved_context = "\n".join(
                str(r.get("text", "")) for r in docs if r.get("text")
            )

        if not retrieved_context.strip():
            logger.info("[RAG EMPTY] No relevant context found")
            return NOT_FOUND, {}

        # ───
        #  PROMPT BUILD
        # ───
        llm_prompt = f"""You are a constrained WhatsApp automation answer engine.

    Rules:
    - Use only the provided context.
    - If the answer is not explicitly supported, return NOT_FOUND.
    - Do not hallucinate.
    - Keep the answer under 120 words.
    - Return strict JSON only.

    JSON schema:
    {{"status":"FOUND|NOT_FOUND","answer":"string"}}

    Instruction:
    {prompt or "Answer the user using the provided context only."}

    Conversation context:
    {json.dumps(context, ensure_ascii=True)}

    User message:
    {inbound_text}

    Retrieved context:
    {retrieved_context}
    """

        # ───
        # LLM CALL (RETRY + TIMEOUT)
        # ───
        async def call_llm():
            return await asyncio.wait_for(
                safe_llm_call(llm_prompt, model="auto"),
                timeout=15,  # prevents hanging workers
            )

        try:
            result = await _retry_async(call_llm)
        except Exception:
            logger.exception("[LLM ERROR] Failed after retries")
            return NOT_FOUND, {}

        # ───
        #  PARSE RESPONSE
        # ───
        content = (result or {}).get("content", "").strip()
        parsed = self._safe_json(content)

        if not parsed:
            logger.warning("[LLM PARSE ERROR] Invalid JSON response")
            return NOT_FOUND, result or {}

        if parsed.get("status") == "NOT_FOUND":
            logger.info("[LLM RESULT] Not found")
            return NOT_FOUND, result or {}

        answer = str(parsed.get("answer") or "").strip()

        if not answer:
            logger.warning("[LLM EMPTY ANSWER]")
            return NOT_FOUND, result or {}

        return answer, result or {}

    # ───────────────────────
    # HELPERS
    # ───────────────────────

    # Allowed file extensions per media type
    _MEDIA_EXTENSIONS: Dict[str, set] = {
        "image": {".jpg", ".jpeg", ".png"},
        "video": {".mp4"},
        "document": {".pdf"},
    }

    # Expected Content-Type prefixes for HEAD validation
    _MEDIA_CONTENT_TYPES: Dict[str, str] = {
        "image": "image/",
        "video": "video/",
        "document": "application/pdf",
    }

    def _validate_media_url(self, media_url: str, message_type: str) -> Optional[str]:
        """Validate a media URL against the declared message_type.

        Returns an error string if invalid, or None if valid.
        """
        if not media_url:
            return "media_url is empty"

        # Basic URL structure check
        parsed = urlparse(media_url)
        if parsed.scheme not in ("http", "https"):
            return f"media_url has invalid scheme: {parsed.scheme!r}"
        if not parsed.netloc:
            return "media_url is missing a hostname"

        # File extension check
        allowed = self._MEDIA_EXTENSIONS.get(message_type)
        if allowed:
            # Strip query params / fragments from the path before checking ext
            path_lower = parsed.path.lower()
            if not any(path_lower.endswith(ext) for ext in allowed):
                return (
                    f"media_url extension does not match type '{message_type}'. "
                    f"Expected one of: {', '.join(sorted(allowed))}"
                )

        return None  # valid

    @staticmethod
    def _head_check_media_url(
        media_url: str, message_type: str, timeout: float = 5.0
    ) -> Optional[str]:
        """Optional HTTP HEAD check to verify Content-Type.

        Returns an error string if the Content-Type doesn't match, or None.
        Failures are non-fatal — returns None on network errors so delivery
        can still be attempted.
        """
        import httpx

        expected_prefix = FlowServiceV2._MEDIA_CONTENT_TYPES.get(message_type)
        if not expected_prefix:
            return None

        try:
            resp = httpx.head(media_url, timeout=timeout, follow_redirects=True)
            content_type = (resp.headers.get("content-type") or "").lower()
            if not content_type.startswith(expected_prefix):
                return (
                    f"Content-Type mismatch: expected '{expected_prefix}*', "
                    f"got '{content_type}'"
                )
        except Exception as exc:
            logger.warning("HEAD check failed for %s (non-fatal): %s", media_url, exc)

        return None  # pass or inconclusive

    def _safe_json(self, value: str) -> Optional[Dict[str, Any]]:
        try:
            start = value.find("{")
            end = value.rfind("}")
            if start == -1 or end == -1:
                return None
            return json.loads(value[start : end + 1])
        except json.JSONDecodeError:
            return None

    def _normalize_buttons(self, buttons: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
        """Normalize button configs for outbound message metadata.

        ``value`` doubles as the edge ``sourceHandle`` key used by the
        button-routing logic.  ``target`` from config is kept only as a
        fallback — the edge graph is the primary routing source.
        """
        return [
            {
                "label": b.get("label") or "",
                "value": b.get("value") or b.get("label") or "",
                "target": b.get("target"),  # fallback only; prefer edge lookup
            }
            for b in buttons[:3]
        ]

    def _get_conversation_destination(self, conversation: Conversation) -> str:
        return conversation.phone or conversation.external_id or ""

    def _render_template(self, text: str, context: dict) -> str:
        if not text:
            return ""

        enriched = {
            k: str(v)[:500] for k, v in context.items() if not k.startswith("_")
        }

        if "last_ai_response" in enriched and "last_brain_answer" not in enriched:
            enriched["last_brain_answer"] = enriched["last_ai_response"]
        if "last_brain_answer" in enriched and "last_ai_response" not in enriched:
            enriched["last_ai_response"] = enriched["last_brain_answer"]

        if "last_user_message" in enriched and "customer_intent" not in enriched:
            enriched["customer_intent"] = enriched["last_user_message"]

        try:
            return self.template_env.from_string(text).render(**enriched)
        except Exception as e:
            logger.warning(f"Template render error: {e}")
            return text

    def _get_default_target(
        self, edges: list[Dict[str, Any]], source_id: Optional[str]
    ) -> Optional[str]:
        if not source_id:
            return None
        edge = next(
            (
                e
                for e in edges
                if e.get("source") == source_id and not e.get("sourceHandle")
            ),
            None,
        )
        return edge.get("target") if edge else None
