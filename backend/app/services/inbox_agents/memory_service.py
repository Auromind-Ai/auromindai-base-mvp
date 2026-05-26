import hashlib
import uuid as _uuid

from app.core.logger import logger
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Message

from app.models import (
    ConversationState,
    Lead,
    SalesPipeline,
    SupportTicket,
    Followup,
    AIAction,
    Conversation
)


def _is_valid_uuid(value) -> bool:
    """Return True if *value* can be interpreted as a UUID."""
    if value is None:
        return False
    try:
        _uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError):
        return False


class MemoryService:

    def __init__(self, db: Session):
        self.db = db

        self.logger = logger

    # CONVERSATION STATE
    def get_conversation_state(self, user_id):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"get_conversation_state: invalid UUID user_id={user_id!r}, skipping")
            return None
        state = self.db.query(ConversationState).filter_by(user_id=user_id).first()
        if not state:
            return None

        conversation = self.db.query(Conversation).filter_by(user_id=user_id).order_by(Conversation.id.desc()).first()
        workspace_id = str(conversation.workspace_id) if conversation and conversation.workspace_id else None

        return {
            "id": str(state.id),
            "user_id": str(state.user_id),
            "workspace_id": workspace_id,
            "current_stage": state.current_stage or "new",
            "last_intent": state.last_intent,
            "last_agent": state.last_agent,
            "followup_count": state.followup_count or 0,
            "updated_at": state.updated_at
        }
    
    def get_conversation_history(self, user_id):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"get_conversation_history: invalid UUID user_id={user_id!r}, skipping")
            return []
        return self.db.query(Message).join(Conversation, Message.conversation_id == Conversation.id).filter(
            Conversation.user_id == user_id
        ).order_by(Message.timestamp.asc()).all()
    


    def update_conversation_state(self, user_id, data):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"update_conversation_state: invalid UUID user_id={user_id!r}, skipping")
            return
        try:
            # Query the object directly
            state = self.db.query(ConversationState).filter_by(user_id=user_id).first()

            if not state:
                state = ConversationState(user_id=user_id)
                self.db.add(state)

            for key, value in data.items():
                setattr(state, key, value)

            state.updated_at = datetime.now(timezone.utc)

            self.db.commit()

        except Exception:
            self.db.rollback()
            self.logger.error("Error updating conversation state", exc_info=True)


    # LEAD DATA
    def get_lead_data(self, user_id):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"get_lead_data: invalid UUID user_id={user_id!r}, skipping")
            return None
        return self.db.query(Lead).filter_by(user_id=user_id).first()

    def update_lead_data(self, user_id, data):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"update_lead_data: invalid UUID user_id={user_id!r}, skipping")
            return
        try:
            lead = self.get_lead_data(user_id)

            if not lead:
                lead = Lead(user_id=user_id)
                self.db.add(lead)

            new_custom = dict(lead.custom_fields or {})
            for key, value in data.items():
                if hasattr(lead, key) and key != "custom_fields":
                    if key == "meeting_date":
                        if isinstance(value, str) and value.strip():
                            try:
                                from dateutil import parser
                                setattr(lead, key, parser.parse(value))
                            except Exception:
                                self.logger.warning(f"Failed to parse meeting_date: {value}")
                        # If value is boolean (like True) or invalid type, do not set it to the DateTime column
                    else:
                        setattr(lead, key, value)
                else:
                    new_custom[key] = value
            lead.custom_fields = new_custom

            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(lead, "custom_fields")

            self.db.commit()

        except Exception:
            self.db.rollback()
            self.logger.error("Error updating lead", exc_info=True)


    # SALES DATA
    def get_sales_data(self, user_id):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"get_sales_data: invalid UUID user_id={user_id!r}, skipping")
            return None
        return self.db.query(SalesPipeline).filter_by(user_id=user_id).first()

    def update_sales_data(self, user_id, data):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"update_sales_data: invalid UUID user_id={user_id!r}, skipping")
            return
        try:
            sales = self.get_sales_data(user_id)

            if not sales:
                sales = SalesPipeline(user_id=user_id)
                self.db.add(sales)

            for key, value in data.items():
                setattr(sales, key, value)

            sales.updated_at = datetime.now(timezone.utc)

            self.db.commit()

        except Exception:
            self.db.rollback()
            self.logger.error("Error updating sales", exc_info=True)


    # SUPPORT DATA
    def create_support_ticket(self, user_id, data):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"create_support_ticket: invalid UUID user_id={user_id!r}, skipping")
            return None
        try:
            ticket = SupportTicket(
                user_id=user_id,
                issue_type=data.get("issue_type"),
                description=data.get("description"),
                status="open"
            )

            self.db.add(ticket)
            self.db.commit()

            return ticket

        except Exception:
            self.db.rollback()
            self.logger.error("Error creating support ticket", exc_info=True)
            return None

  
    # FOLLOW-UP DATA
    def get_followup_data(self, user_id):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"get_followup_data: invalid UUID user_id={user_id!r}, skipping")
            return None
        return self.db.query(Followup).filter_by(user_id=user_id).first()

    def update_followup_data(self, user_id, data):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"update_followup_data: invalid UUID user_id={user_id!r}, skipping")
            return
        try:
            follow = self.get_followup_data(user_id)

            if not follow:
                follow = Followup(user_id=user_id)
                self.db.add(follow)

            for key, value in data.items():
                setattr(follow, key, value)

            follow.last_followup_at = datetime.now(timezone.utc)

            self.db.commit()

        except Exception:
            self.db.rollback()
            self.logger.error("Error updating followup", exc_info=True)

    def increment_followup(self, user_id):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"increment_followup: invalid UUID user_id={user_id!r}, skipping")
            return
        try:
            follow = self.get_followup_data(user_id)

            if not follow:
                follow = Followup(user_id=user_id, followup_count=0)
                self.db.add(follow)

            follow.followup_count = (follow.followup_count or 0) + 1
            follow.last_followup_at = datetime.now(timezone.utc)

            self.db.commit()

        except Exception:
            self.db.rollback()
            self.logger.error("Error increment followup", exc_info=True)


    # MCP LOGGING
    def log_ai_action(
        self,
        workspace_id,
        action_type,
        intent,
        confidence,
        decision,
        reason,
        metadata=None
    ):
        try:
            action = AIAction(
                workspace_id=workspace_id,
                action_type=action_type,
                intent=intent,
                confidence=confidence,
                mcp_decision=decision,
                mcp_reason=reason,
                action_metadata=metadata or {}
            )

            self.db.add(action)
            self.db.commit()

        except Exception:
            self.db.rollback()
            self.logger.error("Error logging AI action", exc_info=True)

    # INACTIVE USERS (FOLLOW-UP)
    def get_inactive_users(self, hours=24):
        try:
            now = datetime.now(timezone.utc)

            users = self.db.query(ConversationState).all()
            result = []

            for u in users:
                if not u.updated_at:
                    continue

                diff = (now - u.updated_at).total_seconds() / 3600

                if diff >= hours:
                    result.append({
                        "user_id": u.user_id,
                        "state": u
                    })

            return result

        except Exception:
            self.logger.error("Error fetching inactive users", exc_info=True)
            return []


    # TURN COUNT
    def get_turn_count(self, user_id):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"get_turn_count: invalid UUID user_id={user_id!r}, skipping")
            return 0
        try:
            history = self.get_conversation_history(user_id)
            return len(history) if history else 0
        except Exception:
            self.db.rollback()
            self.logger.error("Error getting turn count", exc_info=True)
            return 0


    # REPEAT DETECTION
    def detect_and_track_repeat(self, user_id, message):
        if not _is_valid_uuid(user_id):
            self.logger.warning(f"detect_and_track_repeat: invalid UUID user_id={user_id!r}, skipping")
            return 0

        try:
            msg_hash = hashlib.md5(
                message.strip().lower().encode()
            ).hexdigest() if message else ""

            state = self.db.query(ConversationState).filter_by(
                user_id=user_id
            ).first()

            if not state:
                state = ConversationState(
                    user_id=user_id,
                    repeat_count=0,
                    last_message_hash=msg_hash
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