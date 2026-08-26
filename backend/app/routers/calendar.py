import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import verify_workspace_access
from app.routers.auth import get_current_user
from app.models.integration import CalendarEvent, Integration
from app.services.email_automation.calender_executor import CalendarExecutor

router = APIRouter(prefix="/calendar", tags=["calendar"])


class BookAppointmentRequest(BaseModel):
    meeting_date: str
    meeting_time: str
    timezone: Optional[str] = "Asia/Kolkata"
    name: Optional[str] = "Valued Client"
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = "Google Meet / Online"
    notes: Optional[str] = "Product Demo & AI Discovery"
    duration_minutes: Optional[int] = 30


class RescheduleAppointmentRequest(BaseModel):
    new_date: str
    new_time: str
    new_timezone: Optional[str] = None


@router.get("/status")
async def get_calendar_status(
    workspace_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the Google Calendar integration connection status for the workspace.
    """
    ws_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = uuid.UUID(str(ws_id)) if isinstance(ws_id, str) else ws_id

    integration = db.query(Integration).filter(
        Integration.workspace_id == ws_uuid,
        Integration.integration_type == "google_calendar"
    ).first()

    return {
        "connected": bool(integration and integration.is_active and integration.access_token),
        "email": integration.connected_email if integration else None,
        "updated_at": integration.updated_at.isoformat() if integration and integration.updated_at else None
    }


@router.get("/events")
async def list_calendar_events(
    workspace_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists calendar events and appointments for the workspace.
    """
    ws_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = uuid.UUID(str(ws_id)) if isinstance(ws_id, str) else ws_id

    query = db.query(CalendarEvent).filter(CalendarEvent.workspace_id == ws_uuid)
    if status:
        query = query.filter(CalendarEvent.status == status)

    events = query.order_by(CalendarEvent.event_date.desc()).limit(limit).all()

    return [
        {
            "id": str(ev.id),
            "title": ev.title,
            "description": ev.description,
            "event_date": ev.event_date.isoformat() if ev.event_date else None,
            "event_time": ev.event_time,
            "timezone": ev.timezone,
            "location": ev.location,
            "meet_link": ev.meet_link,
            "client_name": ev.client_name,
            "client_email": ev.client_email,
            "client_phone": ev.client_phone,
            "google_event_id": ev.google_event_id,
            "status": ev.status,
            "created_at": ev.created_at.isoformat() if ev.created_at else None
        }
        for ev in events
    ]


@router.get("/availability")
async def get_calendar_availability(
    date: Optional[str] = None,
    timezone: Optional[str] = "Asia/Kolkata",
    duration_minutes: int = Query(30, ge=15, le=120),
    days_ahead: int = Query(3, ge=1, le=14),
    workspace_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches real-time available appointment slots checking both Google Calendar FreeBusy and DB events.
    """
    ws_id = verify_workspace_access(current_user, db, workspace_id)
    calendar = CalendarExecutor()
    slots = calendar.get_available_slots(
        db=db,
        workspace_id=str(ws_id),
        target_date=date,
        timezone_str=timezone,
        slot_duration_minutes=duration_minutes,
        days_ahead=days_ahead
    )
    return {"timezone": timezone, "available_slots": slots, "count": len(slots)}


@router.post("/events")
async def create_appointment(
    req: BookAppointmentRequest,
    workspace_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually schedules a new appointment / demo booking.
    """
    ws_id = verify_workspace_access(current_user, db, workspace_id)
    calendar = CalendarExecutor()

    result = calendar.execute(
        db=db,
        workspace_id=str(ws_id),
        action={
            "data": {
                "meeting_date": req.meeting_date,
                "meeting_time": req.meeting_time,
                "timezone": req.timezone,
                "name": req.name,
                "email": req.email,
                "phone": req.phone,
                "location": req.location,
                "notes": req.notes,
                "duration_minutes": req.duration_minutes
            }
        },
        decision={
            "summary": req.notes or f"Meeting with {req.name}",
            "priority": "normal"
        }
    )

    if not result:
        raise HTTPException(status_code=400, detail="Failed to create calendar appointment")
    if result.get("status") == "conflict":
        raise HTTPException(status_code=409, detail=result)

    return result


@router.put("/events/{event_id}/reschedule")
async def reschedule_appointment(
    event_id: str,
    req: RescheduleAppointmentRequest,
    workspace_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reschedules an existing appointment to a new date and time.
    """
    ws_id = verify_workspace_access(current_user, db, workspace_id)
    calendar = CalendarExecutor()

    result = calendar.reschedule_appointment(
        db=db,
        workspace_id=str(ws_id),
        event_id=event_id,
        new_date=req.new_date,
        new_time=req.new_time,
        new_timezone=req.new_timezone
    )

    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Appointment not found")
    if result.get("status") == "conflict":
        raise HTTPException(status_code=409, detail=result)

    return result


@router.delete("/events/{event_id}")
async def cancel_appointment(
    event_id: str,
    workspace_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancels an existing appointment in Google Calendar and DB.
    """
    ws_id = verify_workspace_access(current_user, db, workspace_id)
    calendar = CalendarExecutor()

    result = calendar.cancel_appointment(
        db=db,
        workspace_id=str(ws_id),
        event_id=event_id
    )

    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Appointment not found")

    return result
