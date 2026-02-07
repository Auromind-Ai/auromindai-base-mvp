from sqlalchemy.orm import Session
from app.models import AIAction
from typing import Dict, Any, List
import uuid
from datetime import datetime
from app.models.mcp_rule import MCPRule

class MCPService:
    """Model Context Protocol - Governance layer for AI actions"""
    
    # Default MCP rules
    DEFAULT_RULES = {
        "no_auto_spending": True,
        "max_followups_per_conversation": 3,
        "require_approval_for_sensitive": True,
        "min_confidence_threshold": 0.7,
        "blocked_keywords": ["refund", "legal", "lawsuit", "complaint"],
        "escalate_high_value_leads": True,
        "high_value_threshold": 10000  # Currency amount
    }

    
    @staticmethod
    def evaluate_action(
        db: Session,
        workspace_id: uuid.UUID,
        action_type: str,
        intent: str,
        context: Dict[str, Any],
        confidence: float = 0.0,
        intent_raw: str = None,
        context_refs: List[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate an AI action and return decision: ALLOW, ESCALATE, or BLOCK
        """
        
        rules = MCPService.get_rules(db, workspace_id)
        
        decision = "ALLOW"
        reason = "System verified: Action complies with all governance policies."
        rule_results = []
        
        # Rule 1: Confidence Check
        conf_result = {
            "rule": "min_confidence_threshold",
            "required": rules["min_confidence_threshold"],
            "actual": confidence,
            "passed": confidence >= rules["min_confidence_threshold"]
        }
        rule_results.append(conf_result)
        if not conf_result["passed"]:
            decision = "ESCALATE"
            reason = f"Governance Alert: Decision confidence ({confidence:.2f}) below threshold. Human verification required."

        # Rule 2: Blocked Keywords (Safety Layer)
        intent_lower = intent.lower()
        matched_keywords = [k for k in rules["blocked_keywords"] if k in intent_lower]
        keyword_result = {
            "rule": "blocked_keywords",
            "passed": len(matched_keywords) == 0,
            "matches": matched_keywords
        }
        rule_results.append(keyword_result)
        if not keyword_result["passed"]:
            decision = "BLOCK"
            reason = f"Safety Block: Prohibited content detected ({', '.join(matched_keywords)}). Action suppressed by system."

        # Rule 3: Monetary & Sensitive Policies
        if action_type == "marketing_suggestion" and rules["no_auto_spending"]:
            spending_result = {"rule": "no_auto_spending", "passed": False}
            rule_results.append(spending_result)
            decision = "ESCALATE"
            reason = "Financial Guardrail: Marketing budget updates require multi-signature approval."
        
        # Rule 4: Domain-Specific Limits (Follow-ups)
        if action_type == "followup":
            provided_meta = context.get("provided_metadata", {})
            followup_count = provided_meta.get("followup_count", 0)
            limit_passed = followup_count < rules["max_followups_per_conversation"]
            limit_result = {"rule": "max_followups", "actual": followup_count, "limit": rules["max_followups_per_conversation"], "passed": limit_passed}
            rule_results.append(limit_result)
            
            if not limit_passed:
                decision = "BLOCK"
                reason = "Engagement Limit: Maximum autonomous follow-up sequence reached for this lead."
            
            # High Value Escalation
            if rules["escalate_high_value_leads"]:
                val = provided_meta.get("lead_value", 0)
                if val >= rules["high_value_threshold"]:
                    rule_results.append({"rule": "high_value_escalation", "value": val, "passed": False})
                    decision = "ESCALATE"
                    reason = f"High-Value Protocol: Lead value (${val}) qualifies for mandatory human review."

        # Log action with full audit trail
        ai_action = AIAction(
            workspace_id=str(workspace_id),
            action_type=action_type,
            intent=intent,
            intent_raw=intent_raw,
            confidence=confidence,
            mcp_decision=decision.lower(),
            mcp_reason=reason,
            rule_results=rule_results,
            context_refs=context_refs or [],
            execution_status="pending" if decision == "ALLOW" else decision.lower(),
            action_metadata=context
        )
        db.add(ai_action)
        db.commit()
        db.refresh(ai_action)
        
        return {
            "decision": decision,
            "reason": reason,
            "confidence": confidence,
            "action_id": str(ai_action.id),
            "traceability_token": str(uuid.uuid4())[:8],
            "timestamp": ai_action.created_at.isoformat() if ai_action.created_at else None
        }
    
    @staticmethod
    def get_ai_actions(
        db: Session,
        workspace_id: uuid.UUID,
        limit: int = 50,
        decision_filter: str = None
    ) -> List[Dict]:
        """Get AI actions log for a workspace"""
        query = db.query(AIAction).filter(AIAction.workspace_id == str(workspace_id))
        
        if decision_filter:
            query = query.filter(AIAction.mcp_decision == decision_filter.lower())
        
        actions = query.order_by(AIAction.created_at.desc()).limit(limit).all()
        
        return [
            {
                "id": str(action.id),
                "action_type": action.action_type,
                "intent": action.intent,
                "confidence": action.confidence,
                "mcp_decision": action.mcp_decision,
                "mcp_reason": action.mcp_reason,
                "human_override": action.human_override,
                "metadata": action.action_metadata,  # Map back to metadata for API response
                "created_at": action.created_at.isoformat() if action.created_at else None
            }
            for action in actions
        ]
    
    @staticmethod
    def override_decision(db: Session, action_id: uuid.UUID, approved: bool):
        """Human override for ESCALATE decisions"""
        action = db.query(AIAction).filter(AIAction.id == action_id).first()
        if not action:
            raise ValueError("Action not found")
        
        if action.mcp_decision != "escalate":
            raise ValueError("Can only override ESCALATE decisions")
        
        action.human_override = True
        action.mcp_decision = "allow" if approved else "block"
        action.mcp_reason += f" (Human override: {'approved' if approved else 'rejected'})"
        db.commit()
        
        return {
            "action_id": str(action.id),
            "decision": action.mcp_decision,
            "human_override": True
        }
            
    @staticmethod
    def get_rules(db: Session, workspace_id: uuid.UUID) -> Dict:
          
            rules = db.query(MCPRule).filter(
                MCPRule.workspace_id == workspace_id,
                MCPRule.is_active == True
            ).all()

            db_rules = {r.rule_key: r.rule_value for r in rules}

            return {
                **MCPService.DEFAULT_RULES,
                **db_rules
            }
            
    @staticmethod
    def update_rules(db: Session, workspace_id: uuid.UUID, rules: Dict):
            updated = []

            for key, value in rules.items():
                rule = db.query(MCPRule).filter(
                    MCPRule.workspace_id == workspace_id,
                    MCPRule.rule_key == key
                ).first()

                if rule:
                    rule.rule_value = value
                    rule.is_active = True
                else:
                    rule = MCPRule(
                        workspace_id=workspace_id,
                        rule_key=key,
                        rule_value=value
                    )
                    db.add(rule)

                updated.append(key)

            db.commit()

            return {
                "status": "success",
                "updated_rules": updated,
                "rules": MCPService.get_rules(db, workspace_id)
            }    