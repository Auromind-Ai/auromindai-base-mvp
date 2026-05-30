from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.schemas.dashboard import MetricResponse, AttentionItemResponse, AIInsightResponse, FlowStatResponse, ScheduleItemResponse
from app.database import get_db
from app.routers.auth import get_current_user 
from app.core.security import verify_workspace_access

router = APIRouter(tags=["dashboard"])


@router.get("/metrics", response_model=List[MetricResponse])
async def get_metrics(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    
    verify_workspace_access(current_user, db)
    # TODO: Implement actual data retrieval from DB/services
    METRICS = [
        {"label": "Total Revenue", "value": "₹12.4L", "change": "+18.2%", "trend": "up", "subtext": "vs last month"},
        {"label": "Active Leads", "value": "124", "change": "+12%", "trend": "up", "subtext": "vs last week"},
        {"label": "Conversion Rate", "value": "18%", "change": "-2.1%", "trend": "down", "subtext": "vs target"},
        {"label": "Avg. Response Time", "value": "12m", "change": "8m", "trend": "neutral", "subtext": "improving"},
    ]
    return METRICS

@router.get("/attention_items", response_model=List[AttentionItemResponse])
async def get_attention_items(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves a list of items requiring immediate attention.
    (Currently returns hardcoded data for demonstration)
    """
    verify_workspace_access(current_user, db)
    # TODO: Implement actual data retrieval from DB/services (e.g., overdue follow-ups, pending documents)
    ATTENTION_ITEMS = [
        {"id": 1, "name": "Rahul Sharma", "status": "Documents Pending", "time": "12 min ago", "priority": "high"},
        {"id": 2, "name": "Priya Patel", "status": "Demo Not Scheduled", "time": "45 min ago", "priority": "medium"},
        {"id": 3, "name": "Amit Kumar", "status": "Follow-up Overdue", "time": "2h ago", "priority": "high"},
        {"id": 4, "name": "Sneha Gupta", "status": "Contract Review", "time": "4h ago", "priority": "low"},
    ]
    return ATTENTION_ITEMS

@router.get("/ai_insights", response_model=List[AIInsightResponse])
async def get_ai_insights(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves AI-generated insights for the dashboard.
    (Currently returns hardcoded data for demonstration)
    """
    verify_workspace_access(current_user, db)
    # TODO: Implement actual data retrieval from DB/services (e.g., from AIAction logs or a dedicated insights service)
    AI_INSIGHTS = [
        {"type": "opportunity", "text": "3 leads from LinkedIn show high engagement today."},
        {"type": "optimization", "text": "WhatsApp messages sent between 2-4 PM convert 15% better."},
    ]
    return AI_INSIGHTS

@router.get("/flow_stats", response_model=List[FlowStatResponse])
async def get_flow_stats(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves statistics for the sales flow pipeline.
    (Currently returns hardcoded data for demonstration)
    """
    verify_workspace_access(current_user, db)
    # TODO: Implement actual data retrieval from DB/services
    FLOW_STATS = [
        {"label": "New", "count": 42},
        {"label": "Working", "count": 28},
        {"label": "Review", "count": 12},
        {"label": "Closed", "count": 24}
    ]
    return FLOW_STATS

@router.get("/upcoming_schedule", response_model=List[ScheduleItemResponse])
async def get_upcoming_schedule(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieves upcoming schedule items.
    (Currently returns hardcoded data for demonstration)
    """
    verify_workspace_access(current_user, db)
    # TODO: Implement actual data retrieval from DB/services
    SCHEDULE_ITEMS = [
        {"day": "24", "title": "Team Review", "details": "2:00 PM • Zoom"},
        {"day": "25", "title": "Product Launch", "details": "10:00 AM • Main Hall"},
    ]
    return SCHEDULE_ITEMS
