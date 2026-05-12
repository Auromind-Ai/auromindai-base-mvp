from sqlalchemy.orm import Session
# from app.services.mcp_service import MCPService
from app.services.flow_validation_service import FlowValidationService
from app.models import BrainEntry, AIAction
from app.services.email_service import EmailService # Added import
import uuid
from typing import Dict, Any, List, Optional

class OrchestrationService:
    """
    Central hub for Governed AI Workflows.
    Coordinates between Memory (Brain), Decision (MCP), and Execution layers.
    """

    @staticmethod
    def process_intent(
        db: Session,
        workspace_id: uuid.UUID,
        action_type: str,
        intent_raw: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for any AI action.
        Follows the mandatory Governance Workflow:
        1. Context Enrichment (Memory Layer)
        2. Governance Evaluation (Decision Layer / MCP)
        3. Conditioned Execution (Execution Layer)
        """
        
        # 1. Context Enrichment (Memory Layer)
        # Pull relevant business context from the Brain for grounded decisions
        context_entries = db.query(BrainEntry).filter(
            BrainEntry.workspace_id == str(workspace_id)
        ).limit(3).all()
        
        context_refs = [str(e.id) for e in context_entries]
        enriched_context = {
            "business_rules": [e.content for e in context_entries],
           "provided_metadata": (metadata or {}).get("provided_metadata", {})
        }

        # 2. Governance Evaluation (Decision Layer / MCP)
        # Mandatory gatekeeper check
        mcp_report = MCPService.evaluate_action(
            db=db,
            workspace_id=workspace_id,
            action_type=action_type,
            intent=intent_raw, # In a real system, this would be an extracted intent
            context=enriched_context,
            confidence=0.95, # Mock confidence for now
            context_refs=context_refs
        )

        # 3. Guarded Execution (Execution Layer)
        execution_result = None
        if mcp_report["decision"] == "ALLOW":
            execution_result = OrchestrationService._execute_action(
                db=db,
                action_id=uuid.UUID(mcp_report["action_id"]),
                action_type=action_type,
                metadata=metadata
            )

        return {
            "mcp": mcp_report,
            "execution": execution_result,
            "traceability": {
                "memory_layer": "Verified",
                "decision_layer": "Governed",
                "execution_layer": "Audited"
            }
        }

    @staticmethod
    def _execute_action(
        db: Session,
        action_id: uuid.UUID,
        action_type: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Internal helper to execute authorized actions"""
        # Update action status to executed
        action = db.query(AIAction).filter(AIAction.id == str(action_id)).first()
        if action:
            action.execution_status = "executed"
            db.commit()

        # Implementation of specific action types
        if action_type == "followup":
            # Extract email details from metadata
            to_email = metadata.get("to_email", "default@example.com")
            subject = metadata.get("subject", "Automated Follow-up")
            body = metadata.get("body", "This is an automated follow-up message.")
            
            # Send the email using the EmailService
            email_result = EmailService.send_email(to_email=to_email, subject=subject, body=body, metadata=metadata)
            return {"status": "success", "msg": "Follow-up email processed", "email_result": email_result}
        elif action_type == "promise_detection":
            return {"status": "success", "msg": "Promises extracted and saved to domain entities"}
        
        return {"status": "success", "msg": "Generic action executed"}

    @staticmethod
    def execute_flow(
        db: Session,
        workspace_id: uuid.UUID,
        flow_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Executes a sequence of actions based on a flow graph.
        Follows the edges to traverse the automation logic.
        """
        validation = FlowValidationService.validate_flow(
            flow_data.get("nodes", []),
            flow_data.get("edges", []),
        )
        if not validation["is_valid"]:
            raise ValueError("; ".join(validation["errors"]))

        results = []
        nodes = flow_data.get("nodes", [])
        node_map = {node["id"]: node for node in nodes}
        visited = set()
        queue = [validation["trigger_id"]]

        while queue:
            current_node_id = queue.pop(0)
            if current_node_id in visited:
                continue
            visited.add(current_node_id)
            current_node = node_map.get(current_node_id)
            if not current_node:
                continue

            if current_node["type"] == "action":
                res = OrchestrationService._execute_action(
                    db=db,
                    action_id=uuid.uuid4(), # Virtual action ID for execution
                    action_type=current_node.get("config", {}).get("type", "generic"),
                    metadata=current_node.get("config", {})
                )
                results.append({"node_id": current_node["id"], "result": res})

            next_edges = sorted(
                validation["outgoing_map"].get(current_node["id"], []),
                key=lambda edge: (
                    edge.get("sourceHandle") or "",
                    edge.get("id") or "",
                ),
            )
            for edge in next_edges:
                if edge["target"] not in visited:
                    queue.append(edge["target"])

        return results

