from __future__ import annotations
import uuid
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.conversation import ChatSession, ChatMessage
from app.core.security import to_uuid


class SessionService:

    @staticmethod
    def get_sessions(
        db: Session,
        user_id: str,
        workspace_id: str,
        skip: int,
        limit: int,
    ) -> list[ChatSession]:
        return (
            db.query(ChatSession)
            .filter(
                ChatSession.workspace_id == to_uuid(workspace_id),
                ChatSession.user_id == to_uuid(user_id),
            )
            .order_by(ChatSession.updated_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def create_session(
        db: Session,
        user_id: str,
        workspace_id: str,
        title: str,
    ) -> ChatSession:
        session = ChatSession(
            id=uuid.uuid4(),          # ← UUID object, not str
            workspace_id=to_uuid(workspace_id),
            user_id=to_uuid(user_id),
            title=title,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_session_or_404(
        db: Session,
        session_id: UUID,
        user_id: str,
        workspace_id: str,
    ) -> ChatSession:
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == to_uuid(session_id),
                ChatSession.user_id == to_uuid(user_id),
                ChatSession.workspace_id == to_uuid(workspace_id),
            )
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

    @staticmethod
    def get_messages(db: Session, session_id: UUID) -> list[ChatMessage]:
        return (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )

    @staticmethod
    def delete_session(db: Session, session: ChatSession) -> None:
        db.delete(session)
        db.commit()

    @staticmethod
    def update_title(db: Session, session: ChatSession, title: str) -> ChatSession:
        session.title = title
        db.commit()
        return session