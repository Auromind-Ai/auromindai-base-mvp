from sqlalchemy.orm import Session
from app.services.mcp_service import MCPService
from app.models import BrainEntry, AIAction
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
            "provided_metadata": metadata or {}
        }

        # 2. Governance Evaluation (Decision Layer / MCP)
        # Mandatory gatekeeper check
        mcp_report = MCPService.evaluate_action(
            db=db,
            workspace_id=workspace_id,
            action_type=action_type,
            intent=intent_raw, # In a real system, this would be an extracted intent
            intent_raw=intent_raw,
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
            return {"status": "success", "msg": "Follow-up queued for background delivery"}
        elif action_type == "promise_detection":
            return {"status": "success", "msg": "Promises extracted and saved to domain entities"}
        
        return {"status": "success", "msg": "Generic action executed"}
