from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta


import uuid

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.impersonation import ImpersonationSession
from app.utils.auth import create_access_token
from app.routers.auth import get_current_user

router = APIRouter()

@router.post("/impersonate/{user_id}")
def create_impersonation_session(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):


    user = db.query(User).filter(User.id == user_id).first()

    if not user:
 
        raise HTTPException(status_code=404, detail="User not found")

    session_id = str(uuid.uuid4())



    session = ImpersonationSession(
        session_id=session_id,
        admin_id=current_user.id,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=60)
    )

    db.add(session)
    db.commit()



    return {
        "session_id": session_id
    }
@router.get("/impersonate/session/{session_id}")
def start_impersonation(
    session_id: str,
    db: Session = Depends(get_db)
):

    print("🚀 START IMPERSONATION SESSION")
    print("Session ID:", session_id)

    session = db.query(ImpersonationSession).filter(
        ImpersonationSession.session_id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")



    if session.used:
       raise HTTPException(status_code=400, detail="Session already used")

    if session.expires_at < datetime.now(timezone.utc):

        raise HTTPException(status_code=400, detail="Session expired")

    user = db.query(User).filter(User.id == session.user_id).first()



    workspace = db.query(Workspace).filter(
        Workspace.created_by == user.id
    ).first()


    workspace_id = str(workspace.id) if workspace else None

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "workspace_id": workspace_id,
        "impersonated": True,
        "admin_id": str(session.admin_id)
    }


    token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=15)
    )

    session.used = True
    db.commit()

    return {
        "token": token
    }