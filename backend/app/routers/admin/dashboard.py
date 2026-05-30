from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.workspace import Workspace
from app.models.user import User
from app.models.conversation import Conversation
from app.core.metrics import get_metrics

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(db: Session = Depends(get_db)):

    metrics = get_metrics()

    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()

    total_workspaces = db.query(func.count(Workspace.id)).scalar()

    total_conversations = db.query(func.count(Conversation.id)).scalar()
    active_conversations = db.query(func.count(Conversation.id)).filter(
        Conversation.status == "OPEN"
    ).scalar()

    # Recent Workspaces
    recent_workspaces = (
        db.query(
            Workspace.id,
            Workspace.name,
            User.email,
            User.is_active
        )
        .join(User, Workspace.created_by == User.id)
        .order_by(Workspace.created_at.desc())
        .limit(5)
        .all()
    )

    # Recent Conversations
    recent_conversations = (
        db.query(
            Conversation.id,
            User.email,
            Conversation.status
        )
        .join(User, Conversation.user_id == User.id)
        .order_by(Conversation.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "users": {
            "total": total_users,
            "active": active_users
        },
        "workspaces": {
            "total": total_workspaces
        },
        "conversations": {
            "total": total_conversations,
            "active": active_conversations
        },

        "recent_workspaces": [
            {
                "id": str(w.id),
                "name": w.name,
                "owner_email": w.email,
                "is_active": w.is_active,
            }
            for w in recent_workspaces
        ],

        "recent_conversations": [
            {
                "id": str(c.id),
                "user_email": c.email,
                "status": c.status
            }
            for c in recent_conversations
        ],

        "analytics": {
            "api_calls_today": metrics["total_api_calls"],
            "avg_response_time": metrics["avg_response_time"],
            "error_rate": metrics["error_rate"],
            "uptime_percent": 99.9,
            "total_token_usage": 523400,
            "total_revenue": 32000
        }
    }