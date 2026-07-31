import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current_user, CurrentUser
from app.models.user_session import UserSession
from datetime import datetime, timezone
from typing import List
from app.schemas.security import SessionResponse, SecuritySummaryResponse

logger = logging.getLogger(__name__)
router = APIRouter()



@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).filter(
        (UserSession.revoked_at.is_(None)) | (UserSession.is_blocked == True)
    ).order_by(UserSession.last_activity_at.desc()).all()

    result = []
    for s in sessions:
        is_current = (current_user.session_id == s.id)
        result.append(SessionResponse(
            id=s.id,
            device_info=s.device_info,
            ip_address=s.ip_address,
            location=s.location,
            is_blocked=s.is_blocked,
            created_at=s.created_at,
            last_activity_at=s.last_activity_at,
            is_current=is_current
        ))
    return result

@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_entry = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not session_entry:
        raise HTTPException(status_code=404, detail="Session not found")

    session_entry.revoked_at = datetime.now(timezone.utc)
    db.commit()

    try:
        from app.services.notification_service import NotificationService
        NotificationService.notify(
            db=db,
            user_id=current_user.id,
            workspace_id=None,
            type="security_alert",
            title=None,
            message=None,
            template_key="session_revoked",
            variables={
                "user_name": current_user.full_name or current_user.email,
                "ip_address": session_entry.ip_address or "Unknown IP",
                "device_info": session_entry.device_info or "Unknown Device"
            }
        )
    except Exception as notif_exc:
        logger.error(f"Failed to send session revocation notification: {notif_exc}")

    return {"status": "success", "message": "Session revoked successfully"}

@router.post("/sessions/{session_id}/block")
async def block_session(
    session_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_entry = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not session_entry:
        raise HTTPException(status_code=404, detail="Session not found")

    session_entry.is_blocked = True
    session_entry.revoked_at = datetime.now(timezone.utc)
    db.commit()

    try:
        from app.services.notification_service import NotificationService
        NotificationService.notify(
            db=db,
            user_id=current_user.id,
            workspace_id=None,
            type="security_alert",
            title=None,
            message=None,
            template_key="session_blocked",
            variables={
                "user_name": current_user.full_name or current_user.email,
                "ip_address": session_entry.ip_address or "Unknown IP",
                "device_info": session_entry.device_info or "Unknown Device"
            }
        )
    except Exception as notif_exc:
        logger.error(f"Failed to send session block notification: {notif_exc}")

    return {"status": "success", "message": "Session and device blocked successfully"}

@router.get("/security-summary", response_model=SecuritySummaryResponse)
async def get_security_summary(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Count active sessions
    active_sessions_count = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_blocked == False,
        UserSession.revoked_at.is_(None)
    ).count()

    # Blocked sessions/devices count
    blocked_devices_count = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_blocked == True
    ).count()

    # Get last session created for activity
    last_session = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.revoked_at.is_(None)
    ).order_by(UserSession.created_at.desc()).first()

    last_login_activity = "No recent activity"
    if last_session:
        # Calculate time diff
        diff = datetime.now(timezone.utc) - last_session.created_at
        seconds = diff.total_seconds()
        if seconds < 60:
            last_login_activity = "Just now"
        elif seconds < 3600:
            last_login_activity = f"{int(seconds // 60)} minutes ago"
        elif seconds < 86400:
            last_login_activity = f"{int(seconds // 3600)} hours ago"
        else:
            last_login_activity = f"{int(seconds // 86400)} days ago"

    # Security score logic:
    # Base: 30
    # Password set OR auth_provider == "google": +40
    # Clean history (no blocked devices/sessions): +30
    score = 30
    
    password_or_oauth = False
    if current_user.user.password_hash and current_user.user.password_hash != "$2b$12$dummyhashforemailtestingonly":
        password_or_oauth = True
    
    auth_provider = (current_user.user.preferences or {}).get("auth_provider")
    if auth_provider == "google":
        password_or_oauth = True

    if password_or_oauth:
        score += 40

    if blocked_devices_count == 0:
        score += 30

    # Score labels: Weak (<50), Moderate (50-79), Strong (80+)
    score_label = "Weak"
    if score >= 80:
        score_label = "Strong"
    elif score >= 50:
        score_label = "Moderate"

    return SecuritySummaryResponse(
        active_sessions_count=active_sessions_count,
        last_login_activity=last_login_activity,
        blocked_devices_count=blocked_devices_count,
        security_score=score,
        security_score_label=score_label
    )


@router.post("/sessions/{session_id}/unblock")
async def unblock_session(
    session_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_entry = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not session_entry:
        raise HTTPException(status_code=404, detail="Session not found")

    session_entry.is_blocked = False
    db.commit()

    try:
        from app.services.notification_service import NotificationService
        NotificationService.notify(
            db=db,
            user_id=current_user.id,
            workspace_id=None,
            type="security_alert",
            title=None,
            message=None,
            template_key="session_unblocked",
            variables={
                "user_name": current_user.full_name or current_user.email,
                "ip_address": session_entry.ip_address or "Unknown IP",
                "device_info": session_entry.device_info or "Unknown Device"
            }
        )
    except Exception as notif_exc:
        logger.error(f"Failed to send session unblock notification: {notif_exc}")

    return {"status": "success", "message": "Device unblocked successfully"}
