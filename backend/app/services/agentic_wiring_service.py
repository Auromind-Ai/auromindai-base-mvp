import json
import os
from typing import Dict, List, Any
from sqlalchemy.orm import Session
import google.generativeai as genai
from groq import Groq

class AgenticWiringService:
    """
    Translates natural language prompts into structured node-edge graphs (n8n-style).
    Uses LLMs to identify triggers, actions, and their logical connections.
    """

    def __init__(self):
        from dotenv import load_dotenv
        load_dotenv()
        
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
        print(f"DEBUG: AgenticWiringService Init - Google: {bool(self.google_api_key)}, Groq: {bool(self.groq_api_key)}")
        
        if self.google_api_key:
            genai.configure(api_key=self.google_api_key)
        
        self.groq_client = Groq(api_key=self.groq_api_key) if self.groq_api_key else None

    def generate_flow(self, prompt: str) -> Dict[str, Any]:
        """
        Generates a flow graph from a prompt.
        
        Returns:
            {
                "nodes": [{"id": "1", "type": "trigger", "label": "..."}, ...],
                "edges": [{"id": "e1-2", "source": "1", "target": "2"}]
            }
        """
        
        system_prompt = """
        You are the AuroMind Wiring Agent. Your job is to convert complex automation requests into a structured node-edge graph.
        
        Format your response EXCLUSIVELY as a JSON object with 'nodes' and 'edges'.
        
        Nodes must have:
        - id: unique string
        - type: trigger, action, or condition
        - label: concise human-readable name
        - config: specific parameters for the node (e.g., query, message_template, delay_minutes)
        - position: { "x": number, "y": number } (spread them out)
        
        Edges must have:
        - id: unique string
        - source: id of the source node
        - target: id of the target node
        
        Available Node Types:
        - triggers: new_lead, msg_recv, flow_done, no_reply, deal_move
        - actions: send_msg, assign_agent, create_task, move_stage, notification, add_tag, brain_query
        - conditions: if_channel, if_intent, if_sentiment
        
        Example:
        User: "When a lead says refund, alert the legal team and pause the flow"
        Response:
        {
          "nodes": [
            { "id": "1", "type": "trigger", "label": "Message Received", "config": {"intent": "refund"}, "position": {"x": 100, "y": 100} },
            { "id": "2", "type": "action", "label": "Search Brain (Policy)", "config": {"query": "refund policy"}, "position": {"x": 350, "y": 100} },
            { "id": "3", "type": "action", "label": "Alert Legal", "config": {"to": "legal@company.com"}, "position": {"x": 600, "y": 100} }
          ],
          "edges": [
            { "id": "e1", "source": "1", "target": "2" },
            { "id": "e2", "source": "2", "target": "3" }
          ]
        }
        """

        try:
            if self.groq_client:
                print(f"DEBUG: Calling Groq with model llama-3.3-70b-versatile...")
                response = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    model="llama-3.3-70b-versatile",
                    temperature=0.1,
                    response_format={"type": "json_object"},
                    timeout=20.0
                )
                print(f"DEBUG: Groq response received.")
                return json.loads(response.choices[0].message.content)
            elif self.google_api_key:
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(f"{system_prompt}\n\nUser: {prompt}")
                # Clean markdown if present
                content = response.text.strip()
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                return json.loads(content)
            else:
                raise Exception("No AI provider configured")
        except Exception as e:
            print(f"Error generating flow: {e}")
            return {
                "nodes": [{"id": "err", "type": "action", "label": "Error generating flow", "config": {}, "position": {"x": 0, "y": 0}}],
                "edges": []
            }

agentic_wiring_service = AgenticWiringService()
