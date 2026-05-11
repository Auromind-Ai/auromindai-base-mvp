from app.core.logger import logger
import asyncio


class FollowupScheduler:

    def __init__(self, memory, orchestrator):
        self.logger = logger
        self.memory = memory
        self.orchestrator = orchestrator

        self.logger.info("FollowupScheduler initialized")

    async def run(self):
        try:
            self.logger.info("Running followup scheduler...")
            inactive_users = self.memory.get_inactive_users(hours=24)
 
            for user in inactive_users:
                user_id = user.get("user_id")
                state   = self.memory.get_conversation_state(user_id) or {}
 
                if state.get("followup_count", 0) >= 3:
                    continue
 
              
                workspace_id = state.get("workspace_id")
 
                if not workspace_id:
                    self.logger.warning(
                        f"No workspace_id for user {user_id} — skipping followup"
                    )
                    continue
 
                payload = {
                    "from":               user_id,
                    "body":               "",
                    "workspace_id":       workspace_id,
                    "is_followup_trigger": True,
                }
 
                await self.orchestrator.process_message(
                    payload=payload,
                    channel=state.get("channel", "twilio"),
                )
 
                self.logger.info(f"Followup triggered for {user_id}")
 
        except Exception:
            self.logger.error("FollowupScheduler error", exc_info=True)