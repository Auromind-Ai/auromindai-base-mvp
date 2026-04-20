import json
import logging
from datetime import datetime, timezone
from typing import Optional

from app.models.brain import MCPDecision, EmailMessage
from app.services.email_automation.calender_executor import CalendarExecutor
from app.services.email_automation.email_reply_excutor import EmailReplyExecutor

logger = logging.getLogger(__name__)


class AutomationEngine:

    def __init__(self):
        # Executors instantiated once at startup — never inside a loop.
        self.ACTION_REGISTRY = {
            "propose_calendar_event": CalendarExecutor(),
            "suggest_reply": EmailReplyExecutor(),
        }

    # ------------------------------------------------------------------
    # Public entry-points
    # ------------------------------------------------------------------

    def approve_and_execute(self, db, decision_id: str):
        logger.info("[AutomationEngine] Approving decision %s", decision_id)

        decision = db.query(MCPDecision).filter_by(message_id=decision_id).first()

        if not decision:
            logger.warning("[AutomationEngine] Decision %s not found", decision_id)
            return

        if decision.user_action == "approved":
            logger.info("[AutomationEngine] Decision %s already approved — skipping", decision_id)
            return

        decision.user_action = "approved"
        db.commit()

        actions = decision.executed_actions_json
        if isinstance(actions, str):
            actions = json.loads(actions)

        email = db.query(EmailMessage).filter_by(
            gmail_message_id=decision.message_id
        ).first()
        sender = email.sender if email else "Unknown Sender"

        decision_dict = {
            "workspace_id": decision.workspace_id,
            "category": decision.category,
            "priority": decision.priority,
            "confidence": decision.confidence,
            "actions": actions or [],
            "requires_user_permission": decision.requires_user_permission,
            "sender": sender,
        }

        self.execute(
            db=db,
            workspace_id=decision.workspace_id,
            mcp_decision=decision_dict,
            force_execute=True,
            # Pass message_id so execute() can persist results back to the decision row.
            message_id=decision.message_id,
        )

        logger.info("[AutomationEngine] Approved decision %s executed", decision_id)

    def reject_decision(self, db, decision_id: str):
        decision = db.query(MCPDecision).filter_by(id=decision_id).first()

        if not decision:
            logger.warning("[AutomationEngine] Decision %s not found for rejection", decision_id)
            return

        decision.user_action = "rejected"
        db.commit()
        logger.info("[AutomationEngine] Decision %s rejected", decision_id)

    # ------------------------------------------------------------------
    # Core execution
    # ------------------------------------------------------------------

    def execute(
        self,
        db,
        workspace_id: str,
        mcp_decision: dict,
        force_execute: bool = False,
        message_id: Optional[str] = None,
    ):
        """
        Execute all actions in *mcp_decision*.

        Every action result — success or failure — is persisted back to the
        MCPDecision row (when message_id is supplied) so that failures are
        never silently swallowed.

        Returns:
            dict: {"succeeded": [...], "failed": [...]}
        """
        logger.info(
            "[AutomationEngine] Execution started | workspace=%s message_id=%s",
            workspace_id,
            message_id,
        )

        succeeded = []
        failed = []

        try:
            if not self.validate_decision(mcp_decision):
                logger.error("[AutomationEngine] Invalid decision — aborting | message_id=%s", message_id)
                self._persist_execution_summary(db, message_id, succeeded=[], failed=["INVALID_DECISION"])
                return {"succeeded": [], "failed": ["INVALID_DECISION"]}

            confidence = mcp_decision.get("confidence", 0)
            requires_permission = mcp_decision.get("requires_user_permission")
            actions = mcp_decision.get("actions", [])

            if confidence < 0.6:
                logger.warning(
                    "[AutomationEngine] Low confidence (%.2f) — skipping | message_id=%s",
                    confidence,
                    message_id,
                )
                return {"succeeded": [], "failed": []}

            if requires_permission and not force_execute:
                logger.info(
                    "[AutomationEngine] Permission required — awaiting approval | message_id=%s",
                    message_id,
                )
                return {"succeeded": [], "failed": []}

            for action in actions:
                result = self.route_action(db, workspace_id, action, mcp_decision)
                self._log_execution(result)

                if result.get("status") == "success":
                    succeeded.append(result["action"])
                else:
                    failed.append(result)

            # Persist the execution summary so failures are visible in the DB.
            self._persist_execution_summary(db, message_id, succeeded, failed)

            logger.info(
                "[AutomationEngine] Execution complete | succeeded=%d failed=%d message_id=%s",
                len(succeeded),
                len(failed),
                message_id,
            )

        except Exception as exc:
            logger.exception(
                "[AutomationEngine] Unexpected error during execution | message_id=%s | error=%s",
                message_id,
                exc,
            )
            failed.append({"action": "UNKNOWN", "status": "failed", "error": str(exc)})
            self._persist_execution_summary(db, message_id, succeeded, failed)

        return {"succeeded": succeeded, "failed": failed}

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate_decision(self, mcp_decision: dict) -> bool:
        logger.debug("[AutomationEngine] Validating decision")

        try:
            if not isinstance(mcp_decision, dict):
                logger.error("[AutomationEngine] Decision is not a dict")
                return False

            required_fields = [
                "category",
                "priority",
                "confidence",
                "actions",
                "requires_user_permission",
            ]
            for field in required_fields:
                if field not in mcp_decision:
                    logger.error("[AutomationEngine] Missing required field: %s", field)
                    return False

            if not isinstance(mcp_decision["confidence"], (int, float)):
                logger.error("[AutomationEngine] Invalid confidence type")
                return False

            if not isinstance(mcp_decision["actions"], list):
                logger.error("[AutomationEngine] actions must be a list")
                return False

            if not isinstance(mcp_decision["requires_user_permission"], bool):
                logger.error("[AutomationEngine] requires_user_permission must be bool")
                return False

            allowed_priorities = {"low", "medium", "high"}
            if mcp_decision["priority"] not in allowed_priorities:
                logger.error("[AutomationEngine] Invalid priority: %s", mcp_decision["priority"])
                return False

            for action in mcp_decision["actions"]:
                if not isinstance(action, dict) or "type" not in action:
                    logger.error("[AutomationEngine] Malformed action: %s", action)
                    return False

            logger.debug("[AutomationEngine] Decision validation passed")
            return True

        except Exception as exc:
            logger.exception("[AutomationEngine] Validation error: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Action routing
    # ------------------------------------------------------------------

    def route_action(self, db, workspace_id: str, action: dict, decision: dict) -> dict:
        action_type = action.get("type")
        logger.info("[AutomationEngine] Routing action: %s", action_type)

        if action_type not in self.ACTION_REGISTRY:
            logger.error("[AutomationEngine] No executor registered for action type: %s", action_type)
            return {"action": action_type, "status": "failed", "error": "Executor not found"}

        executor = self.ACTION_REGISTRY[action_type]

        try:
            action["sender"] = decision.get("sender")
            executor.execute(db=db, workspace_id=workspace_id, action=action, decision=decision)
            return {"action": action_type, "status": "success"}

        except Exception as exc:
            logger.exception(
                "[AutomationEngine] Executor failed | action=%s | error=%s", action_type, exc
            )
            return {"action": action_type, "status": "failed", "error": str(exc)}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _log_execution(self, result: dict):
        """Structured log — replaces the bare print statement."""
        if result.get("status") == "success":
            logger.info("[AutomationEngine] Action succeeded: %s", result.get("action"))
        else:
            logger.error(
                "[AutomationEngine] Action failed: %s | error: %s",
                result.get("action"),
                result.get("error"),
            )

    def _persist_execution_summary(
        self,
        db,
        message_id: Optional[str],
        succeeded: list,
        failed: list,
    ):
        """
        Write execution outcome back to the MCPDecision row so that any
        failures are visible in the database — not just in stdout.

        This is intentionally a best-effort write: if the DB call itself
        fails we log it but do not re-raise (the original execution result
        has already been determined at this point).
        """
        if not message_id or not db:
            return

        try:
            decision = db.query(MCPDecision).filter_by(message_id=message_id).first()
            if not decision:
                return

            decision.execution_succeeded = json.dumps(succeeded)
            decision.execution_failed = json.dumps(failed)
            decision.execution_completed_at = datetime.now(timezone.utc)
            db.commit()

            logger.debug(
                "[AutomationEngine] Persisted execution summary | message_id=%s succeeded=%d failed=%d",
                message_id,
                len(succeeded),
                len(failed),
            )

        except Exception as exc:
            logger.exception(
                "[AutomationEngine] Failed to persist execution summary | message_id=%s | error=%s",
                message_id,
                exc,
            )
            db.rollback()