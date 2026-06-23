from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Literal
from app.database import get_db
from app.services.agentic_rag.analytics_service import AnalyticsService

router = APIRouter(tags=["admin"])


@router.get("/rag_analytics")
def get_dashboard(
    range: Literal["7d", "30d"] = "7d",
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)

    try:
        data = service.get_dashboard_metrics(range=range)
    except Exception as e:
        print("Analytics error:", e)
        return _empty_response()

    # tool_performance — full dict {tool: {total, positive, negative, accuracy}}
    tool_perf_raw = data.get("tool_performance") or {}

    # Convert to list for frontend
    tool_performance_list = [
        {
            "tool":     tool,
            "total":    stats.get("total",    0),
            "positive": stats.get("positive", 0),
            "negative": stats.get("negative", 0),
            "accuracy": stats.get("accuracy", 0),
        }
        for tool, stats in tool_perf_raw.items()
    ]

    return {
        #  Core stats 
        "total":        data.get("total",        0),
        "positive":     data.get("positive",     0),
        "negative":     data.get("negative",     0),
        "success_rate": data.get("success_rate", 0),

        #  Charts
        "trends":    data.get("trends")    or [],
        "tool_usage": data.get("tool_usage") or [],

        #  Tool performance 
        "tool_performance": tool_performance_list,

        #  Users / Sessions 
        "sessions": data.get("sessions") or [],
        "users":    data.get("users")    or [],

        #  Models
        "models": data.get("models") or [],

        #  Feedback logs
        "feedback_logs": data.get("feedback_logs") or [],

        #  Failed queries 
        "top_failed_queries": data.get("top_failed_queries") or [],

        #  Best / Worst tool
        "best_tool":  data.get("best_tool")  or ["N/A", {"accuracy": 0}],
        "worst_tool": data.get("worst_tool") or ["N/A", {"accuracy": 0}],

        #  Rewrite effectiveness (NEW — was missing) ─
        "rewrite_effectiveness": data.get("rewrite_effectiveness") or {},
    }


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    return service.get_feedback_stats()


@router.get("/failures/{tool}")
def get_failures(tool: str, db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    return service.get_failure_cases_by_tool(tool)


def _empty_response():
    return {
        "total": 0, "positive": 0, "negative": 0, "success_rate": 0,
        "trends": [], "tool_usage": [], "tool_performance": [],
        "sessions": [], "users": [], "models": [],
        "feedback_logs": [], "top_failed_queries": [],
        "best_tool": ["N/A", {"accuracy": 0}],
        "worst_tool": ["N/A", {"accuracy": 0}],
        "rewrite_effectiveness": {},
    }