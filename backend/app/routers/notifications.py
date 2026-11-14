from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.core.pagination import SkipLimitParams
from app.routers.auth import get_current_user, CurrentUser
from app.models.notification import Notification
from app.models.push_device import PushDeviceToken
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    PushTokenRegisterRequest,
    PushTokenUnregisterRequest,
    PushTokenResponse,
)
from app.services.notification_service import NotificationService
from app.services.notifications.expo_push_service import ExpoPushService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    pagination: SkipLimitParams = Depends(),
    category: Optional[str] = Query(None, description="Filter notifications by category: all, unread, mentions, updates, system"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Retrieve paginated notifications for the current user, optionally filtered by category tab."""
    return NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        skip=pagination.skip,
        limit=pagination.limit,
        category=category,
    )

    
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


@router.delete("/clear-all")
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete all notifications for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": "All notifications cleared"}


@router.delete("/{id}")
def delete_notification(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a specific notification."""
    notification = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    db.delete(notification)
    db.commit()
    return {"status": "success", "message": "Notification deleted"}

@router.post("/push-token", response_model=PushTokenResponse)
def register_push_token(
    payload: PushTokenRegisterRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Register or refresh an Expo push token for the current device (Android / iOS)."""
    try:
        record = ExpoPushService.register_device_token(
            db,
            user_id=current_user.id,
            push_token=payload.push_token,
            platform=payload.platform,
            device_name=payload.device_name,
            device_id=payload.device_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    active_count = (
        db.query(PushDeviceToken)
        .filter(
            PushDeviceToken.user_id == current_user.id,
            PushDeviceToken.is_active == True,
        )
        .count()
    )
    return PushTokenResponse(
        status="registered",
        platform=record.platform,
        active_devices=active_count,
    )


@router.post("/push-token/unregister", response_model=PushTokenResponse)
def unregister_push_token_post(
    payload: PushTokenUnregisterRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Deactivate the current device's Expo push token without affecting other logged-in devices."""
    ExpoPushService.unregister_device_token(
        db,
        user_id=current_user.id,
        push_token=payload.push_token,
    )
    active_count = (
        db.query(PushDeviceToken)
        .filter(
            PushDeviceToken.user_id == current_user.id,
            PushDeviceToken.is_active == True,
        )
        .count()
    )
    return PushTokenResponse(status="unregistered", active_devices=active_count)


@router.delete("/push-token", response_model=PushTokenResponse)
def unregister_push_token_delete(
    push_token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Deactivate an Expo push token via DELETE query parameter."""
    ExpoPushService.unregister_device_token(
        db,
        user_id=current_user.id,
        push_token=push_token,
    )
    active_count = (
        db.query(PushDeviceToken)
        .filter(
            PushDeviceToken.user_id == current_user.id,
            PushDeviceToken.is_active == True,
        )
        .count()
    )
    return PushTokenResponse(status="unregistered", active_devices=active_count)


@router.post("/push-test")
def send_test_push_notification(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Send a test Expo push notification to the authenticated user's active devices."""
    return ExpoPushService.send_push_to_user(
        db,
        user_id=current_user.id,
        title="Orbion Push Test",
        message="Push notifications are configured and working on this device.",
        notif_type="new_message",
        data={"route": "/(tabs)/inbox"},
    )
