from sqlalchemy.orm import Session
from app.models import User, UserSession
from app.models.workspace import Workspace, WorkspaceMember
from app.utils.auth import get_password_hash, verify_password, create_access_token
from app.services.platform_settings_service import get_setting
import uuid
import time
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from app.utils.auth import parse_user_agent
from app.services.notification_template_service import NotificationTemplateService

_redis_instance = None

def _get_redis_client():
    global _redis_instance
    if _redis_instance is not None:
        return _redis_instance
    try:
        import redis
        from app.core.config import settings
        if settings.REDIS_URL:
            _redis_instance = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
                health_check_interval=30,
                retry_on_timeout=True,
            )
            return _redis_instance
    except Exception:
        pass
    return None

_in_memory_otp_store: Dict[str, Dict[str, Any]] = {}

# In-memory fallbacks for login attempt tracking & device notification cooldowns
_FAILED_ATTEMPTS_STORE = {}
_LOCKOUT_STORE = {}
_DEVICE_COOLDOWN_STORE = {}

class AuthService:

    @staticmethod
    def is_locked_out(email: str) -> bool:
        r = _get_redis_client()
        if r:
            try:
                return bool(r.exists(f"lockout:{email}"))
            except Exception:
                pass
        now = datetime.now(timezone.utc)
        lock_until = _LOCKOUT_STORE.get(email)
        if lock_until and now < lock_until:
            return True
        elif lock_until:
            _LOCKOUT_STORE.pop(email, None)
            _FAILED_ATTEMPTS_STORE.pop(email, None)
        return False

    @staticmethod
    def record_failed_attempt(email: str) -> int:
        r = _get_redis_client()
        if r:
            try:
                key = f"failed_attempts:{email}"
                count = r.incr(key)
                r.expire(key, 900)  # 15 minutes TTL
                return count
            except Exception:
                pass
        count = _FAILED_ATTEMPTS_STORE.get(email, 0) + 1
        _FAILED_ATTEMPTS_STORE[email] = count
        return count

    @staticmethod
    def set_lockout(email: str, minutes: int = 15):
        r = _get_redis_client()
        if r:
            try:
                r.setex(f"lockout:{email}", minutes * 60, "1")
            except Exception:
                pass
        _LOCKOUT_STORE[email] = datetime.now(timezone.utc) + timedelta(minutes=minutes)

    @staticmethod
    def clear_failed_attempts(email: str):
        r = _get_redis_client()
        if r:
            try:
                r.delete(f"failed_attempts:{email}", f"lockout:{email}")
            except Exception:
                pass
        _FAILED_ATTEMPTS_STORE.pop(email, None)
        _LOCKOUT_STORE.pop(email, None)

    @staticmethod
    def is_device_alert_on_cooldown(cooldown_key: str) -> bool:
        r = _get_redis_client()
        if r:
            try:
                return bool(r.exists(cooldown_key))
            except Exception:
                pass
        now = datetime.now(timezone.utc)
        until = _DEVICE_COOLDOWN_STORE.get(cooldown_key)
        if until and now < until:
            return True
        elif until:
            _DEVICE_COOLDOWN_STORE.pop(cooldown_key, None)
        return False

    @staticmethod
    def set_device_alert_cooldown(cooldown_key: str, hours: int = 1):
        r = _get_redis_client()
        if r:
            try:
                r.setex(cooldown_key, hours * 3600, "1")
            except Exception:
                pass
        _DEVICE_COOLDOWN_STORE[cooldown_key] = datetime.now(timezone.utc) + timedelta(hours=hours)

    @staticmethod
    def clear_device_cooldowns():
        _DEVICE_COOLDOWN_STORE.clear()




   
    @staticmethod
    def get_user_by_id(db: Session, user_id: str):
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                pass
        return db.query(User).filter(User.id == user_id).first()
   
    @staticmethod
    def get_user_workspaces(db: Session, user_id: str):
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                pass
        workspaces = db.query(Workspace, WorkspaceMember.role).join(
            WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id
        ).filter(WorkspaceMember.user_id == user_id).all()
       
        return [
            {
                "id": str(ws.id),
                "name": ws.name,
                "role": role,
                "plan_type": getattr(ws, "plan_type", "starter"),
                "created_at": ws.created_at.isoformat() if ws.created_at else None
            }
            for ws, role in workspaces
        ]
    @staticmethod
    def email_login(db: Session, email: str, full_name: str = None, workspace_name: str = "My Workspace", ip_address: str = None, device_info: str = None, session_expiry_hours: Optional[int] = None):
        email = email.strip().lower()
        user = db.query(User).filter(User.email == email).first()

        # NEW BLOCK
        is_new_user = False
        if user and not user.is_active:
            raise ValueError("This account no longer exists.")

        # If user doesn't exist → auto create
        if not user:
            is_new_user = True
            user = User(
                email=email,
                password_hash=None,
                full_name=full_name or email.split("@")[0].title()
            )

            db.add(user)
            db.flush()

            workspace = Workspace(
                name=workspace_name or f"{user.full_name}'s Workspace",
                created_by=user.id,
            )

            db.add(workspace)
            db.flush()

            member = WorkspaceMember(
                workspace_id=workspace.id,
                user_id=user.id,
                role="founder"
            )

            db.add(member)
            db.commit()

            # Initialize billing entitlement orchestrator
            from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator
            from app.services.billing.entitlement_service import EntitlementService
            EntitlementOrchestrator.on_workspace_created(db, workspace.id)
            db.commit()

            # Dynamically resolve Free plan entitlements from database configuration
            entitlement = EntitlementService.get_workspace_entitlement(db, workspace.id)
            free_ai_credits = int(entitlement.included_ai_credits) if (entitlement and hasattr(entitlement, "included_ai_credits")) else 0

            # EventBus emission for new user signup & Free Plan activation
            try:
                from app.core.event_bus import emit_event
                user_display_name = user.full_name or user.email.split("@")[0].title()
                
                # 1. Emit user.signup event
                emit_event(
                    event_name="user.signup",
                    payload={
                        "user_name": user_display_name,
                        "email": user.email,
                        "workspace_name": workspace.name,
                        "plan_name": "Free Plan",
                        "credits": free_ai_credits,
                        "action_route": "/dashboard",
                        "whatsapp_setup_url": "/settings/channels",
                        "user_id": str(user.id),
                        "workspace_id": str(workspace.id)
                    },
                    workspace_id=workspace.id,
                    actor_id=user.id,
                    idempotency_key=f"signup:{user.id}:{workspace.id}",
                    db=db
                )

                # 2. Emit plan.free_activated event
                emit_event(
                    event_name="plan.free_activated",
                    payload={
                        "user_name": user_display_name,
                        "workspace_name": workspace.name,
                        "plan_name": "Free Plan",
                        "credits": free_ai_credits,
                        "checklist_url": "/settings/channels",
                        "action_route": "/settings/channels",
                        "action_label": "Start Setup Checklist",
                        "user_id": str(user.id),
                        "workspace_id": str(workspace.id)
                    },
                    workspace_id=workspace.id,
                    actor_id=user.id,
                    idempotency_key=f"free_plan_start:{workspace.id}",
                    db=db
                )
            except Exception as notif_exc:
                import logging
                logging.getLogger("app").error(f"Failed to emit user signup/plan events: {notif_exc}")

        # get workspaces
        workspaces = db.query(Workspace, WorkspaceMember.role).join(
            WorkspaceMember,
            WorkspaceMember.workspace_id == Workspace.id
        ).filter(
            WorkspaceMember.user_id == user.id
        ).all()

        workspace_id = str(workspaces[0][0].id) if workspaces else None

        # Check if login is from a new device / unrecognized IP
        prior_session = None
        if not is_new_user:
            prior_session = db.query(UserSession).filter(
                UserSession.user_id == user.id,
                (UserSession.ip_address == (ip_address or "Unknown IP")) | 
                (UserSession.device_info == (device_info or "Unknown Device"))
            ).first()

        is_new_device = (prior_session is None) and (not is_new_user)

        # Create session
        session_id = str(uuid.uuid4())
        user_session = UserSession(
            id=session_id,
            user_id=user.id,
            device_info=device_info or "Unknown Device",
            ip_address=ip_address or "Unknown IP",
            location=None,
        )
        db.add(user_session)
        db.commit()

        # Send dynamic Login Notification (New Device vs Known Device) using Notification Template Management
        if not is_new_user:
          
            device_name = parse_user_agent(device_info) if device_info else "Unknown Device/Browser"
            login_time_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            
            template_key = "new_device_login" if is_new_device else "known_device_login"
            dedup_key = f"{template_key}:{user.id}:{session_id}"

            ws_name = workspaces[0][0].name if workspaces else "Auromind"
            ws_id = uuid.UUID(workspace_id) if workspace_id else None

            try:
                from app.services.notification_service import NotificationService
                NotificationService.notify(
                    db=db,
                    user_id=user.id,
                    workspace_id=ws_id,
                    type="security_alert",
                    title=None,          
                    message=None,       
                    send_email=True,    
                    is_critical=is_new_device,
                    email_subject=None, 
                    deduplication_key=dedup_key,
                    template_key=template_key,
                    variables={
                        "user_name": user.full_name or user.email.split("@")[0].title(),
                        "email": user.email,
                        "workspace_name": ws_name,
                        "ip_address": ip_address or "Unknown IP",
                        "device_info": device_info or "Unknown Device",
                        "device": device_name,
                        "browser": device_name,
                        "location": user_session.location or "Unknown Location",
                        "login_time": login_time_str
                    }
                )
            except Exception as notif_exc:
                import logging
                logging.getLogger("app").error(f"Failed to send login notification using template '{template_key}': {notif_exc}")



        import secrets
        csrf_token = secrets.token_urlsafe(32)
        expires_delta = timedelta(hours=session_expiry_hours) if session_expiry_hours else None
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "workspace_id": workspace_id,
                "session_id": session_id,
                "csrf_token": csrf_token
            },
            expires_delta=expires_delta
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "csrf_token": csrf_token,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "platform_role": user.platform_role.value if hasattr(user.platform_role, "value") else str(user.platform_role),
                "deletion_scheduled_at": (
                    user.deletion_scheduled_at.isoformat()
                    if user.deletion_scheduled_at else None
                ),
                "csrf_token": csrf_token
            },
            "workspaces": [
                {
                    "id": str(ws.id),
                    "name": ws.name,
                    "role": role,
                    "plan_type": getattr(ws, "plan_type", "starter")
                }
                for ws, role in workspaces
            ]
        }
       
    @staticmethod
    def send_otp(db: Session, email: str, auth_type: str):
        import random
        from app.core.config import settings
        from app.services.email_service import EmailService
        
        email = email.strip().lower()
        user = db.query(User).filter(User.email == email).first()
       
        if auth_type == "login" and not user:
            raise ValueError("Your email is not registered. Please sign up first.")
        if auth_type == "signup" and user:
            raise ValueError("Email already registered. Please log in.")

        otp = str(random.randint(100000, 999999))
       
        # Store in Redis if available
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2.0, socket_timeout=2.0)
            r.setex(f"otp:{email}", 300, otp)  # 5 mins expiry
        except Exception as e:
            import logging
            logging.getLogger("auromind").warning(f"Redis unavailable for send_otp ({e}). Using in-memory fallback for {email}.")

        # Always maintain in-memory fallback in case Redis fails during verify
        _in_memory_otp_store[email] = {
            "otp": otp,
            "expires_at": time.time() + 300,
            "attempts": 0
        }
           
        try:
            from app.core.event_bus import emit_event
            user_display = user.full_name if user else email.split("@")[0].title()
            
            # Emit user.verification_pending event via EventBus
            emit_event(
                event_name="user.verification_pending",
                payload={
                    "email": email,
                    "user_name": user_display,
                    "verification_url": f"/verify-otp?email={email}",
                    "action_route": f"/verify-otp?email={email}",
                    "action_label": "Verify Email",
                    "expires_in": "5 minutes",
                    "otp": otp,
                    "auth_type": auth_type.title()
                },
                idempotency_key=f"otp:{email}:{int(time.time()) // 300}",
                db=db
            )
        except Exception as e:
            import logging
            logger = logging.getLogger("auromind")
            logger.error(f"Failed to emit user.verification_pending event: {str(e)}.")
        return True

    @staticmethod
    def verify_otp(db: Session, email: str, otp: str, auth_type: str, full_name: str = None, workspace_name: str = None, ip_address: str = None, device_info: str = None, session_expiry_hours: Optional[int] = None):
        from app.core.config import settings
        from fastapi import HTTPException
        email = email.strip().lower()
        saved_otp = None
        redis_available = False
        r = None
        attempts_key = f"otp_attempts:{email}"

        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2.0, socket_timeout=2.0)
            
            attempts = r.get(attempts_key)
            if attempts and int(attempts) >= 5:
                raise HTTPException(
                    status_code=429,
                    detail="Too many failed attempts. Please try again after 5 minutes.",
                    headers={"Retry-After": "300"}
                )

            saved_otp = r.get(f"otp:{email}")
            redis_available = True
        except HTTPException:
            raise
        except Exception as e:
            import logging
            logging.getLogger("auromind").warning(f"Redis unavailable during verify_otp ({e}). Using in-memory fallback.")

        # Fallback to in-memory store if Redis was not reachable or had no saved_otp
        if not saved_otp:
            mem_data = _in_memory_otp_store.get(email)
            if mem_data:
                if time.time() > mem_data.get("expires_at", 0):
                    _in_memory_otp_store.pop(email, None)
                    raise ValueError("Invalid or expired OTP")
                
                if mem_data.get("attempts", 0) >= 5:
                    raise HTTPException(
                        status_code=429,
                        detail="Too many failed attempts. Please try again after 5 minutes.",
                        headers={"Retry-After": "300"}
                    )
                
                saved_otp = mem_data.get("otp")

        if not saved_otp or saved_otp != otp:
            if redis_available and r:
                try:
                    r.incr(attempts_key)
                    r.expire(attempts_key, 300)
                except Exception:
                    pass
            mem_data = _in_memory_otp_store.get(email)
            if mem_data:
                mem_data["attempts"] = mem_data.get("attempts", 0) + 1

            raise ValueError("Invalid or expired OTP")
        
        # Clear attempt counter and stored OTP on success
        if redis_available and r:
            try:
                r.delete(f"otp:{email}")
                r.delete(attempts_key)
            except Exception:
                pass
        _in_memory_otp_store.pop(email, None)
               
        if auth_type == "signup":
            user = db.query(User).filter(User.email == email).first()
            if user:
                raise ValueError("Email already registered. Please log in.")
            return AuthService.email_login(db, email, full_name, workspace_name, ip_address, device_info, session_expiry_hours)
        elif auth_type == "login":
            user = db.query(User).filter(User.email == email).first()
            if not user:
                raise ValueError("Your email is not registered. Please sign up first.")
            

            #  2FA CHECK — only addition to this method ─
            if user.two_factor_enabled:
                import uuid as _uuid
                import redis as _redis
                import json as _json
                pending_token = str(_uuid.uuid4())
                try:
                    r = _redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2.0, socket_timeout=2.0)
                    payload = _json.dumps({"email": email, "provider": "email"})
                    r.setex(f"pending_2fa:{pending_token}", 300, payload)   # 5 min TTL
                except Exception:
                    raise ValueError("Authentication service temporarily unavailable. Please try again.")
                return {"requiresTwoFactor": True, "pending_token": pending_token}
            #  END 2FA CHECK 

            return AuthService.email_login(db, email, None, "My Workspace", ip_address, device_info, session_expiry_hours)
        else:
            raise ValueError("Invalid auth type")

    @staticmethod
    def google_auth(db: Session, email: str, full_name: str, auth_type: str, ip_address: str = None, device_info: str = None, session_expiry_hours: Optional[int] = None):
        email = email.strip().lower()
        user = db.query(User).filter(User.email == email).first()
       
        if auth_type == "login" and not user:
            raise ValueError("Your email is not registered. Please sign up first.")
        if auth_type == "signup" and user:
            raise ValueError("Email already registered. Please log in.")
           
        # Enforce 2FA check for Google OAuth
        if auth_type == "login" and user and user.two_factor_enabled:
            import uuid as _uuid
            import redis as _redis
            import json as _json
            from app.core.config import settings
            pending_token = str(_uuid.uuid4())
            try:
                r = _redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2.0, socket_timeout=2.0)
                payload = _json.dumps({"email": email, "provider": "google"})
                r.setex(f"pending_2fa:{pending_token}", 300, payload)   # 5 min TTL
            except Exception:
                raise ValueError("Authentication service temporarily unavailable. Please try again.")
            return {"requiresTwoFactor": True, "pending_token": pending_token}

        # Bypass OTP for Google Auth and generate token directly
        res = AuthService.email_login(db, email, full_name, "My Workspace", ip_address, device_info, session_expiry_hours)
        
        # Now update user preferences with auth_provider = google
        user = db.query(User).filter(User.email == email).first()
        if user:
            from sqlalchemy.orm.attributes import flag_modified
            prefs = user.preferences or {}
            if prefs.get("auth_provider") != "google":
                prefs["auth_provider"] = "google"
                user.preferences = prefs
                flag_modified(user, "preferences")
                db.commit()
                
        return res
