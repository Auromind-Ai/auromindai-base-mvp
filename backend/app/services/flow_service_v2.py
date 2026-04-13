import asyncio
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from jinja2 import Environment, Undefined
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.automation import AutomationFlow
from app.models.conversation import Conversation
from app.models.flow_execution import FlowExecutionState
from app.services.agentic_rag.rag_service import get_rag_service
from app.services.execution_tracer import ExecutionTracer
from app.services.llm_router import LLMRouter
from app.services.trigger_engine import match_button_target, match_trigger


class SilentUndefined(Undefined):
    def _fail_with_undefined_error(self, *args, **kwargs):
        return ""


logger = logging.getLogger(__name__)


class FlowServiceV2:
    def __init__(self):
        self.rag = get_rag_service()
        self.llm_router = LLMRouter()
        self.tracer = ExecutionTracer()
        self.max_iterations = 50
        self.template_env = Environment(undefined=SilentUndefined)
        self.template_env.globals.update({"safe": lambda x: x})

    def _calculate_cost(self, tokens_in: int, tokens_out: int, model: str) -> float:
        pricing = {
            "claude": {"input": 0.003 / 1000, "output": 0.015 / 1000},
            "gpt":    {"input": 0.0005 / 1000, "output": 0.0015 / 1000},
            "groq":   {"input": 0.000025 / 1000, "output": 0.00010 / 1000},
        }
        provider_prices = pricing.get(model, pricing["groq"])
        return (tokens_in * provider_prices["input"]) + (tokens_out * provider_prices["output"])

    # ─────────────────────────────────────────────────────────────────────────
    # PUBLIC ENTRY POINT
    # ─────────────────────────────────────────────────────────────────────────

    async def execute_incoming_message(
        self,
        db: Session,
        *,
        conversation_id: Any,
        inbound_text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        logger.info(f"🚨🚨🚨 FLOW STARTED! Message: '{inbound_text}' 🚨🚨🚨")
        metadata = metadata or {}

        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            logger.warning("Conversation %s not found for flow execution", conversation_id)
            return False

        state = self._get_or_create_state(db, conversation.id)
        state.runtime_context = state.runtime_context or {}
        state.runtime_context["last_user_message"] = inbound_text

        try:
            if state.pending_button:
                handled = await self._handle_pending_button(
                    db=db,
                    conversation=conversation,
                    state=state,
                    inbound_text=inbound_text,
                    metadata=metadata,
                )
                if handled:
                    self._persist_state(db, state)
                    return True

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
            next_node_id = self._get_default_target(flow.edges or [], trigger_node.get("id"))
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
            )
            self._persist_state(db, state)
            return True

        except Exception as exc:
            db.rollback()
            self.tracer.trace(
                db,
                conversation_id=conversation.id,
                flow_id=state.active_flow_id,
                node_id=state.current_node_id,
                event_type="error",
                status="failed",
                error_message=str(exc),
                metadata={"message": inbound_text},
            )
            db.commit()
            logger.exception("Flow execution failed for conversation %s", conversation.id)
            return False

    # ─────────────────────────────────────────────────────────────────────────
    # RESUME EXECUTION (Triggered by Celery)
    # ─────────────────────────────────────────────────────────────────────────

    async def resume_node_execution(
        self, db: Session, conversation_id: str, node_id: str, inbound_text: str, msg_sequence_val: int
    ) -> None:
        """Celery timer mudinja udane intha function thaan call aagum"""
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            return

        state = self._get_or_create_state(db, conversation.id)
        flow = db.query(AutomationFlow).filter(AutomationFlow.id == state.active_flow_id).first()
        if not flow:
            return

        logger.info(f"⏳ Resuming flow {flow.id} from node {node_id} after delay!")
        msg_sequence = [msg_sequence_val] # Restore sequence counter
        
        # skip_delay=True pass pandrom, illana thirumbavum delay aagidum!
        await self._execute_from_node(
            db=db,
            conversation=conversation,
            flow=flow,
            state=state,
            node_id=node_id,
            inbound_text=inbound_text,
            msg_sequence=msg_sequence,
            skip_delay=True 
        )
        self._persist_state(db, state)

    # ─────────────────────────────────────────────────────────────────────────
    # STATE
    # ─────────────────────────────────────────────────────────────────────────

    def _get_or_create_state(self, db: Session, conversation_id: Any) -> FlowExecutionState:
        # ⚠️ WARNING: Removed .with_for_update() to prevent DB lock freezing!
        state = (
            db.query(FlowExecutionState)
            .filter(FlowExecutionState.conversation_id == conversation_id)
            .first()
        )
        if state:
            return state

        try:
            state = FlowExecutionState(conversation_id=conversation_id, context={}, version=1)
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
                return state
            raise Exception("Failed to create or fetch FlowExecutionState")

    def _persist_state(self, db: Session, state: FlowExecutionState) -> None:
        state.version = (state.version or 0) + 1
        db.add(state)
        db.commit()

    # ─────────────────────────────────────────────────────────────────────────
    # TRIGGER MATCHING
    # ─────────────────────────────────────────────────────────────────────────

    def _find_trigger_match(self, db: Session, workspace_id: Any, inbound_text: str):
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
        logger.info(f"📦 Found {len(flows)} active flows for this workspace!")

        best_match = None
        for flow in flows:
            trigger_node = next(
                (n for n in (flow.nodes or []) if n.get("type") == "trigger"), None
            )
            if not trigger_node:
                continue
            match = match_trigger(trigger_node, event="msg_recv", message=inbound_text)
            if not match.matched:
                continue
            if not best_match or match.confidence > best_match[2].confidence:
                best_match = (flow, trigger_node, match)

        return best_match

    # ─────────────────────────────────────────────────────────────────────────
    # BUTTON HANDLING
    # ─────────────────────────────────────────────────────────────────────────

    async def _handle_pending_button(
        self,
        db: Session,
        *,
        conversation: Conversation,
        state: FlowExecutionState,
        inbound_text: str,
        metadata: Dict[str, Any],
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
                state.pending_button = None
                state.button_expires_at = None
                return False

        flow = db.query(AutomationFlow).filter(
            AutomationFlow.id == state.active_flow_id,
            AutomationFlow.workspace_id == conversation.workspace_id,
        ).first()
        if not flow:
            logger.warning(f"Flow {state.active_flow_id} not in workspace {conversation.workspace_id}")
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
        await self._execute_from_node(
            db=db,
            conversation=conversation,
            flow=flow,
            state=state,
            node_id=matched_button.get("target"),
            inbound_text=inbound_text,
        )
        return True

    # ─────────────────────────────────────────────────────────────────────────
    # CORE EXECUTION LOOP
    # ─────────────────────────────────────────────────────────────────────────

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
    ) -> None:
        
        if msg_sequence is None:
            msg_sequence = [0]
            
        nodes = {node.get("id"): node for node in (flow.nodes or [])}
        visited_nodes: set[str] = set()
        current_node_id = node_id
        iterations = 0

        cumulative_delay = 0

        while current_node_id:
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

            if current_node_id in visited_nodes:
                self.tracer.trace(
                    db,
                    conversation_id=conversation.id,
                    flow_id=flow.id,
                    node_id=current_node_id,
                    event_type="error",
                    status="failed",
                    error_message="Loop detected in flow graph",
                )
                return

            visited_nodes.add(current_node_id)
            state.current_node_id = current_node_id
            node = nodes.get(current_node_id)
            if not node:
                return

            # Read delay from node config
            config = node.get("config") or {}
            delay_amount = int(config.get("delay_amount") or 0)
            delay_unit = config.get("delay_unit", "minutes")
            
            # Puthiya Seconds logic!
            if delay_unit == "hours":
                node_delay_seconds = delay_amount * 3600
            elif delay_unit == "minutes":
                node_delay_seconds = delay_amount * 60
            else:  # delay_unit == "seconds"
                node_delay_seconds = delay_amount
                
            cumulative_delay += node_delay_seconds

            # 🔥 THE MAGIC FIX HAPPENS HERE 🔥
            if node_delay_seconds > 0 and not skip_delay:
                logger.info(f"⏳ Node '{current_node_id}' delaying for {node_delay_seconds}s. Offloading to Celery!")
                
                # State-a save panrom
                self._persist_state(db, state)
                from app.workers.flow_execution import resume_flow_node
                
                resume_flow_node.apply_async(
                    kwargs={
                        "conversation_id": str(conversation.id),
                        "node_id": current_node_id,
                        "inbound_text": inbound_text,
                        "msg_sequence_val": msg_sequence[0]
                    },
                    countdown=node_delay_seconds # Celery will handle the delay seamlessly
                )
                return # Intha function-a idaiyila cut panrom, worker free aaidum!

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
                stop_execution = await self._handle_action_node(
                    db=db,
                    conversation=conversation,
                    flow=flow,
                    state=state,
                    node=node,
                    inbound_text=inbound_text,
                    msg_sequence=msg_sequence,
                )
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
                if stop_execution:
                    return
            
            skip_delay = False # Reset for the next node
            current_node_id = self._get_default_target(flow.edges or [], current_node_id)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION DISPATCH
    # ─────────────────────────────────────────────────────────────────────────

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
    ) -> bool:
        config = node.get("config") or {}
        action_type = config.get("type")

        if action_type == "send_msg":
            return await self._handle_send_message_node(
                db=db,
                conversation=conversation,
                flow=flow,
                state=state,
                node=node,
                inbound_text=inbound_text,
                msg_sequence=msg_sequence,
            )

        if action_type == "brain_query":
            response, usage = await self._generate_guardrailed_ai_response(
                db=db,
                workspace_id=conversation.workspace_id,
                prompt=config.get("prompt") or "",
                inbound_text=inbound_text,
                context=state.runtime_context or {},
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
                status="success" if response else "miss",
                tokens_in=usage.get("input_tokens"),
                tokens_out=usage.get("output_tokens"),
                total_tokens=usage.get("total_tokens"),
                cost=cost,
                metadata={"answer": response},
            )
            if response:
                state.runtime_context["last_ai_response"] = response
                self._queue_outbound_message(
                    conversation_id=conversation.id,
                    to_number=conversation.phone,
                    body=response,
                    metadata={"source": "brain_query", "node_id": node.get("id")},
                    msg_sequence=msg_sequence,
                )
            return False

        if action_type == "assign_agent":
            state.runtime_context["assigned_agent_strategy"] = config.get("strategy", "round_robin")
            return False

        if action_type == "move_stage":
            state.runtime_context["deal_stage"] = config.get("stage")
            return False

        if action_type == "send_notification":
            state.runtime_context["last_notification"] = config.get("message") or config.get("text")
            return False

        return False

    # ─────────────────────────────────────────────────────────────────────────
    # MESSAGE HANDLERS
    # ─────────────────────────────────────────────────────────────────────────

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
    ) -> bool:
        config = node.get("config") or {}
        context = state.runtime_context or {}
        message_type = config.get("message_type", "text")
        mode = config.get("mode", "manual")

        if message_type in {"image", "video", "document"}:
            media_url = config.get("media_url", "")
            caption = config.get("text", "")
            if media_url:
                self._queue_outbound_message(
                    conversation_id=conversation.id,
                    to_number=conversation.phone,
                    body=caption or media_url,
                    metadata={
                        "source": "media_message",
                        "node_id": node.get("id"),
                        "media_url": media_url,
                        "message_type": message_type,
                    },
                    msg_sequence=msg_sequence,
                )
            return False

        if message_type in {"button_message", "button"}:
            buttons = self._normalize_buttons(config.get("buttons", []))
            header_text = self._render_template(
                config.get("text") or config.get("message") or "", context
            )
            if header_text:
                self._queue_outbound_message(
                    conversation_id=conversation.id,
                    to_number=conversation.phone,
                    body=header_text,
                    metadata={
                        "source": "button_message",
                        "node_id": node.get("id"),
                        "buttons": buttons,
                    },
                    msg_sequence=msg_sequence,
                )
            state.pending_button = {"node_id": node.get("id"), "buttons": buttons, "mode": mode}
            state.button_expires_at = datetime.now(timezone.utc) + timedelta(
                minutes=int(config.get("button_timeout_minutes", 60))
            )
            return True

        # Plain text / ai / hybrid
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
            if ai_response and mode == "ai":
                outbound_text = ai_response
            elif ai_response and mode == "hybrid" and not outbound_text:
                outbound_text = ai_response

        if outbound_text:
            logger.info("🚀 Queuing outbound message!")
            self._queue_outbound_message(
                conversation_id=conversation.id,
                to_number=conversation.phone,
                body=outbound_text,
                metadata={"source": mode, "node_id": node.get("id")},
                msg_sequence=msg_sequence,
            )
        return False

    # ─────────────────────────────────────────────────────────────────────────
    # QUEUE
    # ─────────────────────────────────────────────────────────────────────────

    def _queue_outbound_message(
        self,
        *,
        conversation_id: Any,
        to_number: str,
        body: str,
        metadata: Optional[Dict[str, Any]] = None,
        msg_sequence: List[int],
    ) -> None:
        from app.workers.flow_execution import send_whatsapp_message_task

        msg_sequence[0] += 1
        ordering_delay = (msg_sequence[0] - 1) * 2

        send_whatsapp_message_task.apply_async(
            kwargs={
                "conversation_id": str(conversation_id),
                "to_number": to_number,
                "body": body,
                "metadata": metadata or {},
            },
            countdown=ordering_delay,
        )
        logger.info(
            f"📨 Message #{msg_sequence[0]} queued — ordering_gap={ordering_delay}s"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # AI RESPONSE
    # ─────────────────────────────────────────────────────────────────────────

    async def _generate_guardrailed_ai_response(
        self,
        db: Session,
        *,
        workspace_id: Any,
        prompt: str,
        inbound_text: str,
        context: Dict[str, Any],
    ) -> tuple[str, Dict[str, Any]]:
        retrieved = self.rag.retrieve_context(db, workspace_id, inbound_text)
        retrieved_context = (
            (retrieved or {}).get("context", "") if isinstance(retrieved, dict) else ""
        )
        if not retrieved_context.strip():
            return "Not Found", {}

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
        result = await self.llm_router.generate(llm_prompt, model="auto")
        content = (result or {}).get("content", "").strip()
        parsed = self._safe_json(content)
        if not parsed or parsed.get("status") == "NOT_FOUND":
            return "Not Found", result or {}
        answer = str(parsed.get("answer") or "").strip()
        return answer or "Not Found", result or {}

    # ─────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ─────────────────────────────────────────────────────────────────────────

    def _safe_json(self, value: str) -> Optional[Dict[str, Any]]:
        try:
            start = value.find("{")
            end = value.rfind("}")
            if start == -1 or end == -1:
                return None
            return json.loads(value[start: end + 1])
        except json.JSONDecodeError:
            return None

    def _normalize_buttons(self, buttons: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
        return [
            {
                "label": b.get("label") or "",
                "value": b.get("value") or b.get("label") or "",
                "target": b.get("target"),
            }
            for b in buttons[:3]
        ]

    def _render_template(self, text: str, context: Dict[str, Any]) -> str:
        if not text:
            return ""
        allowed_context = {
            k: str(v)[:200]
            for k, v in context.items()
            if k in {"user_name", "balance", "account_id", "last_user_message", "last_ai_response"}
        }
        try:
            return self.template_env.from_string(text).render(**allowed_context)
        except Exception as e:
            logger.warning(f"Template render error: {e}")
            return text

    def _get_default_target(
        self, edges: list[Dict[str, Any]], source_id: Optional[str]
    ) -> Optional[str]:
        if not source_id:
            return None
        edge = next(
            (e for e in edges if e.get("source") == source_id and not e.get("sourceHandle")),
            None,
        )
        return edge.get("target") if edge else None