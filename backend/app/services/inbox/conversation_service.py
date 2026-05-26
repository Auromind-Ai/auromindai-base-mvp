
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.conversation import ChannelType, Conversation
from app.models.workspace import Workspace


class ConversationService:
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

    @staticmethod
    def normalize_channel(channel: ChannelType | str) -> ChannelType:
        if isinstance(channel, ChannelType):
            return channel
        try:
            return ChannelType[str(channel).upper()]
        except KeyError as exc:
            raise HTTPException(status_code=400, detail=f"Unsupported channel: {channel}") from exc

    @staticmethod
    def get_workspace_for_twilio_number(db: Session, to_number: str) -> Workspace:
        clean_number = (to_number or "").replace("whatsapp:", "").strip()
        workspaces = (
            db.query(Workspace)
            .filter(Workspace.twilio_phone_number == clean_number)
            .limit(2)
            .all()
        )
        if not workspaces:
            raise HTTPException(
                status_code=404,
                detail=f"No workspace mapped for Twilio number {clean_number}",
            )
        if len(workspaces) > 1:
            raise HTTPException(
                status_code=409,
                detail=f"Multiple workspaces mapped for Twilio number {clean_number}",
            )
        return workspaces[0]

    @staticmethod
    def get_workspace_for_meta_whatsapp_phone_number_id(
        db: Session,
        phone_number_id: str,
    ) -> Workspace:
        workspace = (
            db.query(Workspace)
            .filter(Workspace.meta_phone_number_id == phone_number_id)
            .first()
        )
        if not workspace:
            raise HTTPException(
                status_code=404,
                detail=f"No workspace mapped for Meta WhatsApp phone number {phone_number_id}",
            )
        return workspace

    @staticmethod
    def get_workspace_for_instagram_account(
        db: Session,
        instagram_account_id: str,
    ) -> Workspace:
        workspace = (
            db.query(Workspace)
            .filter(
                or_(
                    Workspace.meta_ig_id == instagram_account_id,
                    Workspace.meta_business_id == instagram_account_id,
                )
            )
            .first()
        )
        if not workspace:
            raise HTTPException(
                status_code=404,
                detail=f"No workspace mapped for Instagram account {instagram_account_id}",
            )
        return workspace

    @staticmethod
    def list_conversations(
        db: Session,
        *,
        workspace_id: str,
        channel: str | ChannelType | None = None,
        skip: int = 0,
        limit: int = 100,
    ):
        query = db.query(Conversation).filter(Conversation.workspace_id == workspace_id)
        if channel:
            query = query.filter(
                Conversation.channel == ConversationService.normalize_channel(channel)
            )
        return (
            query.order_by(Conversation.updated_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_conversation_or_404(
        db: Session,
        *,
        workspace_id: str,
        conversation_id: str | UUID,
    ) -> Conversation:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.workspace_id == workspace_id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    @staticmethod
    def get_first_workspace_conversation(db: Session, workspace_id: str) -> Conversation | None:
        return (
            db.query(Conversation)
            .filter(Conversation.workspace_id == workspace_id)
            .order_by(Conversation.updated_at.desc())
            .first()
        )

    @staticmethod
    def _build_lookup_filters(
        workspace_id: str,
        normalized_channel: ChannelType,
        delivery_target: str | None,
        external_id: str | None,
    ) -> list[Any]:
        filters: list[Any] = [
            Conversation.workspace_id == workspace_id,
            Conversation.channel == normalized_channel,
        ]
        if normalized_channel == ChannelType.INSTAGRAM:
            filters.append(Conversation.external_id == external_id)
        else:
            filters.append(Conversation.phone == delivery_target)
        return filters

    @staticmethod
    def get_or_create_conversation(
        db: Session,
        *,
        workspace_id: str,
        channel: ChannelType | str,
        phone: str | None = None,
        external_id: str | None = None,
        contact_name: str | None = None,
        profile_pic: str | None = None,
        user_id: str | None = None,
    ) -> Conversation:
        normalized_channel = ConversationService.normalize_channel(channel)
        delivery_target = phone or (external_id if normalized_channel == ChannelType.INSTAGRAM else None)
        resolved_user_id = ConversationService._maybe_uuid(user_id)

        filters = ConversationService._build_lookup_filters(
            workspace_id, normalized_channel, delivery_target, external_id
        )

        conversation = db.query(Conversation).filter(*filters).first()
        if conversation:
            conversation.updated_at = datetime.utcnow()
            if delivery_target and not conversation.phone:
                conversation.phone = delivery_target
            if external_id and not conversation.external_id:
                conversation.external_id = external_id
            if contact_name:
                conversation.contact_name = contact_name
            if profile_pic:
                conversation.profile_pic = profile_pic
            db.flush()
            return conversation

        #  Race-safe insert using a savepoint 
        # begin_nested() creates a SAVEPOINT so that an IntegrityError from a
        # concurrent INSERT only rolls back to the savepoint, not the entire
        # transaction.  This prevents discarding unrelated pending changes.
        try:
            with db.begin_nested():
                conversation = Conversation(
                    phone=delivery_target,
                    workspace_id=workspace_id,
                    channel=normalized_channel,
                    external_id=external_id,
                    contact_name=contact_name,
                    profile_pic=profile_pic,
                    user_id=resolved_user_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(conversation)
                db.flush()
            return conversation
        except IntegrityError:
            # Another worker beat us to it — fetch the row they inserted.
            existing = db.query(Conversation).filter(*filters).first()
            if existing:
                return existing
            raise

    @staticmethod
    def get_or_create_web_conversation(
        db: Session,
        *,
        workspace_id: str,
        conversation_id: str,
        user_id: str,
        contact_name: str | None = None,
    ) -> Conversation:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.workspace_id == workspace_id,
            )
            .first()
        )
        if conversation:
            return conversation

        conversation = Conversation(
            id=UUID(str(conversation_id)),
            user_id=ConversationService._maybe_uuid(user_id),
            contact_name=contact_name or "Unknown",
            workspace_id=workspace_id,
            channel=ChannelType.WEB,
            external_id=f"web:{user_id}",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(conversation)
        db.flush()
        return conversation
