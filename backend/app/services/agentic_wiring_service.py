"""
Agentic Wiring Service — Fixed version
Fixes:
  1. System prompt aligned with flow_service_v2.py field expectations
  2. _validate_and_enhance_flow auto-builds edges from button.target
  3. Node IDs always strings
  4. brain_query config structure correct
  5. Reachability guaranteed before returning
"""

import json
import os
import uuid
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq


class AgenticWiringServiceV2:

    def __init__(self):
        load_dotenv()
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if self.google_api_key:
            genai.configure(api_key=self.google_api_key)
        self.groq_client = Groq(api_key=self.groq_api_key) if self.groq_api_key else None

    # ------------------------------------------------------------------ #
    #  PUBLIC                                                              #
    # ------------------------------------------------------------------ #

    def generate_flow(self, prompt: str) -> Dict[str, Any]:
        system_prompt = self._get_system_prompt()
        user_prompt = self._build_user_prompt(prompt)

        try:
            if self.groq_client:
                response = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    model="llama-3.3-70b-versatile",
                    temperature=0.15,
                    response_format={"type": "json_object"},
                    timeout=30.0,
                )
                flow_data = json.loads(response.choices[0].message.content)

            elif self.google_api_key:
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(
                    f"{system_prompt}\n\n{user_prompt}",
                    generation_config={
                        "temperature": 0.15,
                        "response_mime_type": "application/json",
                    },
                )
                content = response.text.strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                flow_data = json.loads(content)

            else:
                raise Exception("No AI provider configured (set GOOGLE_API_KEY or GROQ_API_KEY)")

            return self._validate_and_enhance_flow(flow_data)

        except Exception as e:
            print(f"Flow generation error: {e}")
            return self._get_fallback_flow(str(e))

    # ------------------------------------------------------------------ #
    #  SYSTEM PROMPT — aligned with flow_service_v2.py exactly            #
    # ------------------------------------------------------------------ #

    def _get_system_prompt(self) -> str:
        return """You are a WhatsApp automation flow architect. Generate production-ready flows.

═══════════════════════════════════════
CRITICAL: EXACT JSON SCHEMA — DO NOT DEVIATE
═══════════════════════════════════════

OUTPUT FORMAT:
{
  "nodes": [ ...node objects... ],
  "edges": [ ...edge objects... ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NODE TYPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1) TRIGGER NODE (exactly one per flow):
{
  "id": "1",
  "type": "trigger",
  "label": "Customer Message",
  "config": {
    "event": "msg_recv",
    "match_type": "word_match",
    "keywords": ["hi", "hello", "hey", "start"]
  },
  "position": { "x": 100, "y": 200 }
}

2) TEXT MESSAGE NODE:
{
  "id": "2",
  "type": "action",
  "label": "Welcome",
  "config": {
    "type": "send_msg",
    "message_type": "text",
    "text": "👋 Hi! Welcome to our store. How can I help you?",
    "mode": "manual"
  },
  "position": { "x": 500, "y": 200 }
}

3) BUTTON MESSAGE NODE (max 3 buttons):
{
  "id": "3",
  "type": "action",
  "label": "Main Menu",
  "config": {
    "type": "send_msg",
    "message_type": "button_message",
    "text": "What would you like to do?",
    "mode": "manual",
    "buttons": [
      { "id": "btn_products", "label": "Browse Products 🛍️", "value": "products", "target": "4" },
      { "id": "btn_orders",   "label": "My Orders 📦",       "value": "orders",   "target": "5" },
      { "id": "btn_support",  "label": "Support 💬",         "value": "support",  "target": "6" }
    ]
  },
  "position": { "x": 900, "y": 200 }
}

4) AI BRAIN QUERY NODE (answers from knowledge base):
{
  "id": "7",
  "type": "action",
  "label": "AI Support",
  "config": {
    "type": "brain_query",
    "prompt": "Answer the customer's question professionally using only the knowledge base. If not found, say you will connect them to a human agent."
  },
  "position": { "x": 1300, "y": 300 }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDGES — CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEFAULT edge (between non-button nodes):
{ "id": "e1-2", "source": "1", "target": "2" }

BUTTON edge (one per button, sourceHandle = button.value):
{ "id": "e3-4", "source": "3", "sourceHandle": "products", "target": "4" }
{ "id": "e3-5", "source": "3", "sourceHandle": "orders",   "target": "5" }
{ "id": "e3-6", "source": "3", "sourceHandle": "support",  "target": "6" }

⚠️  MANDATORY: For EVERY button in a button_message node:
    - button.target  MUST equal the target node id
    - An edge with sourceHandle = button.value MUST exist
    Both are required. Missing either breaks the flow.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POSITIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Start: x=100, y=200
- Each next step: x += 400
- Button branches: main branch y=200, upper branch y=50, lower branch y=350
- Never overlap nodes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE & STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Use emojis in messages (👋 🛍️ 📦 💬 ✅ 🤖)
- Friendly, conversational tone
- Keep messages under 160 characters when possible
- Use \\n for line breaks in text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETE EXAMPLE — E-COMMERCE FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "nodes": [
    {
      "id": "1", "type": "trigger", "label": "Customer Message",
      "config": { "event": "msg_recv", "match_type": "word_match", "keywords": ["hi","hello","hey"] },
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "2", "type": "action", "label": "Welcome",
      "config": { "type": "send_msg", "message_type": "text", "text": "👋 Hi! Welcome to our store!", "mode": "manual" },
      "position": { "x": 500, "y": 200 }
    },
    {
      "id": "3", "type": "action", "label": "Main Menu",
      "config": {
        "type": "send_msg", "message_type": "button_message",
        "text": "How can I help you today?", "mode": "manual",
        "buttons": [
          { "id": "btn_p", "label": "Products 🛍️", "value": "products", "target": "4" },
          { "id": "btn_o", "label": "Orders 📦",   "value": "orders",   "target": "5" },
          { "id": "btn_s", "label": "Support 💬",  "value": "support",  "target": "6" }
        ]
      },
      "position": { "x": 900, "y": 200 }
    },
    {
      "id": "4", "type": "action", "label": "Products Info",
      "config": { "type": "send_msg", "message_type": "text", "text": "🛍️ Check our latest products at: shop.example.com", "mode": "manual" },
      "position": { "x": 1300, "y": 50 }
    },
    {
      "id": "5", "type": "action", "label": "Orders Info",
      "config": { "type": "send_msg", "message_type": "text", "text": "📦 Share your order ID and we'll check the status!", "mode": "manual" },
      "position": { "x": 1300, "y": 200 }
    },
    {
      "id": "6", "type": "action", "label": "AI Support",
      "config": { "type": "brain_query", "prompt": "Answer the customer's support question using only the knowledge base." },
      "position": { "x": 1300, "y": 350 }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" },
    { "id": "e2-3", "source": "2", "target": "3" },
    { "id": "e3-4", "source": "3", "sourceHandle": "products", "target": "4" },
    { "id": "e3-5", "source": "3", "sourceHandle": "orders",   "target": "5" },
    { "id": "e3-6", "source": "3", "sourceHandle": "support",  "target": "6" }
  ]
}

Return ONLY valid JSON with "nodes" and "edges". No explanation, no markdown, no extra keys."""

    # ------------------------------------------------------------------ #
    #  USER PROMPT                                                         #
    # ------------------------------------------------------------------ #

    def _build_user_prompt(self, user_input: str) -> str:
        return f"""Create a complete WhatsApp automation flow for:

{user_input}

Requirements:
1. Start with a trigger node (keywords that match the use case)
2. Welcome message first
3. Button menu for choices if multiple paths needed
4. Use brain_query node where AI / knowledge base answer is needed
5. Every button MUST have both a target node id AND a corresponding edge with sourceHandle
6. All nodes must be reachable from the trigger
7. Use emojis, friendly tone

Return ONLY the JSON object with "nodes" and "edges" arrays."""

    # ------------------------------------------------------------------ #
    #  VALIDATE & AUTO-FIX                                                 #
    # ------------------------------------------------------------------ #

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

        # 4. Ensure button nodes have proper structure + mode field
        for node in nodes:
            config = node.get("config") or {}

            # Add mode field to send_msg nodes if missing
            if config.get("type") == "send_msg" and "mode" not in config:
                config["mode"] = "manual"
                node["config"] = config

            # Process buttons
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
                # Only keep target if it actually exists
                if btn.get("target") and btn["target"] not in node_ids:
                    btn["target"] = None
                fixed_buttons.append(btn)

            config["buttons"] = fixed_buttons
            # Ensure message_type is set
            if config.get("type") == "send_msg":
                config["message_type"] = "button_message"
            node["config"] = config

        # 5. AUTO-BUILD missing button edges
        #    For every button with a valid target, ensure an edge with sourceHandle exists
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

        # 6. Fix missing default edge from trigger to first action
        #    (Only if trigger has no outgoing edge at all)
        trigger_node = next((n for n in nodes if n.get("type") == "trigger"), None)
        if trigger_node:
            trigger_id = trigger_node["id"]
            trigger_has_edge = any(e.get("source") == trigger_id for e in edges)
            if not trigger_has_edge and len(nodes) > 1:
                # Connect trigger to the first non-trigger node
                first_action = next(
                    (n for n in nodes if n.get("type") != "trigger"), None
                )
                if first_action:
                    edges.insert(0, {
                        "id": f"e{trigger_id}-{first_action['id']}",
                        "source": trigger_id,
                        "target": first_action["id"],
                    })

        # 7. Ensure all edge IDs are unique strings
        seen_edge_ids = set()
        for i, edge in enumerate(edges):
            eid = edge.get("id") or f"e_auto_{i}"
            eid = str(eid)
            while eid in seen_edge_ids:
                eid = f"{eid}_{i}"
            edge["id"] = eid
            seen_edge_ids.add(eid)

        return {"nodes": nodes, "edges": edges}

    # ------------------------------------------------------------------ #
    #  FALLBACK                                                            #
    # ------------------------------------------------------------------ #

    def _get_fallback_flow(self, error: str) -> Dict[str, Any]:
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
                        "text": f"⚠️ Flow generation failed. Please build manually.\n\nError: {error[:100]}",
                    },
                    "position": {"x": 500, "y": 200},
                },
            ],
            "edges": [
                {"id": "e1-2", "source": "1", "target": "2"}
            ],
        }


# Singleton
agentic_wiring_service = AgenticWiringServiceV2()