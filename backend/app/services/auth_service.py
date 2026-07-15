from sqlalchemy.orm import Session
from app.models import User, UserSession
from app.models.workspace import Workspace, WorkspaceMember
from app.utils.auth import get_password_hash, verify_password, create_access_token
from app.services.platform_settings_service import get_setting
import uuid
from datetime import timedelta
from typing import Optional


class AuthService:
   
    @staticmethod
    def login(db: Session, email: str, password: str = None, ip_address: str = None, device_info: str = None, session_expiry_hours: Optional[int] = None):
        email = email.strip().lower()
        user = db.query(User).filter(User.email == email).first()
       
        if not user:
            user = User(
                email=email,
                password_hash="$2b$12$dummyhashforemailtestingonly",
                full_name=email.split('@')[0].title()
            )
            db.add(user)
            db.flush()
           
            # Create default workspace
            workspace = Workspace(
                name=f"{user.full_name}'s Workspace",
                created_by=user.id,
            )
            db.add(workspace)
            db.flush()
           
            # Add user as workspace member
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

            db.refresh(user)
        elif password and not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
       
        if not user.is_active:
            raise ValueError("User account is inactive")
       
        # Get user's workspaces
       
        workspaces = db.query(Workspace, WorkspaceMember.role).join(
            WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id
        ).filter(WorkspaceMember.user_id == user.id).all()

        # Get workspace id
        workspace_id = str(workspaces[0][0].id) if workspaces else None

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

        try:
            from app.services.notification_service import NotificationService
            NotificationService.notify(
                db=db,
                user_id=user.id,
                workspace_id=None,
                type="security_alert",
                title="New Login Detected",
                message=f"New login detected from IP {ip_address or 'Unknown IP'} using device {device_info or 'Unknown Device'}."
            )
        except Exception as notif_exc:
            import logging
            logging.getLogger("app").error(f"Failed to send login alert notification: {notif_exc}")

        expires_delta = timedelta(hours=session_expiry_hours) if session_expiry_hours else None
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "workspace_id": workspace_id,
                "session_id": session_id
            },
            expires_delta=expires_delta
        )
       
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name
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
        if user and not user.is_active:
            raise ValueError("This account no longer exists.")

        # If user doesn't exist → auto create
        if not user:

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

        # get workspaces
        workspaces = db.query(Workspace, WorkspaceMember.role).join(
            WorkspaceMember,
            WorkspaceMember.workspace_id == Workspace.id
        ).filter(
            WorkspaceMember.user_id == user.id
        ).all()

        workspace_id = str(workspaces[0][0].id) if workspaces else None

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

        try:
            from app.services.notification_service import NotificationService
            NotificationService.notify(
                db=db,
                user_id=user.id,
                workspace_id=None,
                type="security_alert",
                title="New Login Detected",
                message=f"New login detected via email OTP from IP {ip_address or 'Unknown IP'} using device {device_info or 'Unknown Device'}."
            )
        except Exception as notif_exc:
            import logging
            logging.getLogger("app").error(f"Failed to send email login alert notification: {notif_exc}")

        expires_delta = timedelta(hours=session_expiry_hours) if session_expiry_hours else None
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "workspace_id": workspace_id,
                "session_id": session_id
            },
            expires_delta=expires_delta
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "platform_role": user.platform_role.value if hasattr(user.platform_role, "value") else str(user.platform_role),
                "deletion_scheduled_at": (
                    user.deletion_scheduled_at.isoformat()
                    if user.deletion_scheduled_at else None
                ),
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
