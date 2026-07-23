from sqlalchemy.orm import Session
from app.models import User, UserSession
from app.models.workspace import Workspace, WorkspaceMember
from app.utils.auth import get_password_hash, verify_password, create_access_token
from app.services.platform_settings_service import get_setting
import uuid
from typing import Optional
from datetime import datetime, timezone, timedelta

# Redis client helper with graceful in-memory fallback
def _get_redis_client():
    try:
        import redis
        from app.core.config import settings
        if settings.REDIS_URL:
            return redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1.0, socket_timeout=1.0)
    except Exception:
        pass
    return None

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
            EntitlementOrchestrator.on_workspace_created(db, workspace.id)
            db.commit()

            # Welcome notification + email for new signup
            try:
                from app.services.notification_service import NotificationService
                NotificationService.notify(
                    db=db,
                    user_id=user.id,
                    workspace_id=workspace.id,
                    type="workspace_alert",
                    title="Welcome to AuroMind!",
                    message=f"Welcome {user.full_name}! Your workspace '{workspace.name}' is ready.",
                    send_email=True,
                    email_subject="Welcome to AuroMind AI"
                )
            except Exception as notif_exc:
                import logging
                logging.getLogger("app").error(f"Failed to send welcome notification: {notif_exc}")

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

        # Send Security Alert ONLY if login is from a New Device
        if is_new_device:
            from app.utils.auth import parse_user_agent
            fingerprint = parse_user_agent(device_info)
            dedup_key = f"new_device:{user.id}:{fingerprint}"
            try:
                from app.services.notification_service import NotificationService
                NotificationService.notify(
                    db=db,
                    user_id=user.id,
                    workspace_id=None,
                    type="security_alert",
                    title="New Device Login Detected",
                    message=f"New login detected from an unrecognized device/browser ({fingerprint}) at IP {ip_address or 'Unknown IP'}.",
                    is_critical=True,
                    send_email=True,
                    email_subject="[SECURITY ALERT] New Login from Unrecognized Device",
                    deduplication_key=dedup_key
                )
            except Exception as notif_exc:
                import logging
                logging.getLogger("app").error(f"Failed to send email login alert notification: {notif_exc}")



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
       
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2.0, socket_timeout=2.0)
            r.setex(f"otp:{email}", 300, otp)  # 5 mins expiry
        except Exception as e:
            # Fallback for local
            pass
           
        try:
            EmailService.send_email(
                to_email=email,
                subject=f"Your {auth_type.title()} Verification Code",
                body=f"Your verification code is {otp}. It will expire in 5 minutes."
            )
        except Exception as e:
            import logging
            logger = logging.getLogger("auromind")
            logger.error(f"Failed to send verification email via SMTP: {str(e)}. Falling back to console logging.")
        return True

    @staticmethod
    def verify_otp(db: Session, email: str, otp: str, auth_type: str, full_name: str = None, workspace_name: str = None, ip_address: str = None, device_info: str = None, session_expiry_hours: Optional[int] = None):
        from app.core.config import settings
        from fastapi import HTTPException
        email = email.strip().lower()
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2.0, socket_timeout=2.0)
            
            attempts_key = f"otp_attempts:{email}"
            attempts = r.get(attempts_key)
            if attempts and int(attempts) >= 5:
                raise HTTPException(
                    status_code=429,
                    detail="Too many failed attempts. Please try again after 5 minutes.",
                    headers={"Retry-After": "300"}
                )

            saved_otp = r.get(f"otp:{email}")
            if not saved_otp or saved_otp != otp:
                # Increment failed attempts
                r.incr(attempts_key)
                r.expire(attempts_key, 300)
                raise ValueError("Invalid or expired OTP")
            
            # Clear attempt counter on success
            r.delete(f"otp:{email}")
            r.delete(attempts_key)
        except HTTPException:
            raise
        except Exception as e:
            import logging
            logging.getLogger("auromind").error(f"OTP verification failed: {str(e)}")
            raise ValueError("Invalid or expired OTP")
               
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
