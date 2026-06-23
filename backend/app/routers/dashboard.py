

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.routers.auth import get_current_user
from app.core.security import verify_workspace_access
from app.services.analytics import dashboard_service
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    MetricResponse,
    RevenueChartResponse,
    ActivityItemResponse,
    InsightItemResponse,
)

router = APIRouter(tags=["dashboard"])




# Full overview bundle (recommended — single network round-trip)


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    workspace_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
   
    wid = verify_workspace_access(current_user, db, workspace_id)
    try:
        data = await dashboard_service.get_full_overview(wid, db, start_date=start_date, end_date=end_date)
        return data
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dashboard overview failed: {str(exc)}",
        )



# Individual endpoints (for targeted refreshes / future micro-frontend use)


@router.get("/metrics", response_model=list[MetricResponse])
async def get_metrics(
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)
    try:
        return await dashboard_service.get_overview_metrics(wid, db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Metrics fetch failed: {str(exc)}",
        )


@router.get("/revenue", response_model=RevenueChartResponse)
async def get_revenue(
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)
    try:
        return await dashboard_service.get_revenue_chart(wid, db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Revenue chart fetch failed: {str(exc)}",
        )


@router.get("/activities", response_model=list[ActivityItemResponse])
async def get_activities(
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)
    try:
        return await dashboard_service.get_recent_activities(wid, db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Activities fetch failed: {str(exc)}",
        )


@router.get("/insights", response_model=list[InsightItemResponse])
async def get_insights(
    workspace_id: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wid = verify_workspace_access(current_user, db, workspace_id)
    try:
        return await dashboard_service.get_ai_insights(wid, db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Insights fetch failed: {str(exc)}",
        )
