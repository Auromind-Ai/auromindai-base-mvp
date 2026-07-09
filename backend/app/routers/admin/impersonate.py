from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import uuid
import json
import logging

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.impersonation import ImpersonationSession
from app.utils.auth import create_access_token
from app.routers.auth import CurrentUser, get_current_user
from app.core.deps import require_platform_admin_session
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

def _get_redis_client():
    try:
        import redis
        return redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
    except Exception as e:
        logger.warning(f"Redis client connection error: {e}")
        return None

@router.post("/switch-user/{user_id}")
def create_impersonation_session(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_admin: CurrentUser = Depends(require_platform_admin_session)
):
    logger.info(
        f"[BACKEND DEBUG] POST /switch-user/{user_id} | "
        f"Requesting Admin ID: {current_admin.id} | "
        f"Admin Role: {getattr(current_admin, 'role', None) or getattr(current_admin, 'platform_role', None)} | "
        f"Is Impersonated: {getattr(current_admin, 'impersonated', False)}"
    )
    # Task 2: Prevent nested impersonation
    if getattr(current_admin, "impersonated", False):
        raise HTTPException(status_code=400, detail="Already impersonating")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    admin = current_admin.user
    if not admin:
        raise HTTPException(status_code=404, detail="Platform admin not found")

    logger.info(f"Creating impersonation session for user {user_id} by admin {admin.id}")
    session_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    session = ImpersonationSession(
        session_id=session_id,
        admin_id=admin.id,
        user_id=user.id,
        expires_at=expires_at
    )

    try:
        db.add(session)
        db.commit()
        logger.info("Impersonation session saved to database")
    except Exception as e:
        logger.error(f"Failed to save impersonation session to database: {e}")
        db.rollback()
    
    # Task 3: Use Redis session storage instead of in-memory SESSION_CACHE
    r_client = _get_redis_client()
    if r_client:
        try:
            r_client.setex(
                f"impersonation_session:{session_id}",
                300,  # 5 minutes TTL
                json.dumps({
                    "admin_id": str(admin.id),
                    "user_id": str(user.id),
                    "expires_at": expires_at.isoformat()
                })
            )
            logger.info(f"Impersonation session saved to Redis key impersonation_session:{session_id}")
        except Exception as e:
            logger.error(f"Failed to save impersonation session to Redis: {e}")

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
    logger.info(
        f"[BACKEND DEBUG] GET /switch-user/session/{session_id} | "
        f"Cookies: {request.cookies} | "
        f"Headers: {dict(request.headers)}"
    )
    logger.info(f"Consuming impersonation session {session_id}")
    redis_key = f"impersonation_session:{session_id}"
    r_client = _get_redis_client()

    admin_id = None
    user_id = None
    expires_at = None

    # Task 5: Make consumption atomic via database row locking (with_for_update)
    session = None
    try:
        session = db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == str(session_id)
        ).with_for_update().first()
    except Exception as e:
        logger.error(f"Failed to query database for session: {e}")
        db.rollback()

    if session:
        if session.used:
            db.rollback()
            raise HTTPException(status_code=400, detail="Session already used")
        
        admin_id = session.admin_id
        user_id = session.user_id
        expires_at = session.expires_at

        # Atomically mark as used in DB
        session.used = True
        db.commit()

        # Clean up Redis key if present
        if r_client:
            try:
                r_client.delete(redis_key)
            except Exception:
                pass
    elif r_client:
        # Atomic consumption via Redis getdel or pipeline
        try:
            cached_raw = None
            if hasattr(r_client, "getdel"):
                cached_raw = r_client.getdel(redis_key)
            else:
                pipe = r_client.pipeline()
                pipe.get(redis_key)
                pipe.delete(redis_key)
                res = pipe.execute()
                cached_raw = res[0]

            if cached_raw:
                cached = json.loads(cached_raw)
                admin_id = cached["admin_id"]
                user_id = cached["user_id"]
                expires_at = cached["expires_at"]
                logger.info(f"Used cached Redis impersonation session for user {user_id}")
        except Exception as e:
            logger.error(f"Redis session retrieval failed: {e}")

    if not admin_id or not user_id:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    if expires_at:
        if isinstance(expires_at, str):
            try:
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except Exception:
                pass
        
        if isinstance(expires_at, datetime):
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Session expired")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Impersonated user not found")

    # Task 4: Fix workspace lookup to match AuthService.login resolution
    workspaces = db.query(Workspace, WorkspaceMember.role).join(
        WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id
    ).filter(WorkspaceMember.user_id == user.id).all()

    workspace_id = str(workspaces[0][0].id) if workspaces else None

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

    # Preserve any existing backup token; otherwise store original admin token
    existing_backup = request.cookies.get("admin_backup_token")
    admin_token = existing_backup or request.cookies.get("auth_token")

    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
    )
    cookie_samesite = "none" if is_https else "lax"
    
    cookie_domain = None
    request_host = request.url.hostname
    if settings.FRONTEND_URL and request_host:
        from urllib.parse import urlparse
        parsed = urlparse(settings.FRONTEND_URL)
        if parsed.hostname and (request_host == parsed.hostname or request_host.endswith("." + parsed.hostname)):
            parts = parsed.hostname.split(".")
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
            max_age=60 * 15,
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
        max_age=60 * 15,
        domain=cookie_domain,
    )

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.full_name if hasattr(user, 'full_name') and user.full_name else user.email.split('@')[0]
        }
    }
