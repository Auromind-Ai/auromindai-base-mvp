import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.status_page import (
    Incident,
    IncidentUpdate,
    StatusSubscriber,
    StatusPageConfig,
    ServiceHealthCheck,
    ServiceDailyUptime,
)
from app.services.status_page_service import (
    StatusPageService,
    MONITORED_SERVICES,
    SERVICE_KEY_MAP,
)

router = APIRouter(prefix="/status", tags=["Admin Status"])


# Pydantic Request Schemas
class CreateIncidentRequest(BaseModel):
    service_key: str = Field(..., description="dashboard, meta_api, backend, ai_services, or all")
    title: str = Field(..., min_length=3, max_length=255)
    severity: str = Field("major", description="minor, major, critical, or maintenance")
    status: str = Field("investigating", description="investigating, identified, monitoring, resolved")
    description: str = Field(..., min_length=5)
    is_maintenance: bool = False
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    initial_message: Optional[str] = None


class UpdateIncidentRequest(BaseModel):
    title: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    update_message: Optional[str] = None


class AddTimelineUpdateRequest(BaseModel):
    status: str
    message: str


class UpdateConfigRequest(BaseModel):
    failure_threshold: Optional[int] = Field(None, ge=1, le=10)
    recovery_threshold: Optional[int] = Field(None, ge=1, le=10)
    timeout_seconds: Optional[int] = Field(None, ge=3, le=60)


@router.get("/overview")
async def get_admin_status_overview(db: Session = Depends(get_db)) -> Dict[str, Any]:
    StatusPageService.ensure_baseline_data_seeded(db)
    config = StatusPageService.get_or_create_config(db)
    summary = StatusPageService.get_status_summary(db)

    # Active incidents
    active_incidents = (
        db.query(Incident)
        .filter(Incident.status != "resolved")
        .order_by(desc(Incident.created_at))
        .all()
    )

    # Recent raw checks (last 10 across all services)
    recent_checks = (
        db.query(ServiceHealthCheck)
        .order_by(desc(ServiceHealthCheck.checked_at))
        .limit(20)
        .all()
    )

    checks_serialized = [
        {
            "id": str(c.id),
            "service_key": c.service_key,
            "service_name": c.service_name,
            "is_healthy": c.is_healthy,
            "status_code": c.status_code,
            "response_time_ms": c.response_time_ms,
            "error_message": c.error_message,
            "checked_at": c.checked_at.isoformat() if c.checked_at else None,
        }
        for c in recent_checks
    ]

    # Subscriber count
    sub_count = db.query(StatusSubscriber).filter(StatusSubscriber.is_active == True).count()

    return {
        "summary": summary,
        "config": {
            "failure_threshold": config.failure_threshold,
            "recovery_threshold": config.recovery_threshold,
            "check_interval_seconds": config.check_interval_seconds,
            "timeout_seconds": config.timeout_seconds,
        },
        "active_incidents_count": len(active_incidents),
        "active_incidents": [StatusPageService._serialize_incident(inc) for inc in active_incidents],
        "recent_checks": checks_serialized,
        "subscribers_count": sub_count,
    }


@router.post("/run-check")
async def trigger_manual_health_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Manually triggers an immediate health check across all four services.
    """
    try:
        results = await StatusPageService.run_all_health_checks(db)
        return {
            "status": "success",
            "message": "Health checks executed successfully for all four services.",
            "results": results,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Manual health check execution failed: {str(e)}"
        )


@router.get("/incidents")
async def list_admin_incidents(
    status_filter: Optional[str] = Query("all", description="all, active, or resolved"),
    service_key: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    List all incidents with filter options.
    """
    query = db.query(Incident)
    if status_filter == "active":
        query = query.filter(Incident.status != "resolved")
    elif status_filter == "resolved":
        query = query.filter(Incident.status == "resolved")

    if service_key and service_key != "all":
        query = query.filter(Incident.service_key == service_key)

    total = query.count()
    incidents = (
        query.order_by(desc(Incident.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "incidents": [StatusPageService._serialize_incident(inc) for inc in incidents],
    }


@router.post("/incidents")
async def create_incident(
    body: CreateIncidentRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    
    now = datetime.now(timezone.utc)
    srv_name = "All Services"
    if body.service_key != "all" and body.service_key in SERVICE_KEY_MAP:
        srv_name = SERVICE_KEY_MAP[body.service_key]["name"]

    new_inc = Incident(
        service_key=body.service_key,
        service_name=srv_name,
        title=body.title,
        severity=body.severity,
        status=body.status,
        description=body.description,
        is_maintenance=body.is_maintenance,
        scheduled_start=body.scheduled_start,
        scheduled_end=body.scheduled_end,
        start_time=now,
        is_auto_detected=False,
    )
    db.add(new_inc)
    db.flush()

    # Initial timeline update
    update_msg = body.initial_message or f"Incident opened with status: {body.status.capitalize()}."
    first_update = IncidentUpdate(
        incident_id=new_inc.id,
        status=body.status,
        message=update_msg,
        created_at=now,
    )
    db.add(first_update)
    db.commit()
    db.refresh(new_inc)

    return {
        "status": "success",
        "message": "Incident created successfully.",
        "incident": StatusPageService._serialize_incident(new_inc),
    }


@router.put("/incidents/{incident_id}")
async def update_incident(
    incident_id: str,
    body: UpdateIncidentRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID")

    inc = db.query(Incident).filter(Incident.id == inc_uuid).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.now(timezone.utc)
    prev_status = inc.status

    if body.title is not None:
        inc.title = body.title
    if body.severity is not None:
        inc.severity = body.severity
    if body.description is not None:
        inc.description = body.description

    if body.status is not None and body.status != inc.status:
        inc.status = body.status
        if body.status == "resolved" and not inc.resolved_time:
            inc.resolved_time = now
            if inc.start_time:
                inc.duration_minutes = max(1, int((now - inc.start_time).total_seconds() / 60))

    # Add timeline update if message or status change occurred
    if body.update_message or (body.status and body.status != prev_status):
        msg = body.update_message or f"Status updated to: {inc.status.capitalize()}."
        update_entry = IncidentUpdate(
            incident_id=inc.id,
            status=inc.status,
            message=msg,
            created_at=now,
        )
        db.add(update_entry)

    db.commit()
    db.refresh(inc)

    return {
        "status": "success",
        "message": "Incident updated successfully.",
        "incident": StatusPageService._serialize_incident(inc),
    }


@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    resolution_note: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID")

    inc = db.query(Incident).filter(Incident.id == inc_uuid).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.now(timezone.utc)
    inc.status = "resolved"
    inc.resolved_time = now
    if inc.start_time:
        inc.duration_minutes = max(1, int((now - inc.start_time).total_seconds() / 60))

    msg = resolution_note or "This incident has been resolved and all services are operating normally."
    update_entry = IncidentUpdate(
        incident_id=inc.id,
        status="resolved",
        message=msg,
        created_at=now,
    )
    db.add(update_entry)
    db.commit()
    db.refresh(inc)

    return {
        "status": "success",
        "message": "Incident resolved.",
        "incident": StatusPageService._serialize_incident(inc),
    }


@router.post("/incidents/{incident_id}/updates")
async def add_incident_timeline_update(
    incident_id: str,
    body: AddTimelineUpdateRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
   
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID")

    inc = db.query(Incident).filter(Incident.id == inc_uuid).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.now(timezone.utc)
    inc.status = body.status
    if body.status == "resolved" and not inc.resolved_time:
        inc.resolved_time = now
        if inc.start_time:
            inc.duration_minutes = max(1, int((now - inc.start_time).total_seconds() / 60))

    update_entry = IncidentUpdate(
        incident_id=inc.id,
        status=body.status,
        message=body.message,
        created_at=now,
    )
    db.add(update_entry)
    db.commit()
    db.refresh(inc)

    return {
        "status": "success",
        "message": "Timeline update posted.",
        "incident": StatusPageService._serialize_incident(inc),
    }


@router.get("/config")
async def get_monitor_config(db: Session = Depends(get_db)) -> Dict[str, Any]:
    config = StatusPageService.get_or_create_config(db)
    return {
        "failure_threshold": config.failure_threshold,
        "recovery_threshold": config.recovery_threshold,
        "check_interval_seconds": config.check_interval_seconds,
        "timeout_seconds": config.timeout_seconds,
    }


@router.put("/config")
async def update_monitor_config(
    body: UpdateConfigRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    config = StatusPageService.get_or_create_config(db)
    if body.failure_threshold is not None:
        config.failure_threshold = body.failure_threshold
    if body.recovery_threshold is not None:
        config.recovery_threshold = body.recovery_threshold
    if body.timeout_seconds is not None:
        config.timeout_seconds = body.timeout_seconds

    db.commit()
    db.refresh(config)
    return {
        "status": "success",
        "message": "Monitoring configuration updated.",
        "config": {
            "failure_threshold": config.failure_threshold,
            "recovery_threshold": config.recovery_threshold,
            "check_interval_seconds": config.check_interval_seconds,
            "timeout_seconds": config.timeout_seconds,
        },
    }


@router.get("/subscribers")
async def list_subscribers(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    query = db.query(StatusSubscriber)
    total = query.count()
    subs = (
        query.order_by(desc(StatusSubscriber.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "subscribers": [
            {
                "id": str(s.id),
                "email": s.email,
                "is_active": s.is_active,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in subs
        ],
    }
