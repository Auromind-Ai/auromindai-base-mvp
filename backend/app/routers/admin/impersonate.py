from datetime import datetime, timedelta, timezone
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.impersonation import ImpersonationSession
from app.models.user import User
from app.models.workspace import Workspace
from app.routers.auth import get_current_user
from app.utils.auth import create_access_token
from app.core.config import settings

router = APIRouter()


@router.post("/impersonate/{user_id}")
def create_impersonation_session(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session = ImpersonationSession(
        session_id=str(uuid.uuid4()),
        admin_id=current_user.id,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )

    try:
        db.add(session)
        db.commit()
        db.refresh(session)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create impersonation session")

    return {"session_id": session.session_id}


@router.get("/impersonate/session/{session_id}")
def start_impersonation(
    session_id: UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    session = (
        db.query(ImpersonationSession)
        .filter(ImpersonationSession.session_id == str(session_id))
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    if session.used:
        raise HTTPException(status_code=400, detail="Session already used")
    if session.expires_at and session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Session expired")

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    workspace = db.query(Workspace).filter(Workspace.created_by == user.id).first()
    workspace_id = str(workspace.id) if workspace else None

    # Retrieve current admin/owner token from the cookie (or Auth header)
    admin_token = request.cookies.get("auth_token")
    if not admin_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            admin_token = auth_header.replace("Bearer ", "")

    token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "workspace_id": workspace_id,
            "impersonated": True,
            "admin_id": str(session.admin_id),
        },
        expires_delta=timedelta(minutes=15),
    )

    session.used = True
    db.commit()

    IS_PROD = settings.ENVIRONMENT == "production"
    
    # Store admin token in backup cookie
    if admin_token:
        response.set_cookie(
            key="admin_backup_token",
            value=admin_token,
            httponly=True,
            secure=IS_PROD,
            samesite="strict" if IS_PROD else "lax",
            path="/",
            max_age=60 * 15,  # 15 minutes, matches user token expiration or duration of impersonation
        )

    # Set auth_token to impersonated user token
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=IS_PROD,
        samesite="strict" if IS_PROD else "lax",
        path="/",
        max_age=60 * 15,  # 15 minutes
    )

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.full_name if hasattr(user, "full_name") else user.email.split("@")[0],
            "workspace_id": workspace_id,
            "impersonated": True
        },
    }
