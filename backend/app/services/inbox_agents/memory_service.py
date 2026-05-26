import hashlib
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.logger import logger
from app.models import Message
from app.models import (
    AIAction,
    Conversation,
    ConversationState,
    Followup,
    Lead,
    SalesPipeline,
    SupportTicket,
)


class MemoryService:
    def __init__(self, db: Session):
        self.db = db
        self.logger = logger

    @staticmethod
    def _normalize_scope(workspace_id: str | UUID, conversation_id: str | UUID) -> tuple[str, str]:
        if not workspace_id or not conversation_id:
            raise ValueError("workspace_id and conversation_id are required")
        return str(workspace_id), str(conversation_id)

    @staticmethod
    def _maybe_uuid(value: str | UUID | None) -> UUID | None:
        if value is None:
            return None
        if isinstance(value, UUID):
            return value
        try:
            return UUID(str(value))
        except (TypeError, ValueError):
            return None

    def _get_conversation(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ) -> Conversation | None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        return (
            self.db.query(Conversation)
            .filter(
                Conversation.workspace_id == workspace_id,
                Conversation.id == conversation_id,
            )
            .first()
        )

    def get_conversation_state(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ) -> dict[str, Any] | None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        state = (
            self.db.query(ConversationState)
            .filter_by(workspace_id=workspace_id, conversation_id=conversation_id)
            .first()
        )
        if not state:
            return None

        return {
            "id": str(state.id),
            "workspace_id": workspace_id,
            "conversation_id": conversation_id,
            "current_stage": state.current_stage or "new",
            "last_intent": state.last_intent,
            "last_agent": state.last_agent,
            "followup_count": state.followup_count or 0,
            "repeat_count": state.repeat_count or 0,
            "updated_at": state.updated_at,
        }

    def get_conversation_history(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ):
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        return (
            self.db.query(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .filter(
                Message.conversation_id == conversation_id,
                Conversation.workspace_id == workspace_id,
            )
            .order_by(Message.timestamp.asc())
            .all()
        )

    def update_conversation_state(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
        data: dict[str, Any],
    ) -> None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        try:
            state = (
                self.db.query(ConversationState)
                .filter_by(workspace_id=workspace_id, conversation_id=conversation_id)
                .first()
            )

            if not state:
                state = ConversationState(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                )
                self.db.add(state)

            for key, value in data.items():
                if hasattr(state, key):
                    setattr(state, key, value)

            state.updated_at = datetime.now(timezone.utc)
            self.db.commit()
        except Exception:
            self.db.rollback()
            self.logger.error("Error updating conversation state", exc_info=True)

    def get_lead_data(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ) -> Lead | None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        return (
            self.db.query(Lead)
            .filter_by(workspace_id=workspace_id, conversation_id=conversation_id)
            .first()
        )

    def update_lead_data(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
        data: dict[str, Any],
    ) -> None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        try:
            lead = self.get_lead_data(workspace_id=workspace_id, conversation_id=conversation_id)
            if not lead:
                lead = Lead(workspace_id=workspace_id, conversation_id=conversation_id)
                self.db.add(lead)

            for key, value in data.items():
                if hasattr(lead, key):
                    setattr(lead, key, value)

            self.db.commit()
        except Exception:
            self.db.rollback()
            self.logger.error("Error updating lead", exc_info=True)

    def get_sales_data(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ) -> SalesPipeline | None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        return (
            self.db.query(SalesPipeline)
            .filter_by(workspace_id=workspace_id, conversation_id=conversation_id)
            .first()
        )

    def update_sales_data(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
        data: dict[str, Any],
    ) -> None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        try:
            sales = self.get_sales_data(workspace_id=workspace_id, conversation_id=conversation_id)
            if not sales:
                sales = SalesPipeline(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                )
                self.db.add(sales)

            for key, value in data.items():
                if hasattr(sales, key):
                    setattr(sales, key, value)

            sales.updated_at = datetime.now(timezone.utc)
            self.db.commit()
        except Exception:
            self.db.rollback()
            self.logger.error("Error updating sales", exc_info=True)

    def create_support_ticket(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
        data: dict[str, Any],
    ) -> SupportTicket | None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        try:
            conversation = self._get_conversation(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
            )
            ticket = SupportTicket(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
                user_id=conversation.user_id if conversation else None,
                issue_type=data.get("issue_type"),
                description=data.get("description"),
                status="open",
            )
            self.db.add(ticket)
            self.db.commit()
            return ticket
        except Exception:
            self.db.rollback()
            self.logger.error("Error creating support ticket", exc_info=True)
            return None

    def get_followup_data(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ) -> Followup | None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        return (
            self.db.query(Followup)
            .filter_by(workspace_id=workspace_id, conversation_id=conversation_id)
            .order_by(Followup.created_at.desc())
            .first()
        )

    def update_followup_data(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
        data: dict[str, Any],
    ) -> None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        try:
            follow = self.get_followup_data(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
            )
            if not follow:
                follow = Followup(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                    scheduled_at=data.get("scheduled_at") or datetime.now(timezone.utc),
                )
                self.db.add(follow)

            for key, value in data.items():
                if hasattr(follow, key):
                    setattr(follow, key, value)

            follow.executed_at = datetime.now(timezone.utc)
            self.db.commit()
        except Exception:
            self.db.rollback()
            self.logger.error("Error updating followup", exc_info=True)

    def increment_followup(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ) -> None:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        try:
            follow = self.get_followup_data(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
            )
            if not follow:
                follow = Followup(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                    scheduled_at=datetime.now(timezone.utc),
                    followup_count=0,
                )
                self.db.add(follow)

            follow.followup_count = (follow.followup_count or 0) + 1
            follow.executed_at = datetime.now(timezone.utc)
            self.db.commit()
        except Exception:
            self.db.rollback()
            self.logger.error("Error incrementing followup", exc_info=True)

    def log_ai_action(
        self,
        workspace_id,
        action_type,
        intent,
        confidence,
        decision,
        reason,
        metadata=None,
    ) -> None:
        try:
            action = AIAction(
                workspace_id=workspace_id,
                action_type=action_type,
                intent=intent,
                confidence=confidence,
                mcp_decision=decision,
                mcp_reason=reason,
                action_metadata=metadata or {},
            )
            self.db.add(action)
            self.db.commit()
        except Exception:
            self.db.rollback()
            self.logger.error("Error logging AI action", exc_info=True)

    def get_inactive_users(
        self,
        *,
        workspace_id: str | UUID,
        hours: int = 24,
    ):
        try:
            workspace_id = str(workspace_id)

            now = datetime.now(timezone.utc)

            states = (
                self.db.query(ConversationState)
                .filter(
                    ConversationState.workspace_id == workspace_id
                )
                .all()
            )

            result = []

            for state in states:
                if not state.updated_at:
                    continue

                diff = (
                    now - state.updated_at
                ).total_seconds() / 3600

                if diff >= hours:
                    result.append(
                        {
                            "workspace_id": str(state.workspace_id),
                            "conversation_id": str(state.conversation_id),
                            "state": state,
                        }
                    )

            return result

        except Exception:
            self.logger.error(
                "Error fetching inactive conversations",
                exc_info=True,
            )
            return []
        
    def get_turn_count(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ) -> int:
        try:
            history = self.get_conversation_history(
                workspace_id=workspace_id,
                conversation_id=conversation_id,
            )
            return len(history) if history else 0
        except Exception:
            self.logger.error("Error getting turn count", exc_info=True)
            return 0

    def detect_and_track_repeat(
        self,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
        message: str,
    ) -> int:
        workspace_id, conversation_id = self._normalize_scope(workspace_id, conversation_id)
        try:
            msg_hash = hashlib.md5(message.strip().lower().encode()).hexdigest() if message else ""
            state = (
                self.db.query(ConversationState)
                .filter_by(workspace_id=workspace_id, conversation_id=conversation_id)
                .first()
            )

            if not state:
                state = ConversationState(
                    workspace_id=workspace_id,
                    conversation_id=conversation_id,
                    repeat_count=0,
                    last_message_hash=msg_hash,
                )
                self.db.add(state)
                self.db.commit()
                return 0

            if state.last_message_hash == msg_hash and msg_hash:
                state.repeat_count = (state.repeat_count or 0) + 1
            else:
                state.repeat_count = 0

            state.last_message_hash = msg_hash
            state.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            return state.repeat_count or 0
        except Exception:
            self.db.rollback()
            self.logger.error("Error in repeat detection", exc_info=True)
            return 0
