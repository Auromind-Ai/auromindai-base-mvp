from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models.user import User

router = APIRouter()


@router.get("/users")
async def get_users(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
   
    try:
        users = db.query(User).all()
        
        users_list = []
        for user in users:
            users_list.append({
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name if hasattr(user, 'full_name') else user.email.split('@')[0],
                "first_name": user.first_name if hasattr(user, 'first_name') else user.email.split('@')[0],
                "role": user.role if hasattr(user, 'role') else "Admin",
                "is_active": user.is_active,
                "is_verified": user.is_verified if hasattr(user, 'is_verified') else False,
                "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') else None,
            })
        
        return users_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")
