from sqlalchemy.orm import Session
from app.models import User
from app.models.workspace import Workspace, WorkspaceMember
from app.utils.auth import get_password_hash, verify_password, create_access_token
from datetime import timedelta
import uuid

class AuthService:
    @staticmethod
    def signup(db: Session, email: str, password: str, full_name: str, workspace_name: str):
        """Create a new user and workspace"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise ValueError("Email already registered")
        
        # Create user
        hashed_password = get_password_hash(password)
        user = User(
            email=email,
            password_hash=hashed_password,
            full_name=full_name
        )
        db.add(user)
        db.flush()  # Get user ID without committing
        
        # Create workspace
        workspace = Workspace(
            name=workspace_name,
            created_by=user.id
        )
        db.add(workspace)
        db.flush()
        
        # Add user as workspace member (founder role)
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role="founder"
        )
        db.add(member)
        db.commit()
        db.refresh(user)
        db.refresh(workspace)
        
        return user, workspace
    
    @staticmethod
    def login(db: Session, email: str, password: str = None):
        """Authenticate user and return access token"""
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
                created_by=user.id
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
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
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
                    "role": role
                }
                for ws, role in workspaces
            ]
        }
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str):
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_workspaces(db: Session, user_id: str):
        """Get all workspaces for a user"""
        workspaces = db.query(Workspace, WorkspaceMember.role).join(
            WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id
        ).filter(WorkspaceMember.user_id == user_id).all()
        
        return [
            {
                "id": str(ws.id),
                "name": ws.name,
                "role": role,
                "created_at": ws.created_at.isoformat() if ws.created_at else None
            }
            for ws, role in workspaces
        ]
