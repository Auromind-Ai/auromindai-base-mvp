from sqlalchemy.orm import Session
from app.models import User
from app.models.workspace import Workspace, WorkspaceMember
from app.utils.auth import get_password_hash, verify_password, create_access_token
from app.services.platform_settings_service import get_setting


class AuthService:
    # @staticmethod
    # def signup(db: Session, email: str, password: str, full_name: str, workspace_name: str):
       
    #     # Check if user already exists
    #     existing_user = db.query(User).filter(User.email == email).first()
    #     if existing_user:
    #         raise ValueError("Email already registered")
        
    #     # Check platform limits
    #     max_workspaces = get_setting(db, "max_workspaces", 10)
    #     current_workspaces = db.query(Workspace).count()
    #     if current_workspaces >= max_workspaces:
    #         raise ValueError(f"Maximum number of workspaces ({max_workspaces}) reached")
        
    #     # Create user
    #     hashed_password = get_password_hash(password)
    #     user = User(
    #         email=email,
    #         password_hash=hashed_password,
    #         full_name=full_name
    #     )
    #     db.add(user)
    #     db.flush()  # Get user ID without committing
        
    #     # Create workspace
    #     workspace = Workspace(
    #         name=workspace_name,
    #         created_by=user.id,
    #     )
    #     db.add(workspace)
    #     db.flush()
        
    #     # Add user as workspace member (founder role)
    #     member = WorkspaceMember(
    #         workspace_id=workspace.id,
    #         user_id=user.id,
    #         role="founder"
    #     )
    #     db.add(member)
    #     db.commit()
    #     db.refresh(user)
    #     db.refresh(workspace)
        
    #     return user, workspace
    
    @staticmethod
    def login(db: Session, email: str, password: str = None):
        
        user = db.query(User).filter(User.email == email).first()
        
        # For testing: allow login with just email, or verify password if provided
        if not user:
            # Auto-create user if doesn't exist (for testing)
            # Use a pre-generated hash to avoid bcrypt issues with None password
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

        # Create access token
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "workspace_id": workspace_id
            }
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
        
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_workspaces(db: Session, user_id: str):
        
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
    def email_login(db: Session, email: str, full_name: str = None, workspace_name: str = "My Workspace"):

        user = db.query(User).filter(User.email == email).first()

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

        # get workspaces
        workspaces = db.query(Workspace, WorkspaceMember.role).join(
            WorkspaceMember,
            WorkspaceMember.workspace_id == Workspace.id
        ).filter(
            WorkspaceMember.user_id == user.id
        ).all()

        workspace_id = str(workspaces[0][0].id) if workspaces else None

        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "workspace_id": workspace_id
            }
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
    def send_otp(db: Session, email: str, auth_type: str):
        import random
        from app.core.config import settings
        from app.services.email_service import EmailService
        
        user = db.query(User).filter(User.email == email).first()
        
        if auth_type == "login" and not user:
            raise ValueError("Your email is not here, sign up first")
        if auth_type == "signup" and user:
            raise ValueError("Email already registered. Please log in.")

        otp = str(random.randint(100000, 999999))
        
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, decode_responses=True)
            r.setex(f"otp:{email}", 300, otp)  # 5 mins expiry
        except Exception as e:
            # Fallback for local
            pass
            
        EmailService.send_email(
            to_email=email,
            subject=f"Your {auth_type.title()} Verification Code",
            body=f"Your verification code is {otp}. It will expire in 5 minutes."
        )
        # Log to console for local testing since we don't have real SMTP
        print(f"=============================\nOTP for {email}: {otp}\n=============================")
        return True

    @staticmethod
    def verify_otp(db: Session, email: str, otp: str, auth_type: str, full_name: str = None, workspace_name: str = None):
        from app.core.config import settings
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, decode_responses=True)
            saved_otp = r.get(f"otp:{email}")
            if not saved_otp or saved_otp != otp:
                if otp != "123456": # backdoor for testing
                    raise ValueError("Invalid or expired OTP")
            r.delete(f"otp:{email}")
        except Exception as e:
            if otp != "123456":
                raise ValueError("Invalid or expired OTP")
                
        if auth_type == "signup":
            return AuthService.email_login(db, email, full_name, workspace_name)
        elif auth_type == "login":
            return AuthService.email_login(db, email)
        else:
            raise ValueError("Invalid auth type")

    @staticmethod
    def google_auth(db: Session, email: str, full_name: str, auth_type: str):
        user = db.query(User).filter(User.email == email).first()
        
        if auth_type == "login" and not user:
            # We can either block them or create an account automatically.
            # Assuming we let them create it seamlessly since Google verified them.
            pass
        if auth_type == "signup" and user:
            raise ValueError("Email already registered. Please log in.")
            
        # Bypass OTP for Google Auth and generate token directly
        return AuthService.email_login(db, email, full_name)
