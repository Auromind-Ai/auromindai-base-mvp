from app.core.logger import logger
import asyncio


class FollowupScheduler:

    def __init__(self, memory, orchestrator):
        self.logger = logger
        self.memory = memory
        self.orchestrator = orchestrator

        self.logger.info("FollowupScheduler initialized")

    def run(self):
        try:
            self.logger.info("Running followup scheduler...")

            #GET INACTIVE USERS
            inactive_users = self.memory.get_inactive_users(hours=24)

            for user in inactive_users:
                user_id = user.get("user_id")

                #CHECK FOLLOWUP LIMIT
                state = self.memory.get_conversation_state(user_id) or {}
                followup_count = state.get("followup_count", 0)

                if followup_count >= 3:
                    self.logger.info(
                        "Followup limit reached",
                        extra={"user_id": user_id}
                    )
                    continue

                # TRIGGER FOLLOWUP AGENT
                payload = {
                    "user_id": user_id,
                    "message": "",   # no new message
                    "workspace_id": user.get("workspace_id"),
                    "is_followup_trigger": True
                }

               
                asyncio.run(self.orchestrator.process_message(
                    payload=payload,
                    channel=user.get("channel", "whatsapp")
                ))

                self.logger.info(
                    "Followup triggered",
                    extra={"user_id": user_id}
                )

        except Exception as e:
            self.logger.error("FollowupScheduler error", exc_info=True)