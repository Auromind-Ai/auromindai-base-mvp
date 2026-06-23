import asyncio
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
from app.services.automations.execution_tracer import ExecutionTracer
from app.services.ai.llm_utils import safe_llm_call
from app.services.automations.trigger_engine import match_button_target, match_trigger
from app.services.automations.flow_ai_reply_handler import execute_ai_reply
from app.core.celery_app import celery_app
from app.models.message import Message, SenderType
from app.models.message_execution import MessageExecution


def _trigger_send_next(conversation_id: Any, countdown: int = 1):
    from app.workers.flow_execution import send_next_pending_message
    send_next_pending_message.apply_async(
        args=[str(conversation_id)], countdown=countdown
    )

class SilentUndefined(Undefined):
    def _fail_with_undefined_error(self, *args, **kwargs):
        return ""


logger = logging.getLogger(__name__)

# Module-level singletons (avoid re-instantiation per request)
_rag_singleton = get_rag_service()


class _LRULockCache:
    
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

# Configurable fallback message
FLOW_FALLBACK_MESSAGE = settings.FLOW_FALLBACK_MESSAGE or "Sorry, something went wrong. Please try again."
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


    async def execute_incoming_message(
        self,
        db: Session,
        *,
        conversation_id: Any,
        inbound_text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        logger.info(f" FLOW STARTED! Message: '{inbound_text}'")
        metadata = metadata or {}

        conversation = (
            db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )
        if not conversation:
            logger.warning(
                "Conversation %s not found for flow execution", conversation_id
            )
            return False

        # Idempotency Check
        incoming_message_id = metadata.get("message_id")
        if not incoming_message_id:
            latest_msg = (
                db.query(Message)
                .filter(Message.conversation_id == conversation.id, Message.sender_type == SenderType.USER)
                .order_by(Message.timestamp.desc())
                .first()
            )
            if latest_msg:
                incoming_message_id = str(latest_msg.id)

        execution_record = None
        if incoming_message_id:
            existing = db.query(MessageExecution).filter(
                MessageExecution.message_id == incoming_message_id
            ).first()
            if existing:
                if existing.status == "completed":
                    logger.info(f"Message already processed: {incoming_message_id}")
                    return True
                else:
                    existing.status = "processing"
                    db.add(existing)
                    db.commit()
                    execution_record = existing
            else:
                execution_record = MessageExecution(
                    message_id=incoming_message_id,
                    conversation_id=conversation.id,
                    status="processing",
                )
                db.add(execution_record)
                db.commit()

        try:
            result = await self._execute_incoming_message_internal(
                db=db,
                conversation=conversation,
                inbound_text=inbound_text,
                metadata=metadata,
            )
            if execution_record:
                execution_record.status = "completed"
                db.add(execution_record)
                db.commit()
            return result
        except Exception as exc:
            db.rollback()
            if execution_record:
                execution_record.status = "failed"
                db.add(execution_record)
                db.commit()
            raise exc

    async def _execute_incoming_message_internal(
        self,
        db: Session,
        *,
        conversation: Conversation,
        inbound_text: str,
        metadata: Dict[str, Any],
    ) -> bool:
        from app.models.ai_action import ConversationState
        conv_state = db.query(ConversationState).filter_by(
            conversation_id=conversation.id,
            workspace_id=conversation.workspace_id
        ).first()
        
        if conv_state and conv_state.human_takeover:
            logger.info(
                "[AI_AUTOMATION_PAUSED] Flow execution ignored because human_takeover is active for conversation %s",
                conversation.id
            )
            return False
        
        execution_token = str(uuid.uuid4())

        # Claim the execution slot first to lock the conversation state during execution
        state = self._claim_execution_slot(db, conversation.id, execution_token)
        state.runtime_context = state.runtime_context or {}
        state.runtime_context["last_user_message"] = inbound_text
        incoming_message_id = metadata.get("message_id")
        if incoming_message_id:
            state.runtime_context["message_id"] = incoming_message_id

        try:
            # Check if the user is mid-conversation
            is_mid_conversation = (
                state.active_flow_id is not None
                and (
                    state.current_node_id is not None
                    or state.pending_button is not None
                    or state.pending_question is not None
                )
            )

            # Check for explicit reset command
            if is_mid_conversation and self._is_reset_command(inbound_text):
                logger.info(f"🔄 Reset command detected. Clearing state for conversation {conversation.id}")
                state.active_flow_id = None
                state.current_node_id = None
                state.pending_button = None
                state.button_expires_at = None
                state.pending_question = None
                state.question_expires_at = None
                state.runtime_context = {}
                self._persist_state(db, state)
                is_mid_conversation = False

            #  Priority 1: pending button reply 
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
                    _trigger_send_next(conversation.id, countdown=1)
                    return True
                else:
                    if state.active_flow_id:
                        flow = (
                            db.query(AutomationFlow)
                            .filter(
                                AutomationFlow.id == state.active_flow_id,
                                AutomationFlow.workspace_id == conversation.workspace_id,
                            )
                            .first()
                        )
                        if flow:
                            button_node_id = state.pending_button.get("node_id")
                            edges = flow.edges or []
                            # Try fallback / error target first
                            fallback_target = next(
                                (
                                    e.get("target")
                                    for e in edges
                                    if e.get("source") == button_node_id
                                    and e.get("sourceHandle") in ("fallback", "error")
                                ),
                                None,
                            )
                            # Or default target (no sourceHandle)
                            if not fallback_target:
                                fallback_target = next(
                                    (
                                        e.get("target")
                                        for e in edges
                                        if e.get("source") == button_node_id
                                        and not e.get("sourceHandle")
                                    ),
                                    None,
                                )

                            if fallback_target:
                                logger.info(
                                    f"🔀 Button mismatch on node '{button_node_id}'. "
                                    f"Routing to fallback/default target node: '{fallback_target}'"
                                )
                                state.pending_button = None
                                state.button_expires_at = None
                                await self._execute_from_node(
                                    db=db,
                                    conversation=conversation,
                                    flow=flow,
                                    state=state,
                                    node_id=fallback_target,
                                    inbound_text=inbound_text,
                                    execution_token=execution_token,
                                )
                                self._persist_state(db, state)
                                _trigger_send_next(conversation.id, countdown=1)
                                return True

                        # If no fallback target, clear pending state and send default fallback message
                        logger.info(
                            f"Button mismatch on node with no fallback target. "
                            f"Clearing state and sending default fallback message."
                        )
                        state.pending_button = None
                        state.button_expires_at = None
                        await self._queue_outbound_message(
                            db=db,
                            conversation_id=conversation.id,
                            to_number=self._get_conversation_destination(conversation),
                            body=FLOW_FALLBACK_MESSAGE,
                            metadata={
                                "source": "button_mismatch_fallback",
                            },
                            msg_sequence=[0],
                            execution_token=execution_token,
                            state=state,
                        )
                        self._persist_state(db, state)
                        _trigger_send_next(conversation.id, countdown=1)
                        return True

            # pending question reply 
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
                    _trigger_send_next(conversation.id, countdown=1)
                    return True

            # Active AI session — BUT check new trigger FIRST
            active_ai = (
                state.runtime_context.get("active_ai_session")
                if state and state.runtime_context
                else False
            )

            if active_ai and state.current_node_id:
                # Check if AI session expired/completed
                ai_closed = state.runtime_context.get("ai_session_closed", False)

                if ai_closed:
                    logger.info(" AI session closed")
                    # Fully terminate AI state
                    state.runtime_context["active_ai_session"] = False
                    state.runtime_context["ai_session_closed"] = True
                    state.runtime_context["assigned_agent"] = None

                    # Prevent AI re-entry
                    state.current_node_id = None
                    state.pending_question = None
                    state.pending_button = None

                    flag_modified(state, "runtime_context")
                    db.flush()
                    return False
                else:
                    # Continue AI conversation normally
                    flow = db.query(AutomationFlow).filter(
                        AutomationFlow.id == state.active_flow_id
                    ).first()

                    if flow:
                        await self._execute_from_node(
                            db=db,
                            conversation=conversation,
                            flow=flow,
                            state=state,
                            node_id=state.current_node_id,
                            inbound_text=inbound_text,
                            execution_token=execution_token,
                        )
                        self._persist_state(db, state)
                        _trigger_send_next(conversation.id, countdown=1)
                        return True

            # If mid-conversation, do NOT match triggers
            if is_mid_conversation:
                logger.info(f"Mid-conversation message '{inbound_text}' ignored by trigger match (preventing onboarding restart).")
                return False

            # Only if NO pending/active flow state → trigger match (or locked workflow bypass)
            match = None
            if conversation.agent_locked and conversation.active_workflow_id:
                flow = db.query(AutomationFlow).filter(
                    AutomationFlow.id == conversation.active_workflow_id
                ).first()
                if flow:
                    trigger_node = next(
                        (n for n in (flow.nodes or []) if n.get("type") == "trigger"), None
                    )
                    if trigger_node:
                        logger.info(f"Agent is locked. Bypassing trigger match, forcing active workflow {flow.id}")
                        from app.services.automations.trigger_engine import TriggerMatchResult
                        trigger_match = TriggerMatchResult(matched=True, match_type="forced_lock", confidence=1.0)
                        match = (flow, trigger_node, trigger_match)

            if not match:
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
            state.runtime_context["active_ai_session"] = False
            state.runtime_context["assigned_agent"] = "lead_agent"
            state.current_node_id = trigger_node.get("id")
            state.runtime_context["node_visit_counts"] = {}
            state.runtime_context["executed_nodes"] = []

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
                logger.warning(" Trigger node has no outgoing connection. Stopping.")
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
            _trigger_send_next(conversation.id, countdown=1)
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

    # RESUME EXECUTION
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
            logger.info(f" Resuming flow {flow.id} from node {node_id} after delay!")
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
            _trigger_send_next(conversation_id, countdown=1)
        finally:
            self._release_execution_slot(db, conversation.id, execution_token)


    # STATE

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


    # TRIGGER MATCHING
    def _find_trigger_match(self, db, workspace_id, inbound_text: str):
        logger.info(f" Searching flows for Workspace ID: {workspace_id}")
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
 
        # Keyword / fuzzy match (fast path)
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
 
        # Semantic fallback via PgVector — guarded 
        logger.info(" No keyword match. Trying semantic trigger fallback…")
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
                from app.services.automations.trigger_engine import TriggerMatchResult

                semantic_match = TriggerMatchResult(
                    matched=True,
                    confidence=semantic_results[0]["score"],
                    match_type="semantic",
                    matched_keyword=matched_item["phrase"],
                )
                logger.info(
                    f" Semantic match: '{inbound_text}' → '{matched_item['phrase']}' "
                    f"(score={semantic_results[0]['score']:.2f})"
                )
                return (matched_item["flow"], matched_item["node"], semantic_match)

        except Exception as sem_exc:
       
            logger.warning(f"⚠️ Semantic trigger fallback failed: {sem_exc}")

        return None


    # BUTTON HANDLING

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
                logger.info(" Button expired | conversation=%s", conversation.id)
                state.pending_button = None
                state.button_expires_at = None
                return await self._handle_expired_pending(
                    db, conversation, state,
                    node_id=pending.get("node_id"),
                    source_label="button",
                    execution_token=execution_token,
                )

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
      
        if not target_node_id:
            target_node_id = matched_button.get("target")
            if target_node_id:
                logger.warning(
                    " Button edge not found for handle '%s' on node '%s'. "
                    "Falling back to config.target=%s",
                    button_value,
                    button_node_id,
                    target_node_id,
                )

        if not target_node_id:
            logger.warning(
                " No target found for button '%s' on node '%s'. Stopping flow.",
                button_value, button_node_id,
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

    # ASK QUESTION HANDLING  ← NEW
    async def _handle_pending_question(
        self,
        db: Session,
        *,
        conversation: Conversation,
        state: FlowExecutionState,
        inbound_text: str,
        execution_token: Optional[str] = None,
    ) -> bool:
        
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
                logger.info(" Question expired for conversation %s. Sending fallback.", conversation.id)
                state.pending_question = None
                state.question_expires_at = None
                
                return await self._handle_expired_pending(
                    db, conversation, state,
                    node_id=pending.get("node_id"),
                    source_label="question",
                    execution_token=execution_token,
                )

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


    # CORE EXECUTION LOOP
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
                state.current_node_id = None
                if state.runtime_context is None:
                    state.runtime_context = {}
                state.runtime_context["active_ai_session"] = False
                return

            state.runtime_context = state.runtime_context or {}
            state.current_node_id = current_node_id
            node = nodes.get(current_node_id)
            if not node:
                state.current_node_id = None
                if state.runtime_context is None:
                    state.runtime_context = {}
                state.runtime_context["active_ai_session"] = False
                return

            #  Per-node loop_limit enforcement
            is_brain_query = (
                node.get("type") == "action"
                and (node.get("config") or {}).get("type") == "brain_query"
            )

            if not is_brain_query:
                visit_counts = state.runtime_context.setdefault("node_visit_counts", {})
                visit_counts[current_node_id] = visit_counts.get(current_node_id, 0) + 1
                loop_limit = (node.get("config") or {}).get("loop_limit", 3)
                if visit_counts[current_node_id] > loop_limit:
                    logger.warning(
                        "⛔ Node '%s' exceeded loop_limit (%d/%d) — stopping execution",
                        current_node_id, visit_counts[current_node_id], loop_limit,
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
                    if state.runtime_context is None:
                        state.runtime_context = {}
                    state.runtime_context["active_ai_session"] = False
                    return

            # Delay handling
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
                        f" Node '{current_node_id}' long delay {node_delay_seconds}s → DB scheduled_resumes"
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
                old_node_id = current_node_id
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
                    try:
                        from app.services.notification_service import NotificationService
                        NotificationService.notify_workspace(
                            db=db,
                            workspace_id=conversation.workspace_id,
                            type="workflow_failed",
                            title="Workflow Failed",
                            message=f"Workflow '{flow.name}' failed on node '{node.get('label') or current_node_id}': {str(node_exc)}"
                        )
                    except Exception as notif_exc:
                        logger.error(f"Failed to send workflow failure notification: {notif_exc}")

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
                        logger.info(f" Routing to error node: {error_target}")
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
                        state.current_node_id = None
                        if state.runtime_context is None:
                            state.runtime_context = {}
                        state.runtime_context["active_ai_session"] = False
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

                if state.current_node_id != old_node_id:
                    current_node_id = state.current_node_id
                    skip_delay = False
                    continue

            skip_delay = False
            current_node_id = self._get_default_target(
                flow.edges or [], current_node_id
            )

        state.current_node_id = None
        if state.runtime_context is None:
            state.runtime_context = {}
        state.runtime_context["active_ai_session"] = False

        try:
            from app.services.notification_service import NotificationService
            NotificationService.notify_workspace(
                db=db,
                workspace_id=conversation.workspace_id,
                type="workflow_completed",
                title="Workflow Completed",
                message=f"Workflow '{flow.name}' completed successfully."
            )
        except Exception as notif_exc:
            logger.error(f"Failed to send workflow completion notification: {notif_exc}")


    # ACTION DISPATCH

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

        #  AI Brain Query 
        if action_type == "brain_query":

            allowed_agents = [
                "lead_agent",
                "sales_agent",
                "support_agent",
            ]

            agent_type = config.get("agent_type")

            if agent_type not in allowed_agents:
                logger.warning(
                    f"Invalid agent_type '{agent_type}' fallback lead_agent"
                )
                agent_type = "lead_agent"

            logger.info(f"Flow forcing agent: {agent_type}")

            flow_context = {
                "agent_type": agent_type,
                "flow_id": str(flow.id),

                # Business Config
                "business_type": config.get(
                    "business_type",
                    "saas"
                ),

                "lead_fields": config.get(
                    "lead_fields",
                    []
                ),

                # Integrations
                "calendar_enabled": config.get(
                    "calendar_enabled",
                    config.get('enable_demo_booking', False)
                ),

                "payment_enabled": config.get(
                    "payment_enabled",
                    False
                ),

                "payment_link": config.get(
                    "payment_link",
                    ""
                ),

                # RAG
                "collection": config.get("collection"),
                "entry_ids": config.get("entry_ids"),

                # Runtime Context
                "flow_context": state.runtime_context or {}
            }

            # Commit current transaction to release all DB locks (e.g. cancelled messages) before slow LLM API call
            db.commit()

            result = await execute_ai_reply(
                db=db,
                workspace_id=str(conversation.workspace_id),
                contact_phone=conversation.phone,
                user_message=inbound_text,
                channel="twilio",
                conversation_id=str(conversation.id),
                flow_context=flow_context
            )

            # Reload/refresh state from DB to pick up any changes made by the AI reply handler (like escalation/block states)
            db.refresh(state)

            response = result.get("response_text", "")

            if response:
                state.runtime_context["last_ai_response"] = response

                await self._queue_outbound_message(
                    db=db,
                    conversation_id=conversation.id,
                    to_number=self._get_conversation_destination(conversation),
                    body=response,
                    metadata={
                        "source": "brain_query",
                        "node_id": node.get("id"),
                        "message_type": "ai"
                    },
                    msg_sequence=msg_sequence,
                    execution_token=execution_token,
                    state=state,
                )

            # Check if escalated or closed
            escalated = result.get("escalated", False)
            closed = result.get("closed", False)
            ai_status = result.get("status")

            if ai_status == "error":
                logger.error("🤖 AI Session generation failed. Unlocking conversation.")
                state.runtime_context["active_ai_session"] = False
                return False

            if escalated or closed:
                logger.info(f" AI Session ended. Escalated: {escalated}, Closed: {closed}")
                state.runtime_context["active_ai_session"] = False

                # Check for explicit outcomes
                target_node_id = None
                if escalated:
                    target_node_id = next(
                        (e.get("target") for e in (flow.edges or [])
                         if e.get("source") == node.get("id") and e.get("sourceHandle") == "escalate"),
                        None
                    )
                elif closed:
                    target_node_id = next(
                        (e.get("target") for e in (flow.edges or [])
                         if e.get("source") == node.get("id") and e.get("sourceHandle") == "close"),
                        None
                    )

                # Fallback to default target if no handle match
                if not target_node_id:
                    target_node_id = self._get_default_target(flow.edges or [], node.get("id"))

                state.current_node_id = target_node_id
                return False
            else:
                logger.info(" AI Session is active. Locking conversation on brain_query node.")
                state.runtime_context["active_ai_session"] = True
                state.runtime_context["assigned_agent"] = agent_type
                state.current_node_id = node.get("id")
                return True

            
        #  Ask Question (NEW) 
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

        #  Assign Agent 
        if action_type == "assign_agent":
            strategy = config.get("strategy", "round_robin")
            state.runtime_context["assigned_agent_strategy"] = strategy
            logger.info(f" Assign agent triggered: strategy={strategy}")
            return False

        #  Move Deal Stage
        if action_type == "move_stage":
            stage = config.get("stage")
            state.runtime_context["deal_stage"] = stage
            logger.info(f" Move stage triggered: stage={stage}")
            return False

        # Notification (FIXED: was checking 'send_notification')
        if action_type in ("notification", "send_notification"):
            text = config.get("text") or config.get("message") or ""
            state.runtime_context["last_notification"] = text
            # TODO: wire to your internal notification service
            # e.g. notify_service.send(conversation.workspace_id, text)
            logger.info(f" Notification triggered: {text[:80]}")
            return False

        logger.warning(f" Unknown action type: '{action_type}' on node {node.get('id')}")
        return False

    # ASK QUESTION NODE HANDLER  ← NEW
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

    # MESSAGE HANDLERS
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

        #  Media messages 
        if message_type in {"image", "video", "document"}:
            media_url = (config.get("media_url") or "").strip()
            caption = config.get("text", "")

            # Validate media_url before queueing
            media_error = self._validate_media_url(media_url, message_type)
            if media_error:
                logger.warning(
                    " Media validation failed for node %s: %s | url=%s type=%s",
                    node.get("id"), media_error, media_url, message_type,
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

        #  Button message 
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

        #  Plain text 
        outbound_text = self._render_template(
            config.get("message") or config.get("text") or "", context
        )
        logger.info(f" Generated Text: '{outbound_text}' | Mode: {mode}")
        if not outbound_text:
            logger.warning(" Outbound text is EMPTY — message will NOT be queued.")


        if outbound_text:
            logger.info(" Queuing outbound message!")
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


    # OUTBOX: queue & dispatch
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
        
        metadata = metadata or {}
        self._refresh_execution_slot(db, conversation_id, execution_token)
    
        #  Compute monotonic sequence under row-lock 
        existing = (
            db.query(OutboundMessage)
            .filter(OutboundMessage.conversation_id == conversation_id)
            .with_for_update()
            .order_by(OutboundMessage.sequence.desc())
            .first()
        )
        next_seq = (existing.sequence + 1) if existing else 1

        #  OutboundMessage (phone delivery) 
        msg_type = metadata.get("message_type", "automation")


        msg = OutboundMessage(
            conversation_id=conversation_id,
            to_number=to_number,
            body=body,
            metadata_json=metadata,
            status="queued",
            sequence=next_seq,
            flow_id=state.active_flow_id,
            message_type=msg_type,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        # Keep msg_sequence counter consistent with existing callers
        if msg_sequence is not None:
            async with _conversation_locks[str(conversation_id)]:
                msg_sequence[0] = next_seq

        logger.info(
            "Outbound message enqueued | conversation=%s seq=%d id=%s",
            conversation_id,
            next_seq,
            msg.id,
        )
        

    def _validate_media_url(
        self, media_url: str, message_type: str
    ) -> Optional[str]:
        
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

    

    def _normalize_buttons(self, buttons: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
        
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
    
    
    async def _handle_expired_pending(
        self,
        db,
        conversation,
        state,
        node_id,
        source_label,
        execution_token,
    ):
        await self._queue_outbound_message(
            db=db,
            conversation_id=conversation.id,
            to_number=self._get_conversation_destination(conversation),
            body="Your session has expired. Please start again.",
            metadata={"source": f"{source_label}_expired", "node_id": node_id},
            msg_sequence=[0],
            execution_token=execution_token,
            state=state,
        )
        self._persist_state(db, state)
       
        _trigger_send_next(conversation.id, countdown=1)
        return True
    
    def _is_reset_command(self, text: str) -> bool:

            if not text or not isinstance(text, str):

                return False

            normalized = text.strip().lower()

            return normalized in {"/reset", "reset", "clear", "restart", "start ov"}
