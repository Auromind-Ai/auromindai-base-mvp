class ConversationPolicy:

    def __init__(self, memory, config):
        self.memory = memory
        self.config = config

    def evaluate(self, user_id, stage, lead_data):

        try:
            state = self.memory.get_conversation_state(user_id) or {}
            history = self.memory.get_conversation_history(user_id) or []

            message_count = len(history)

            # HARD LIMIT
            if message_count > 10:
                return {"action": "ESCALATE", "reason": "Max conversation limit"}

            # REPEAT LIMIT
            repeat_count = state.get("repeat_count", 0)
            if repeat_count >= 2:
                return {"action": "ESCALATE", "reason": "User repeated same query multiple times"}

            # FOLLOWUP LIMIT
            if state.get("followup_count", 0) >= self.config.get("followup_limit"):
                return {"action": "ESCALATE", "reason": "Followup exceeded"}

            # LEAD COMPLETE CHECK
            if stage == "lead":
                if all([
                lead_data.get("name"),
                lead_data.get("requirement"),
                lead_data.get("contact")
            ]):
                    return {"action": "ALLOW"} 

           

        except Exception:
            return {"action": "ALLOW"}