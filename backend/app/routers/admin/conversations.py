from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.conversation import Conversation
from app.models.user import User
from app.models.message import Message

router = APIRouter()


@router.get("/conversations")
def get_conversations(db: Session = Depends(get_db)):

    conversations = (
        db.query(
            Conversation.id,
            User.email.label("user_email"),
            User.full_name.label("user_name"),
            Conversation.channel,
            Conversation.status,
            func.count(Message.id).label("message_count"),
            func.max(Message.timestamp).label("last_activity"),
            Conversation.created_at
        )
        .outerjoin(User, Conversation.user_id == User.id)
        .outerjoin(Message, Message.conversation_id == Conversation.id)
        .group_by(
            Conversation.id,
            User.email,
            User.full_name,
            Conversation.channel,
            Conversation.status,
            Conversation.created_at
        )
        .order_by(Conversation.created_at.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": c.id,
            "user_email": c.user_email,
            "user_name": c.user_name,
            "channel": c.channel,
            "status": c.status,
            "message_count": c.message_count,
            "created_at": c.created_at,
            "last_activity": c.last_activity
        }
        for c in conversations
    ]
