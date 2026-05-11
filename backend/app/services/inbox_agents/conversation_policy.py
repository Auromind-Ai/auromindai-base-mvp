class ConversationPolicy:
 
    def __init__(self, memory, config):
        self.memory = memory
        self.config = config
 
    def evaluate(self, user_id, stage, lead_data):
        try:
            state   = self.memory.get_conversation_state(user_id) or {}
            history = self.memory.get_conversation_history(user_id) or []
 
            message_count = len(history)
 
            if message_count > 10:
                return {"action": "ESCALATE", "reason": "Max conversation limit"}
 
            repeat_count = state.get("repeat_count", 0)
            if repeat_count >= 2:
                return {"action": "ESCALATE", "reason": "User repeated same query"}
 
            followup_limit = self.config.get("followup_limit", 3)
            if state.get("followup_count", 0) >= followup_limit:
                return {"action": "ESCALATE", "reason": "Followup limit exceeded"}
 
            if stage == "lead":
                if all([
                    lead_data.get("name"),
                    lead_data.get("requirement"),
                    lead_data.get("contact"),
                ]):
                    return {"action": "CLOSE"}
 
            return {"action": "ALLOW"}
 
        except Exception:
            return {"action": "ALLOW"}
 