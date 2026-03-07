import json
from app.models.brain import MCPDecision
from app.services.calender_executor import CalendarExecutor
from app.services.email_reply_excutor import EmailReplyExecutor
from app.models.brain import EmailMessage

class AutomationEngine:

    def __init__(self):
        
        self.ACTION_REGISTRY = {
              "propose_calendar_event": CalendarExecutor(),
              "suggest_reply": EmailReplyExecutor(),
         }

    def approve_and_execute(self, db, decision_id):

        print("User approving decision...")

        decision = db.query(MCPDecision).filter_by(message_id=decision_id).first()


        if not decision:
            print("Decision not found")
            return

        if decision.user_action == "approved":
            print("Already approved")
            return

        decision.user_action = "approved"
        db.commit()

        actions = decision.executed_actions_json

        # safety check
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
            "sender": sender
        }

        self.execute(
            db=db,
            workspace_id=decision.workspace_id,
            mcp_decision=decision_dict,
            force_execute=True
        )

        print("Approved decision executed")

    def reject_decision(self, db, decision_id):

        decision = db.query(MCPDecision).filter_by(id=decision_id).first()

        if not decision:
            print("Decision not found")
            return

        decision.user_action = "rejected"
        db.commit()
        
        print("Decision rejected")

        
    # Engine excuter
    def execute(self, db, workspace_id, mcp_decision, force_execute=False):
        print("Automation execution started...")

        try:
            if not self.validate_decision(mcp_decision):
                print("Invalid decision. Aborting.")
                return

            confidence = mcp_decision.get("confidence", 0)
            requires_permission = mcp_decision.get("requires_user_permission")
            actions = mcp_decision.get("actions", [])

            if confidence < 0.6:
                print("Low confidence. Skipping automation.")
                return

            if requires_permission and not force_execute:
                print("User permission required. Skipping execution.")
                return

            for action in actions:
                result = self.route_action(
                    db,
                    workspace_id,
                    action,
                    mcp_decision
                )

                self.log_execution(result)

            print("Automation execution completed")

        except Exception as e:
            print("Automation execution error:", e)

    
    #validate decision
    def validate_decision(self, mcp_decision):

        print("Validating MCP decision...")

        try:
            if not isinstance(mcp_decision, dict):
                print("Decision is not a dictionary")
                return False

            required_fields = [
                "category",
                "priority",
                "confidence",
                "actions",
                "requires_user_permission"
            ]

            #Required Field Check
            for field in required_fields:
                if field not in mcp_decision:
                    print(f"Missing required field: {field}")
                    return False

            #Type Validation
            if not isinstance(mcp_decision["confidence"], (int, float)):
                print("Invalid confidence type")
                return False

            if not isinstance(mcp_decision["actions"], list):
                print("Actions must be a list")
                return False

            if not isinstance(mcp_decision["requires_user_permission"], bool):
                print("requires_user_permission must be boolean")
                return False

            #Allowed Priority Values
            allowed_priorities = ["low", "medium", "high"]
            if mcp_decision["priority"] not in allowed_priorities:
                print("Invalid priority value")
                return False

            #Validate Each Action
            for action in mcp_decision["actions"]:
                if not isinstance(action, dict):
                    print("Invalid action format")
                    return False

                if "type" not in action:
                    print("Action missing type field")
                    return False

            print("Decision validation successful")
            return True

        except Exception as e:
            print("Decision validation error:", e)
            return False

    
    def route_action(self, db, workspace_id, action, decision):

        print(action)
        action_type = action.get("type")

        if action_type not in self.ACTION_REGISTRY:
            print(f"No executor found for action: {action_type}")
            return {
                "action": action_type,
                "status": "failed",
                "error": "Executor not found"
            }

        executor = self.ACTION_REGISTRY[action_type]

        try:
            action["sender"] = decision.get("sender")

            executor.execute(
            db=db,
            workspace_id=workspace_id,
            action=action,
            decision=decision
        )

            return {
                "action": action_type,
                "status": "success"
            }

        except Exception as e:
            print(f"Error executing {action_type}: {e}")

            return {
                "action": action_type,
                "status": "failed",
                "error": str(e)
            }

    def log_execution(self, result):

        print("Logging execution result:", result)