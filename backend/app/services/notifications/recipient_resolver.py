import logging
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.ai_action import Lead
from app.core.security import to_uuid

logger = logging.getLogger("app")

# Mapping from event category to User.preferences JSON key
PREFERENCE_MAPPING = {
    "leads": "leadsAlerts",
    "lead": "leadsAlerts",
    "crm": "leadsAlerts",
    "billing": "billingAlerts",
    "payment": "billingAlerts",
    "credits": "billingAlerts",
    "ai_credits": "billingAlerts",
    "wcc": "billingAlerts",
    "wcc_wallet": "billingAlerts",
    "flow": "workflowAlerts",
    "flow_executions": "workflowAlerts",
    "usage": "usageAlerts",
    "workflow": "workflowAlerts",
    "automation": "workflowAlerts",
    "security": "securityAlerts",
    "reminder": "reminders",
    "reports": "productUpdates",
    "report": "productUpdates",
}


class ResolvedRecipient:
    def __init__(self, email: str, name: str = "User", role: str = "recipient", user_id: Optional[UUID] = None):
        self.email = email.strip().lower()
        self.name = name or "User"
        self.role = role
        self.user_id = user_id

    def to_dict(self) -> Dict[str, Any]:
        return {
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "user_id": str(self.user_id) if self.user_id else None
        }


class RecipientResolver:
    
    @classmethod
    def resolve_recipients(
        cls,
        db: Session,
        recipient_roles: List[str],
        workspace_id: Optional[UUID] = None,
        event_data: Optional[Dict[str, Any]] = None,
        event_name: str = "",
        is_critical: bool = False
    ) -> List[ResolvedRecipient]:
        if not recipient_roles:
            return []

        data = event_data or {}
        ws_id = to_uuid(workspace_id) or to_uuid(data.get("workspace_id"))
        resolved_map: Dict[str, ResolvedRecipient] = {}

        for role_spec in recipient_roles:
            role = role_spec.strip().lower()

            if role == "assigned_agent":
                cls._resolve_assigned_agent(db, ws_id, data, resolved_map)
            elif role == "workspace_owner":
                cls._resolve_workspace_owner(db, ws_id, data, resolved_map)
            elif role == "billing_contact":
                cls._resolve_billing_contact(db, ws_id, data, resolved_map)
            elif role in ("managers", "manager"):
                cls._resolve_managers(db, ws_id, resolved_map)
            elif role == "technical_contact":
                cls._resolve_technical_contact(db, ws_id, resolved_map)
            elif role in ("new_user", "current_user", "user"):
                cls._resolve_user_from_data(db, data, resolved_map)
            elif role in ("creator", "admin"):
                cls._resolve_creator(db, ws_id, data, resolved_map)
            elif "@" in role:
                # Direct email address passed in rule
                resolved_map[role] = ResolvedRecipient(email=role, name=role.split("@")[0].title(), role="custom_email")

        # Fallback to direct email in payload if no role recipients were resolved
        if not resolved_map and data.get("email") and "@" in str(data.get("email")):
            fallback_email = str(data.get("email")).strip().lower()
            u_name = data.get("user_name") or fallback_email.split("@")[0].title()
            u_id = to_uuid(data.get("user_id"))
            resolved_map[fallback_email] = ResolvedRecipient(email=fallback_email, name=u_name, role="direct_recipient", user_id=u_id)

        # Preference filter: omit users who opted out of this event category
        category = cls._get_category_from_event(event_name)
        final_recipients: List[ResolvedRecipient] = []

        for rec in resolved_map.values():
            if rec.user_id and not is_critical:
                user = db.query(User).filter(User.id == rec.user_id).first()
                if user and not cls._is_notification_enabled(user, category):
                    logger.info(f"Skipping notification for user {rec.email} (opted out of {category})")
                    continue
            final_recipients.append(rec)

        return final_recipients

    @classmethod
    def _resolve_assigned_agent(cls, db: Session, ws_id: Optional[UUID], data: Dict[str, Any], out: Dict[str, ResolvedRecipient]):
        assigned_user_id = to_uuid(data.get("assigned_to"))

        if not assigned_user_id and data.get("lead_id"):
            lead = db.query(Lead).filter(Lead.id == to_uuid(data["lead_id"])).first()
            if lead and lead.assigned_to:
                assigned_user_id = lead.assigned_to

        if assigned_user_id:
            user = db.query(User).filter(User.id == assigned_user_id).first()
            if user and user.email:
                out[user.email.lower()] = ResolvedRecipient(
                    email=user.email,
                    name=user.full_name or user.email.split("@")[0].title(),
                    role="assigned_agent",
                    user_id=user.id
                )
                return

        # Fallback to workspace owner if unassigned
        cls._resolve_workspace_owner(db, ws_id, data, out)

    @classmethod
    def _resolve_workspace_owner(cls, db: Session, ws_id: Optional[UUID], data: Dict[str, Any], out: Dict[str, ResolvedRecipient]):
        if not ws_id:
            # Fallback to payload user if workspace is unknown
            cls._resolve_user_from_data(db, data, out)
            return

        founder_member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == ws_id,
            WorkspaceMember.role.in_(["founder", "owner", "admin"])
        ).first()

        if not founder_member:
            founder_member = db.query(WorkspaceMember).filter(
                WorkspaceMember.workspace_id == ws_id
            ).first()

        if founder_member:
            user = db.query(User).filter(User.id == founder_member.user_id).first()
            if user and user.email:
                out[user.email.lower()] = ResolvedRecipient(
                    email=user.email,
                    name=user.full_name or user.email.split("@")[0].title(),
                    role="workspace_owner",
                    user_id=user.id
                )
                return

        ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
        if ws and ws.created_by:
            user = db.query(User).filter(User.id == ws.created_by).first()
            if user and user.email:
                out[user.email.lower()] = ResolvedRecipient(
                    email=user.email,
                    name=user.full_name or user.email.split("@")[0].title(),
                    role="workspace_owner",
                    user_id=user.id
                )
                return

        # Fallback to direct user in payload
        cls._resolve_user_from_data(db, data, out)

    @classmethod
    def _resolve_billing_contact(cls, db: Session, ws_id: Optional[UUID], data: Dict[str, Any], out: Dict[str, ResolvedRecipient]):
        if not ws_id:
            return

        ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
        if ws:
            if ws.billing_email:
                out[ws.billing_email.lower()] = ResolvedRecipient(
                    email=ws.billing_email,
                    name=ws.billing_contact_name or "Billing Contact",
                    role="billing_contact"
                )
                return
            if ws.billing_owner_id:
                user = db.query(User).filter(User.id == ws.billing_owner_id).first()
                if user and user.email:
                    out[user.email.lower()] = ResolvedRecipient(
                        email=user.email,
                        name=user.full_name or "Billing Contact",
                        role="billing_contact",
                        user_id=user.id
                    )
                    return

        # Fallback to workspace owner
        cls._resolve_workspace_owner(db, ws_id, data, out)

    @classmethod
    def _resolve_managers(cls, db: Session, ws_id: Optional[UUID], out: Dict[str, ResolvedRecipient]):
        if not ws_id:
            return

        members = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == ws_id,
            WorkspaceMember.role.in_(["founder", "admin", "manager"])
        ).all()

        for m in members:
            user = db.query(User).filter(User.id == m.user_id).first()
            if user and user.email:
                out[user.email.lower()] = ResolvedRecipient(
                    email=user.email,
                    name=user.full_name or user.email.split("@")[0].title(),
                    role="manager",
                    user_id=user.id
                )

    @classmethod
    def _resolve_technical_contact(cls, db: Session, ws_id: Optional[UUID], out: Dict[str, ResolvedRecipient]):
        if not ws_id:
            return

        members = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == ws_id,
            WorkspaceMember.role.in_(["admin", "founder"])
        ).all()

        for m in members:
            user = db.query(User).filter(User.id == m.user_id).first()
            if user and user.email:
                out[user.email.lower()] = ResolvedRecipient(
                    email=user.email,
                    name=user.full_name or user.email.split("@")[0].title(),
                    role="technical_contact",
                    user_id=user.id
                )

    @classmethod
    def _resolve_user_from_data(cls, db: Session, data: Dict[str, Any], out: Dict[str, ResolvedRecipient]):
        user_id = to_uuid(data.get("user_id"))
        email = data.get("email") or data.get("recipient_email")

        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.email:
                out[user.email.lower()] = ResolvedRecipient(
                    email=user.email,
                    name=user.full_name or user.email.split("@")[0].title(),
                    role="user",
                    user_id=user.id
                )
                return

        if email and "@" in str(email):
            clean_email = str(email).strip().lower()
            user = db.query(User).filter(User.email == clean_email).first()
            out[clean_email] = ResolvedRecipient(
                email=clean_email,
                name=data.get("user_name") or (user.full_name if user else clean_email.split("@")[0].title()),
                role="user",
                user_id=user.id if user else None
            )

    @classmethod
    def _resolve_creator(cls, db: Session, ws_id: Optional[UUID], data: Dict[str, Any], out: Dict[str, ResolvedRecipient]):
        creator_id = to_uuid(data.get("created_by") or data.get("user_id"))
        if creator_id:
            user = db.query(User).filter(User.id == creator_id).first()
            if user and user.email:
                out[user.email.lower()] = ResolvedRecipient(
                    email=user.email,
                    name=user.full_name or user.email.split("@")[0].title(),
                    role="creator",
                    user_id=user.id
                )
                return

        cls._resolve_workspace_owner(db, ws_id, data, out)

    @staticmethod
    def _get_category_from_event(event_name: str) -> str:
        prefix = event_name.split(".")[0].lower() if "." in event_name else event_name.lower()
        return prefix

    @staticmethod
    def _is_notification_enabled(user: User, category: str) -> bool:
        if not user.preferences:
            return True
        pref_key = PREFERENCE_MAPPING.get(category)
        if not pref_key:
            return True
        return bool(user.preferences.get(pref_key, True))
