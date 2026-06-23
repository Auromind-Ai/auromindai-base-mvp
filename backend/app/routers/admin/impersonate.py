from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Response
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

# In-memory fallback for environments with DB restrictions
SESSION_CACHE = {}

@router.post("/switch-user/{user_id}")
def create_impersonation_session(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    admin = db.query(User).order_by(User.created_at.asc()).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Platform admin not found")

    print(f"🚀 CREATING IMPERSONATION SESSION for user {user_id}")
    session_id = str(uuid.uuid4())
    print(f"🧠 Generated Session ID: {session_id}")

    session = ImpersonationSession(
        session_id=session_id,
        admin_id=admin.id,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )

    try:
        db.add(session)
        db.commit()
        print("Session saved to DB")
    except Exception as e:
        print(f"⚠️ FAILED to save session to DB (using in-memory fallback): {e}")
        db.rollback()
    
    # Always save to in-memory fallback to be safe
    SESSION_CACHE[session_id] = {
        "admin_id": str(admin.id),
        "user_id": str(user.id),
        "expires_at": session.expires_at
    }

    return {
        "session_id": session_id
    }

@router.get("/switch-user/session/{session_id}")
def start_impersonation(
    session_id: UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):

    print("🚀 START IMPERSONATION SESSION")
    print("Session ID:", session_id)

    # Try DB first
    session = None
    try:
        session = db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == str(session_id)
        ).first()
    except Exception as e:
        print(f"⚠️ FAILED to query DB for session: {e}")
        db.rollback()

    admin_id = None
    user_id = None
    expires_at = None

    if session:
        if session.used:
            raise HTTPException(status_code=400, detail="Session already used")
        admin_id = session.admin_id
        user_id = session.user_id
        expires_at = session.expires_at
    elif str(session_id) in SESSION_CACHE:
        cached = SESSION_CACHE.pop(str(session_id)) # One-time use
        admin_id = cached["admin_id"]
        user_id = cached["user_id"]
        expires_at = cached["expires_at"]
        print(f"📦 Using cached session for {user_id}")
    
    if not admin_id or not user_id:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if expires_at:
        # Ensure we have a datetime object for comparison
        if isinstance(expires_at, str):
            try:
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except:
                pass
        
        if isinstance(expires_at, datetime) and expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Session expired")

    user = db.query(User).filter(User.id == user_id).first()

    workspace = db.query(Workspace).filter(
        Workspace.created_by == user.id
    ).first()

    workspace_id = str(workspace.id) if workspace else None

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "workspace_id": workspace_id,
        "impersonated": True,
        "admin_id": str(admin_id)
    }

    token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=15)
    )

    if session:
        session.used = True
        db.commit()

    admin_token = request.cookies.get("auth_token")
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    cookie_samesite = "none" if is_https else "lax"
    
    # Extract domain for cookie sharing between frontend and backend on subdomains
    from app.core.config import settings
    cookie_domain = None
    if settings.FRONTEND_URL:
        from urllib.parse import urlparse
        parsed = urlparse(settings.FRONTEND_URL)
        if parsed.hostname:
            parts = parsed.hostname.split(".")
            # Ignore IP addresses and localhost
            if len(parts) >= 2 and not parsed.hostname.replace(".", "").isdigit() and "localhost" not in parsed.hostname:
                cookie_domain = "." + ".".join(parts[-2:])
    
    # Store admin token in backup cookie
    if admin_token:
        response.set_cookie(
            key="admin_backup_token",
            value=admin_token,
            httponly=True,
            secure=is_https,
            samesite=cookie_samesite,
            path="/",
            max_age=60 * 15,  # 15 minutes, matches user token expiration or duration of impersonation
            domain=cookie_domain,
        )

    # Set auth_token to impersonated user token
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=is_https,
        samesite=cookie_samesite,
        path="/",
        max_age=60 * 15,  # 15 minutes
        domain=cookie_domain,
    )

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.full_name if hasattr(user, 'full_name') else user.email.split('@')[0]
        }
    }
