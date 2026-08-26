import json
import logging
import uuid
from typing import Any, Dict, List
from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


class AgenticWiringServiceV2:

    def __init__(self):
        pass
    #  PUBLIC                                                              
 

    async def generate_flow(
        self,
        prompt: str,
        db: Session = None,
        workspace_id: str = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        system_prompt = self._get_system_prompt()
        user_prompt = self._build_user_prompt(prompt)

        try:
            if db is not None and workspace_id is not None and user_id is not None:
                from app.services.ai.execution_service import AIExecutionService, AIFeatureRegistry
                from app.core.exceptions import BillingError, WorkspaceAccessError

                # Direct centralized execution without hardcoded custom SDK wrappers
                res = await AIExecutionService.execute(
                    db=db,
                    workspace_id=workspace_id,
                    user_id=user_id,
                    feature_key=AIFeatureRegistry.FLOW,
                    prompt=user_prompt,
                    system_prompt=system_prompt,
                    structured_output=True,
                    model="auto",
                    description="Generate WhatsApp flow"
                )
                flow_data = json.loads(res.get("text", "{}"))

            else:
                raise ValueError(
                    "generate_flow() requires db, workspace_id, and user_id. "
                    "Unauthenticated / billing-bypassed flow generation is not permitted."
                )


            return self._validate_and_enhance_flow(flow_data)

        except Exception as e:
            logger.exception("[AgenticWiring] Flow generation failed: %s", e)
            from app.core.exceptions import AIProviderError, get_ai_provider_error_details, BillingError, WorkspaceAccessError
            if isinstance(e, (AIProviderError, BillingError, WorkspaceAccessError)):
                raise e
            safe_msg, status_code = get_ai_provider_error_details(e, operation="flow")
            raise AIProviderError(safe_msg, status_code=status_code)

    #  SYSTEM PROMPT — aligned with flow_service_v2.py exactly            #

  
    def _get_system_prompt(self) -> str:
            return r"""
        You are a production-grade WhatsApp Automation Flow Architect.

        Your task is to convert ANY valid business automation requirement provided by the user into a complete, executable WhatsApp automation flow.

        ============================================================
        PRIMARY RULE — DYNAMIC GENERATION
        ============================================================

        The user's prompt is the ONLY source of truth for the business requirement.

        You MUST dynamically design the flow based on the user's actual request.

        DO NOT copy business values from this system prompt.

        DO NOT treat any example value, label, keyword, button name, message, variable name, ID, or business scenario shown below as a default.

        The examples below exist ONLY to explain the JSON STRUCTURE and FIELD TYPES.

        Every actual value in the final JSON must be generated dynamically according to the user's requirement.

        For example, if the schema contains:

        "keywords": ["example1", "example2"]

        those are NOT default keywords.

        You must replace them with keywords relevant to the user's actual business requirement.

        If the user asks for a restaurant automation, generate restaurant-related content.

        If the user asks for real-estate automation, generate real-estate-related content.

        If the user asks for education, generate education-related content.

        If the user asks for ecommerce, generate ecommerce-related content.

        If the user asks for any other industry, dynamically adapt to that industry.

        NEVER blindly reuse values from the schema examples.

        ============================================================
        ARCHITECTURE PRINCIPLE
        ============================================================

        Think internally in this order:

        USER REQUIREMENT
                ↓
        BUSINESS / INDUSTRY UNDERSTANDING
                ↓
        CUSTOMER INTENT
                ↓
        REQUIRED CONVERSATION STEPS
                ↓
        REQUIRED DATA COLLECTION
                ↓
        DECISION / BRANCHING REQUIREMENTS
                ↓
        AI / HUMAN HANDOFF REQUIREMENTS
                ↓
        SELECT APPROPRIATE NODE TYPES
                ↓
        GENERATE JSON
                ↓
        VALIDATE GRAPH
                ↓
        RETURN FINAL JSON

        Do not expose this reasoning.

        Return only the final JSON.

        ============================================================
        SCHEMA IS A CONTRACT, NOT A TEMPLATE
        ============================================================

        The following schemas define ONLY the structure that the backend accepts.

        They do NOT define the actual content of the flow.

        You must populate the fields dynamically.

        Never copy:
        - example labels
        - example messages
        - example keywords
        - example button values
        - example variable names
        - example IDs
        - example business terminology

        unless the user's request independently requires the same value.

        ============================================================
        OUTPUT FORMAT
        ============================================================

        The final response MUST contain exactly:

        {
        "nodes": [...],
        "edges": [...]
        }

        No other top-level fields are allowed.

        Do not return:
        - explanations
        - markdown
        - comments
        - analysis
        - text before JSON
        - text after JSON

        ============================================================
        NODE SCHEMA CONTRACT
        ============================================================

        1. TRIGGER NODE

        Structure:

        {
        "id": "<unique string>",
        "type": "trigger",
        "label": "<dynamic label>",
        "config": {
            "event": "msg_recv",
            "match_type": "<dynamic supported match type>",
            "keywords": ["<dynamic keyword>", "..."]
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Rules:

        - Exactly ONE trigger node.
        - "event" must be "msg_recv".
        - Choose match_type according to the user's requirement.
        - Generate keywords from the user's actual intent.
        - Never use generic placeholder keywords.
        - Never copy keywords from this prompt.
        - Keywords should represent realistic ways a customer may initiate the requested automation.
        - Do not add unrelated keywords.

        Supported match_type values:

        "exact"
        "contains"
        "word_match"
        "fuzzy"
        "semantic"

        Choose the most appropriate one.

        ============================================================
        2. TEXT MESSAGE NODE
        ============================================================

        Structure:

        {
        "id": "<unique string>",
        "type": "action",
        "label": "<dynamic purpose label>",
        "config": {
            "type": "send_msg",
            "message_type": "text",
            "text": "<dynamic business-specific message>",
            "mode": "manual"
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Rules:

        - Generate message content from the user's requirement.
        - Do not copy messages from this prompt.
        - Message must make sense in the actual business context.
        - Keep messages concise and natural for WhatsApp.
        - Use emojis only when appropriate.
        - Do not add unnecessary generic messages.
        - Use variables only when those variables have already been collected or are guaranteed runtime variables.

        ============================================================
        3. BUTTON MESSAGE NODE
        ============================================================

        Structure:

        {
        "id": "<unique string>",
        "type": "action",
        "label": "<dynamic purpose label>",
        "config": {
            "type": "send_msg",
            "message_type": "button_message",
            "text": "<dynamic question>",
            "mode": "manual",
            "buttons": [
            {
                "id": "<unique button id>",
                "label": "<dynamic button label>",
                "value": "<dynamic machine-readable value>",
                "target": "<target node id>"
            }
            ]
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Rules:

        - Maximum 3 buttons.
        - Button labels MUST come from the user's actual business requirement.
        - Button values MUST represent the meaning of the button.
        - Button IDs must be unique.
        - Button targets must point to real nodes.
        - Never copy button labels or values from examples.
        - Use buttons only when the customer has a small number of clear choices.
        - Do not force buttons into every flow.

        If more than 3 choices are required, design a hierarchical or text-based flow instead.

        ============================================================
        4. AI BRAIN QUERY NODE
        ============================================================

        Structure:

        {
        "id": "<unique string>",
        "type": "action",
        "label": "<dynamic AI purpose>",
        "config": {
            "type": "brain_query",
            "prompt": "<dynamic AI instruction based on the business requirement>"
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Rules:

        - The brain_query prompt must be dynamically generated.
        - The prompt must reflect the user's actual business/domain.
        - Do not copy a generic AI prompt from this system prompt.
        - Tell the AI what type of customer question it should answer.
        - Tell the AI to use the available knowledge base.
        - Tell the AI not to invent business facts.
        - If information is unavailable, it should appropriately handle the limitation.

        CRITICAL:

        brain_query is always terminal.

        Therefore:

        - No outgoing edges from brain_query.
        - No node may execute after brain_query.
        - brain_query must be the final node of its branch.
        - Never connect another node after it.

        ============================================================
        5. ASK QUESTION NODE
        ============================================================

        Structure:

        {
        "id": "<unique string>",
        "type": "action",
        "label": "<dynamic question purpose>",
        "config": {
            "type": "ask_question",
            "question": "<dynamic business-specific question>",
            "variable_name": "<dynamic snake_case variable>",
            "timeout_minutes": <number>
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Rules:

        - Generate the question from the actual business requirement.
        - Generate the variable dynamically.
        - Variable must be lowercase snake_case.
        - Variable must describe the collected information.
        - Variable must be unique.
        - Do not use example variable names from this prompt.
        - Do not collect unnecessary information.
        - Collect only information required to accomplish the user's stated business objective.
        - timeout_minutes must be a reasonable numeric value supported by the runtime.

        Examples of possible information types are only conceptual:

        name
        email
        location
        budget
        date
        time
        quantity
        requirement
        service
        product
        property_type

        These are NOT mandatory fields.

        ============================================================
        6. ASSIGN AGENT NODE
        ============================================================

        Structure:

        {
        "id": "<unique string>",
        "type": "action",
        "label": "<dynamic purpose>",
        "config": {
            "type": "assign_agent"
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Use only when the business requirement logically requires human involvement.

        Do not invent additional configuration fields.

        ============================================================
        7. MOVE STAGE NODE
        ============================================================

        Structure:

        {
        "id": "<unique string>",
        "type": "action",
        "label": "<dynamic purpose>",
        "config": {
            "type": "move_stage"
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Use only when CRM stage progression is logically required by the business workflow.

        Do not invent additional configuration fields.

        ============================================================
        8. NOTIFICATION NODE
        ============================================================

        Structure:

        {
        "id": "<unique string>",
        "type": "action",
        "label": "<dynamic purpose>",
        "config": {
            "type": "notification"
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Use when the workflow logically requires an internal team notification.

        Do not invent additional configuration fields.

        ============================================================
        9. MEDIA MESSAGE
        ============================================================

        Supported structure:

        {
        "id": "<unique string>",
        "type": "action",
        "label": "<dynamic purpose>",
        "config": {
            "type": "send_msg",
            "message_type": "<image | video | document>"
        },
        "position": {
            "x": <number>,
            "y": <number>
        }
        }

        Only use media when explicitly required by the user's requirement AND the runtime can execute the generated configuration.

        Never invent fake URLs.

        ============================================================
        NODE SELECTION RULE
        ============================================================

        Do NOT use every available node type.

        Select only the nodes necessary for the user's actual requirement.

        Examples of reasoning:

        If the user wants FAQ automation:
        → Trigger
        → relevant response/menu
        → brain_query

        If the user wants lead qualification:
        → Trigger
        → questions
        → qualification logic if supported
        → agent/CRM action when appropriate

        If the user wants customer support:
        → Trigger
        → support options
        → brain_query or human handoff

        If the user wants booking-related conversation:
        → collect the information that is actually required
        → use only supported actions
        → do not invent a booking node if none exists

        These are reasoning examples only.

        Never copy these flows literally.

        ============================================================
        DYNAMIC BUSINESS ADAPTATION
        ============================================================

        The generated flow must reflect:

        - industry
        - business type
        - customer intent
        - products/services
        - terminology
        - requested outcome
        - customer journey
        - required information
        - decision points
        - support requirements
        - sales requirements
        - handoff requirements

        All of these must be inferred from the user's prompt.

        Do not force a predefined industry template.

        ============================================================
        NO HALLUCINATED CAPABILITIES
        ============================================================

        The schema is the hard capability boundary.

        If the user requests something that is not represented by a supported node/configuration:

        DO NOT invent a new node type.

        DO NOT invent new configuration fields.

        DO NOT invent fake integrations.

        DO NOT invent API actions.

        DO NOT invent payment functionality.

        DO NOT invent calendar functionality.

        DO NOT invent database operations.

        DO NOT invent external services.

        Instead, create the closest executable workflow using the available capabilities.

        ============================================================
        EDGE SCHEMA
        ============================================================

        Normal edge:

        {
        "id": "<unique edge id>",
        "source": "<source node id>",
        "target": "<target node id>"
        }

        Button edge:

        {
        "id": "<unique edge id>",
        "source": "<button node id>",
        "sourceHandle": "<button value>",
        "target": "<button target node id>"
        }

        Rules:

        - Every source node must exist.
        - Every target node must exist.
        - Edge IDs must be unique.
        - No dangling edges.
        - No invalid references.

        ============================================================
        BUTTON INTEGRITY
        ============================================================

        For EVERY button:

        button.target
        MUST equal
        corresponding edge.target

        AND

        button.value
        MUST equal
        corresponding edge.sourceHandle

        AND

        edge.source
        MUST equal
        button node ID.

        Every button MUST have exactly one corresponding edge.

        Missing either the button target or edge makes the flow invalid.

        ============================================================
        GRAPH VALIDATION
        ============================================================

        Before returning JSON, internally validate:

        1. Exactly one trigger.
        2. Trigger has no incoming edge.
        3. All node IDs are unique.
        4. All edge IDs are unique.
        5. All edge sources exist.
        6. All edge targets exist.
        7. All nodes are reachable from the trigger.
        8. No unintended orphan nodes.
        9. Every button has a valid target.
        10. Every button has a matching edge.
        11. Button target equals edge target.
        12. Button value equals sourceHandle.
        13. brain_query has no outgoing edge.
        14. No node exists after brain_query.
        15. Variables are created before being referenced.
        16. No unsupported node types.
        17. No unsupported configuration fields.
        18. No fake URLs.
        19. No unnecessary nodes.
        20. Flow logically satisfies the user's requirement.
        21. JSON syntax is valid.

        ============================================================
        FLOW COMPLEXITY
        ============================================================

        Generate the LOWEST-COMPLEXITY flow that fully satisfies the user's requirement.

        Do not create a huge flow simply because many node types are available.

        Simple requirement:
        → simple flow.

        Complex requirement:
        → appropriately complex flow.

        Every node must have a purpose.

        If removing a node does not reduce business functionality or improve the required customer journey, consider removing it.

        ============================================================
        AMBIGUOUS USER REQUEST
        ============================================================

        If the user provides an incomplete but understandable requirement:

        Do NOT return a generic static template.

        Infer a reasonable workflow from the available information.

        Use generic terminology only where the user's business details are genuinely unknown.

        Do not invent specific business facts.

        ============================================================
        ID GENERATION
        ============================================================

        Generate unique string IDs for every node.

        IDs are structural identifiers only.

        Do not encode business assumptions into IDs.

        Example format:

        "1"
        "2"
        "3"

        or another unique string format.

        Use one consistent format within the flow.

        ============================================================
        POSITIONING
        ============================================================

        Use readable graph positions.

        Initial node:

        x = 100
        y = 200

        Sequential nodes generally move horizontally.

        Use approximately 400 horizontal spacing between sequential nodes.

        For branches, separate Y positions sufficiently to avoid overlap.

        Positions are visual metadata only and must not contain business meaning.

        ============================================================
        MESSAGE QUALITY
        ============================================================

        Messages must:

        - match the user's business
        - match the user's requested purpose
        - sound natural on WhatsApp
        - be concise
        - avoid unnecessary corporate language
        - avoid irrelevant information
        - use emojis naturally when appropriate

        Never copy messages from this system prompt.

        ============================================================
        ABSOLUTE FINAL RULE
        ============================================================

        The schema tells you HOW to structure the flow.

        The user's prompt tells you WHAT the flow must contain.

        NEVER reverse these responsibilities.

        SCHEMA = STRUCTURE

        USER PROMPT = CONTENT + BUSINESS LOGIC

        Therefore:

        1. Read the user requirement.
        2. Understand the required business workflow.
        3. Select appropriate supported nodes.
        4. Dynamically populate every field.
        5. Validate the complete graph.
        6. Return only the final JSON.

        FINAL OUTPUT:

        {
        "nodes": [...],
        "edges": [...]
        }

        Nothing else.
        """
        


    def _build_user_prompt(self, prompt: str) -> str:
        return f"""Generate a WhatsApp automation flow for:

{prompt}

Return ONLY the JSON object with "nodes" and "edges" arrays."""

    #
    #  WIRE FALLBACK BUTTONS                                               #
    #

    def _wire_fallback_buttons(
        self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        node_map = {n["id"]: n for n in nodes if n.get("id")}
        incoming_map: Dict[str, str] = {}
        for edge in edges:
            target = edge.get("target")
            source = edge.get("source")
            if target and source and not edge.get("sourceHandle"):
                incoming_map[target] = source

        main_menu_node_id = next(
            (
                n["id"]
                for n in nodes
                if "menu" in (n.get("label") or "").lower()
                or "menu" in (n.get("config", {}).get("text") or "").lower()
            ),
            None,
        )

        fallback_node_ids: set = set()

        for node in nodes:
            node_id = node.get("id")
            if not node_id:
                continue
            config = node.get("config") or {}
            if not _is_fallback_node(node):
                continue

            previous_node_id = incoming_map.get(node_id)

            buttons = []
            if previous_node_id:
                buttons.append({
                    "id": f"{node_id}_retry",
                    "label": "Retry 🔁",
                    "value": "retry",
                    "target": previous_node_id,
                })
            if main_menu_node_id:
                buttons.append({
                    "id": f"{node_id}_main_menu",
                    "label": "Main Menu 📋",
                    "value": "main_menu",
                    "target": main_menu_node_id,
                })

            if not buttons:
                continue

            fallback_node_ids.add(node_id)
            config["type"] = "send_msg"
            config["message_type"] = "button_message"
            config["mode"] = config.get("mode") or "manual"
            config["buttons"] = buttons
            node["config"] = config

        if not fallback_node_ids:
            return edges

        return [edge for edge in edges if edge.get("source") not in fallback_node_ids]

    #  VALIDATE & AUTO-FIX                                                 #
    def _validate_and_enhance_flow(self, flow_data: Dict[str, Any]) -> Dict[str, Any]:
        nodes: List[Dict] = flow_data.get("nodes", [])
        edges: List[Dict] = flow_data.get("edges", [])

        # 1. Ensure all node IDs are strings
        id_map: Dict[Any, str] = {}
        for node in nodes:
            old_id = node.get("id")
            new_id = str(old_id) if old_id is not None else str(uuid.uuid4())[:8]
            id_map[old_id] = new_id
            node["id"] = new_id

        # Fix edge IDs to match new string node IDs
        for edge in edges:
            if edge.get("source") in id_map:
                edge["source"] = id_map[edge["source"]]
            if edge.get("target") in id_map:
                edge["target"] = id_map[edge["target"]]

        # Also fix button targets inside nodes
        for node in nodes:
            config = node.get("config") or {}
            for btn in config.get("buttons") or []:
                old_target = btn.get("target")
                if old_target in id_map:
                    btn["target"] = id_map[old_target]

        # 2. Ensure exactly one trigger node
        triggers = [n for n in nodes if n.get("type") == "trigger"]
        if not triggers:
            default_trigger = {
                "id": "1",
                "type": "trigger",
                "label": "Message Received",
                "config": {
                    "event": "msg_recv",
                    "match_type": "word_match",
                    "keywords": ["hi", "hello", "start"],
                },
                "position": {"x": 100, "y": 200},
            }
            nodes.insert(0, default_trigger)

        # 3. Ensure every node has a position
        x_offset = 100
        for node in nodes:
            if "position" not in node or not isinstance(node.get("position"), dict):
                node["position"] = {"x": x_offset, "y": 200}
                x_offset += 400

        # 4. Convert fallback nodes into button_message branches where possible
        edges = self._wire_fallback_buttons(nodes, edges)

        # 5. Ensure button nodes have proper structure + mode field
        for node in nodes:
            config = node.get("config") or {}

            if config.get("type") == "send_msg" and "mode" not in config:
                config["mode"] = "manual"
                node["config"] = config

            buttons = config.get("buttons") or []
            if not buttons:
                continue

            node_ids = {n["id"] for n in nodes}
            fixed_buttons = []
            for i, btn in enumerate(buttons[:3]):
                if not btn.get("id"):
                    btn["id"] = f"btn_{btn.get('value', i)}"
                if not btn.get("value"):
                    btn["value"] = btn.get("label", f"option_{i}").lower().replace(" ", "_")
                if btn.get("target") and btn["target"] not in node_ids:
                    btn["target"] = None
                fixed_buttons.append(btn)

            config["buttons"] = fixed_buttons
            if config.get("type") == "send_msg":
                config["message_type"] = "button_message"
            node["config"] = config

        # 6. AUTO-BUILD missing button edges
        existing_edge_keys = {
            (e.get("source"), e.get("sourceHandle")): e
            for e in edges
            if e.get("sourceHandle")
        }

        for node in nodes:
            config = node.get("config") or {}
            for btn in config.get("buttons") or []:
                target = btn.get("target")
                value = btn.get("value")
                if not target or not value:
                    continue
                key = (node["id"], value)
                if key not in existing_edge_keys:
                    new_edge = {
                        "id": f"e{node['id']}-{target}-{value}",
                        "source": node["id"],
                        "sourceHandle": value,
                        "target": target,
                    }
                    edges.append(new_edge)
                    existing_edge_keys[key] = new_edge

        # 7. Fix missing default edge from trigger to first action
        trigger_node = next((n for n in nodes if n.get("type") == "trigger"), None)
        if trigger_node:
            trigger_id = trigger_node["id"]
            trigger_has_edge = any(e.get("source") == trigger_id for e in edges)
            if not trigger_has_edge and len(nodes) > 1:
                first_action = next(
                    (n for n in nodes if n.get("type") != "trigger"), None
                )
                if first_action:
                    edges.insert(0, {
                        "id": f"e{trigger_id}-{first_action['id']}",
                        "source": trigger_id,
                        "target": first_action["id"],
                    })

        # 8. Ensure all edge IDs are unique strings
        seen_edge_ids = set()
        for i, edge in enumerate(edges):
            eid = edge.get("id") or f"e_auto_{i}"
            eid = str(eid)
            while eid in seen_edge_ids:
                eid = f"{eid}_{i}"
            edge["id"] = eid
            seen_edge_ids.add(eid)

        return {"nodes": nodes, "edges": edges}


    #  FALLBACK                                                            #
    def _get_fallback_flow(self) -> Dict[str, Any]:
        return {
            "nodes": [
                {
                    "id": "1",
                    "type": "trigger",
                    "label": "Message Trigger",
                    "config": {
                        "event": "msg_recv",
                        "match_type": "word_match",
                        "keywords": ["hi", "hello"],
                    },
                    "position": {"x": 100, "y": 200},
                },
                {
                    "id": "2",
                    "type": "action",
                    "label": "Error — Setup Needed",
                    "config": {
                        "type": "send_msg",
                        "message_type": "text",
                        "mode": "manual",
                        "text": "⚠️ Flow generation failed. Please build manually.",
                    },
                    "position": {"x": 500, "y": 200},
                },
            ],
            "edges": [
                {"id": "e1-2", "source": "1", "target": "2"}
            ],
        }


def _is_fallback_node(node: Dict[str, Any]) -> bool:
    config = node.get("config") or {}
    if config.get("is_fallback") is True:
        return True
    hint = " ".join(
        _normalize_hint(part)
        for part in (node.get("label"), config.get("text"), config.get("message"))
        if part
    )
    fallback_markers = (
        "fallback", "invalid option", "invalid choice", "did not understand",
        "didn t understand", "unclear input", "not sure", "try again",
    )
    return any(marker in hint for marker in fallback_markers)


def _normalize_hint(value: Any) -> str:
    return " ".join(str(value or "").lower().replace("_", " ").split())


# Singleton
agentic_wiring_service = AgenticWiringServiceV2()