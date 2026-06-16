from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.routers.auth import get_current_user, CurrentUser
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Retrieve paginated notifications for the current user, ordered by newest first."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    # Calculate unread count (without pagination limits)
    unread_count = query.filter(Notification.is_read == False).count()
    
    # Get paginated items sorted newest first
    items = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    return NotificationListResponse(items=items, unread_count=unread_count)


@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_as_read(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Mark a specific notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
        
    notification.is_read = True
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Mark all unread notifications for the current user as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)
    
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
