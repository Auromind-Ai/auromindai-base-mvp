from __future__ import annotations
from datetime import datetime
from typing import Any
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models.conversation import ChannelType, Conversation, ConversationStatus
from app.models.workspace import Workspace
from app.core.security import to_uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, or_
from app.models.message import Message, SenderType
from app.models.ai_action import Lead



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
        val = str(channel).upper()
        if val in ("SMS", "PHONE"):
            return ChannelType.TWILIO
        try:
            return ChannelType[val]
        except KeyError as exc:
            raise HTTPException(status_code=400, detail=f"Unsupported channel: {channel}") from exc

    @staticmethod
    def get_workspace_for_twilio_number(
        db: Session, to_number: str, account_sid: str | None = None
    ) -> Workspace | None:
        clean_number = (to_number or "").replace("whatsapp:", "").strip()
        possible_numbers = {
            clean_number,
            f"+{clean_number.lstrip('+')}",
            clean_number.lstrip("+"),
        }
        workspaces = (
            db.query(Workspace)
            .filter(Workspace.twilio_phone_number.in_(possible_numbers))
            .limit(2)
            .all()
        )
        if workspaces:
            if len(workspaces) > 1:
                raise HTTPException(
                    status_code=409,
                    detail=f"Multiple workspaces mapped for Twilio number {clean_number}",
                )
            return workspaces[0]

        if account_sid:
            ws_by_sid = (
                db.query(Workspace)
                .filter(Workspace.twilio_account_sid == account_sid)
                .first()
            )
            if ws_by_sid:
                return ws_by_sid

        return None

    @staticmethod
    def get_workspace_for_meta_whatsapp_phone_number_id(
        db: Session,
        phone_number_id: str,
    ) -> Workspace | None:
        workspace = (
            db.query(Workspace)
            .filter(Workspace.meta_phone_number_id == phone_number_id)
            .first()
        )
        if not workspace:
            return None
        return workspace

    @staticmethod
    def get_workspace_for_instagram_account(
        db: Session,
        instagram_account_id: str,
    ) -> Workspace | None:
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
            return None
        return workspace

    @staticmethod
    def list_conversations(
        db: Session,
        *,
        workspace_id: str | UUID,
        channel: str | ChannelType | None = None,
        status: str | None = "OPEN",
        skip: int = 0,
        limit: int = 100,
    ):
        ws_uuid = to_uuid(workspace_id)
        query = db.query(Conversation).filter(Conversation.workspace_id == ws_uuid)
        if channel:
            query = query.filter(
                Conversation.channel == ConversationService.normalize_channel(channel)
            )

        if status:
            st = status.upper().strip()
            if st == "OPEN":
                query = query.filter(Conversation.status == ConversationStatus.OPEN)
            elif st == "CONVERTED":
                query = query.outerjoin(Lead, Lead.conversation_id == Conversation.id).filter(
                    or_(
                        Conversation.status == ConversationStatus.CONVERTED,
                        Lead.is_converted == True,
                        Lead.status == "converted"
                    )
                ).distinct()
            elif st == "CLOSED":
                cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
                query = query.filter(
                    Conversation.status == ConversationStatus.CLOSED,
                    func.coalesce(Conversation.closed_at, Conversation.updated_at) <= cutoff
                )
            elif st == "UNREAD":
                unread_conv_subq = (
                    db.query(Message.conversation_id)
                    .filter(
                        Message.is_read == False,
                        Message.sender_type == SenderType.USER
                    )
                    .distinct()
                )
                query = query.filter(Conversation.id.in_(unread_conv_subq))
            elif st != "ALL":
                query = query.filter(Conversation.status == st)

        conversations = (
            query.order_by(Conversation.updated_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Deduplicate results by ID to guarantee uniqueness
        unique_map = {}
        for c in conversations:
            if c.id not in unique_map:
                unique_map[c.id] = c
        conversations = list(unique_map.values())

        if conversations:
            conv_ids = [c.id for c in conversations]
            counts = dict(
                db.query(Message.conversation_id, func.count(Message.id))
                .filter(Message.conversation_id.in_(conv_ids))
                .group_by(Message.conversation_id)
                .all()
            )
            unread_counts = dict(
                db.query(Message.conversation_id, func.count(Message.id))
                .filter(
                    Message.conversation_id.in_(conv_ids),
                    Message.is_read == False,
                    Message.sender_type == SenderType.USER,
                )
                .group_by(Message.conversation_id)
                .all()
            )
            latest_msg_subq = (
                db.query(
                    Message.conversation_id,
                    func.max(Message.timestamp).label("max_ts"),
                )
                .filter(Message.conversation_id.in_(conv_ids))
                .group_by(Message.conversation_id)
                .subquery()
            )
            latest_messages = (
                db.query(Message.conversation_id, Message.content)
                .join(
                    latest_msg_subq,
                    (Message.conversation_id == latest_msg_subq.c.conversation_id)
                    & (Message.timestamp == latest_msg_subq.c.max_ts),
                )
                .all()
            )
            last_msg_map = {row[0]: row[1] for row in latest_messages}

            for c in conversations:
                c.__dict__['message_count'] = counts.get(c.id, 0)
                c.__dict__['unread_count'] = unread_counts.get(c.id, 0)
                c.__dict__['last_message'] = last_msg_map.get(c.id, '')
                c.__dict__['last_message_text'] = last_msg_map.get(c.id, '')
        return conversations

    @staticmethod
    def get_conversation_counts(
        db: Session,
        *,
        workspace_id: str | UUID,
        channel: str | ChannelType | None = None,
    ) -> dict[str, int]:
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import func, or_
        from app.models.message import Message, SenderType
        from app.models.ai_action import Lead

        ws_uuid = to_uuid(workspace_id)
        base_query = db.query(Conversation).filter(Conversation.workspace_id == ws_uuid)
        if channel:
            base_query = base_query.filter(
                Conversation.channel == ConversationService.normalize_channel(channel)
            )

        # 1. Total (All)
        all_count = base_query.count()

        # 2. Open
        open_count = base_query.filter(Conversation.status == ConversationStatus.OPEN).count()

        # 3. Converted
        converted_count = (
            base_query.outerjoin(Lead, Lead.conversation_id == Conversation.id)
            .filter(
                or_(
                    Conversation.status == ConversationStatus.CONVERTED,
                    Lead.is_converted == True,
                    Lead.status == "converted"
                )
            )
            .distinct()
            .count()
        )

        # 4. Closed (closed >= 24 hours ago)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        closed_count = base_query.filter(
            Conversation.status == ConversationStatus.CLOSED,
            func.coalesce(Conversation.closed_at, Conversation.updated_at) <= cutoff
        ).count()

        # 5. Unread
        unread_conv_subq = (
            db.query(Message.conversation_id)
            .filter(
                Message.is_read == False,
                Message.sender_type == SenderType.USER
            )
            .distinct()
        )
        unread_count = base_query.filter(Conversation.id.in_(unread_conv_subq)).count()

        return {
            "all": all_count,
            "open": open_count,
            "unread": unread_count,
            "converted": converted_count,
            "closed": closed_count,
        }

    @staticmethod
    def get_conversation_or_404(
        db: Session,
        *,
        workspace_id: str | UUID,
        conversation_id: str | UUID,
    ) -> Conversation:
        ws_uuid = to_uuid(workspace_id)
        conv_uuid = to_uuid(conversation_id)
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == conv_uuid,
                Conversation.workspace_id == ws_uuid,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    @staticmethod
    def get_first_workspace_conversation(db: Session, workspace_id: str | UUID) -> Conversation | None:
        ws_uuid = to_uuid(workspace_id)
        return (
            db.query(Conversation)
            .filter(Conversation.workspace_id == ws_uuid)
            .order_by(Conversation.updated_at.desc())
            .first()
        )

    @staticmethod
    def _build_lookup_filters(
        workspace_id: str | UUID,
        normalized_channel: ChannelType,
        delivery_target: str | None,
        external_id: str | None,
    ) -> list[Any]:
        from app.core.security import to_uuid
        ws_uuid = to_uuid(workspace_id)
        filters: list[Any] = [
            Conversation.workspace_id == ws_uuid,
            Conversation.channel == normalized_channel,
        ]
        if normalized_channel == ChannelType.INSTAGRAM:
            filters.append(Conversation.external_id == external_id)
        else:
            if delivery_target:
                clean_target = delivery_target.strip().lstrip("+")
                possible_phones = [delivery_target, f"+{clean_target}", clean_target]
                filters.append(Conversation.phone.in_(possible_phones))
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
        delivery_target = phone
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
                is_new_numeric = contact_name.isdigit()
                is_old_numeric = conversation.contact_name and conversation.contact_name.isdigit()
                if not conversation.contact_name or is_old_numeric or not is_new_numeric:
                    conversation.contact_name = contact_name
            if profile_pic:
                conversation.profile_pic = profile_pic
            db.flush()
            return conversation

      
        try:
            ws_uuid = to_uuid(workspace_id)
            with db.begin_nested():
                conversation = Conversation(
                    phone=delivery_target,
                    workspace_id=ws_uuid,
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

    # @staticmethod
    # def get_or_create_web_conversation(
    #     db: Session,
    #     *,
    #     workspace_id: str,
    #     conversation_id: str,
    #     user_id: str,
    #     contact_name: str | None = None,
    # ) -> Conversation:
    #     conversation = (
    #         db.query(Conversation)
    #         .filter(
    #             Conversation.id == conversation_id,
    #             Conversation.workspace_id == workspace_id,
    #         )
    #         .first()
    #     )
    #     if conversation:
    #         return conversation

    #     conversation = Conversation(
    #         id=UUID(str(conversation_id)),
    #         user_id=UUID(str(user_id)),
    #         contact_name=contact_name or "Unknown",
    #         workspace_id=workspace_id,
    #         channel=ChannelType.WEB,
    #         external_id=f"web:{user_id}",
    #         created_at=datetime.utcnow(),
    #         updated_at=datetime.utcnow(),
    #     )
    #     db.add(conversation)
    #     db.flush()
    #     return conversation
