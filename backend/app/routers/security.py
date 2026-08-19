import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.routers.auth import get_current_user, CurrentUser
from app.models.user_session import UserSession
from datetime import datetime, timezone, timedelta
from typing import List
from app.core.event_bus import emit_event
from app.schemas.security import SessionResponse, SecuritySummaryResponse, RevokeDeviceRequest

logger = logging.getLogger(__name__)
router = APIRouter()



@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-expire unrevoked sessions older than 30 days with no recent activity
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        db.query(UserSession).filter(
            UserSession.user_id == current_user.id,
            UserSession.revoked_at.is_(None),
            UserSession.is_blocked == False,
            UserSession.last_activity_at < cutoff_date
        ).update({"revoked_at": datetime.now(timezone.utc)}, synchronize_session=False)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to cleanup stale sessions: {e}")
        db.rollback()

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
        
        emit_event(
            event_name="security.session_revoked",
            payload={
                "user_name": current_user.full_name or current_user.email,
                "email": current_user.email,
                "ip_address": session_entry.ip_address or "Unknown IP",
                "device_info": session_entry.device_info or "Unknown Device",
                "user_id": str(current_user.id)
            },
            actor_id=current_user.id,
            idempotency_key=f"sess_rev:{current_user.id}:{session_id}",
            db=db
        )
    except Exception as notif_exc:
        logger.error(f"Failed to emit session revocation event: {notif_exc}")

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
        emit_event(
            event_name="security.session_blocked",
            payload={
                "user_name": current_user.full_name or current_user.email,
                "email": current_user.email,
                "ip_address": session_entry.ip_address or "Unknown IP",
                "device_info": session_entry.device_info or "Unknown Device",
                "user_id": str(current_user.id)
            },
            actor_id=current_user.id,
            idempotency_key=f"sess_blk:{current_user.id}:{session_id}",
            db=db
        )
    except Exception as notif_exc:
        logger.error(f"Failed to emit session block event: {notif_exc}")

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

    # Count distinct active devices
    devices_count = db.query(func.count(func.distinct(UserSession.device_info))).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_blocked == False,
        UserSession.revoked_at.is_(None)
    ).scalar() or 0

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
        devices_count=devices_count,
        last_login_activity=last_login_activity,
        blocked_devices_count=blocked_devices_count,
        security_score=score,
        security_score_label=score_label
    )


@router.post("/sessions/revoke-device")
async def revoke_device_sessions(
    request: RevokeDeviceRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.device_info == request.device_info,
        UserSession.revoked_at.is_(None)
    ).all()

    if not sessions:
        return {"status": "success", "message": "No active sessions found for this device"}

    for s in sessions:
        s.revoked_at = now
    db.commit()

    try:
        emit_event(
            event_name="security.session_revoked",
            payload={
                "user_name": current_user.full_name or current_user.email,
                "email": current_user.email,
                "ip_address": sessions[0].ip_address or "Unknown IP",
                "device_info": request.device_info,
                "user_id": str(current_user.id)
            },
            actor_id=current_user.id,
            idempotency_key=f"signout_all:{current_user.id}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
            db=db
        )
    except Exception as notif_exc:
        logger.error(f"Failed to emit device revocation event: {notif_exc}")

    return {"status": "success", "message": f"All sessions for '{request.device_info}' have been signed out."}


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
        emit_event(
            event_name="security.session_unblocked",
            payload={
                "user_name": current_user.full_name or current_user.email,
                "email": current_user.email,
                "ip_address": session_entry.ip_address or "Unknown IP",
                "device_info": session_entry.device_info or "Unknown Device",
                "user_id": str(current_user.id)
            },
            actor_id=current_user.id,
            idempotency_key=f"sess_unblk:{current_user.id}:{session_id}",
            db=db
        )
    except Exception as notif_exc:
        logger.error(f"Failed to emit session unblock event: {notif_exc}")

    return {"status": "success", "message": "Device unblocked successfully"}
