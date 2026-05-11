from app.core.logger import logger
from datetime import datetime
from app.models import HumanEscalation
import uuid


class EscalationQueue:

    def __init__(self, db=None):
        self.logger = logger
        self.db = db

        # fallback (only for dev)
        self.queue = []

        self.logger.info("EscalationQueue initialized")

    #  ADD ESCALATION
    def add(self, data):
        try:
            escalation_data = {
                "id": uuid.uuid4().hex,
                "user_id": data.get("user_id"),
                "reason": data.get("reason"),
                "status": "pending",
            }

            # DB MODE (CORRECT)
            if self.db:
                escalation = HumanEscalation(
                    user_id=escalation_data["user_id"],
                    reason=escalation_data["reason"],
                    status="pending",
                    workspace_id=data.get("workspace_id"),
                    channel=data.get("channel"),
                    message=data.get("message"),
                )

                self.db.add(escalation)
                self.db.commit()
                self.db.refresh(escalation)

            else:
                escalation = escalation_data
                self.queue.append(escalation)

            self.logger.info(
                "Escalation added",
                extra={"user_id": escalation_data["user_id"]}
            )

            return escalation

        except Exception as e:
            if self.db:
                self.db.rollback()

            self.logger.error("Error adding escalation", exc_info=True)
            return None

    # 🔥 GET PENDING
    def get_pending(self):
        try:
            if self.db:
                return self.db.query(HumanEscalation).filter(
                    HumanEscalation.status == "pending"
                ).all()

            return [e for e in self.queue if e["status"] == "pending"]

        except Exception as e:
            self.logger.error("Error fetching escalations", exc_info=True)
            return []

    # 🔥 MARK RESOLVED
    def mark_resolved(self, escalation_id):
        try:
            if self.db:
                escalation = self.db.query(HumanEscalation).filter(
                    HumanEscalation.id == escalation_id
                ).first()

                if escalation:
                    escalation.status = "resolved"
                    self.db.commit()
                    return True

                return False

            # fallback
            for item in self.queue:
                if item.get("id") == escalation_id:
                    item["status"] = "resolved"

            return True

        except Exception as e:
            if self.db:
                self.db.rollback()

            self.logger.error("Error resolving escalation", exc_info=True)
            return False