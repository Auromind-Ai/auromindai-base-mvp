
from pydantic import BaseModel, Field
from typing import Optional


# Individual metric card
class MetricResponse(BaseModel):
    label: str
    value: str
    raw_value: float = 0.0
    change: str
    trend: str          # "up" | "down" | "neutral"
    subtext: str
    gradient: str = ""

    class Config:
        from_attributes = True


# Revenue chart
class RevenueChartResponse(BaseModel):
    months: list[str]           # ["Jan", "Feb", ...]
    current_year: int
    prior_year: int
    current_data: list[int]     # rupees per month
    prior_data: list[int]

    class Config:
        from_attributes = True


#  Activity feed item 
class ActivityItemResponse(BaseModel):
    label: str
    time: str           # human-relative string: "2m ago"

    class Config:
        from_attributes = True


# AI Insight item
class InsightItemResponse(BaseModel):
    type: str           # "opportunity" | "optimization" | "info"
    icon_type: str      # "flame" | "mail" | "bot"
    title: str
    subtitle: str
    icon_bg: str = "bg-purple-500/10"
    icon_color: str = "text-purple-400"

    class Config:
        from_attributes = True


# Full overview bundle 
class DashboardOverviewResponse(BaseModel):
    metrics: list[MetricResponse]
    revenue: RevenueChartResponse
    activities: list[ActivityItemResponse]
    insights: list[InsightItemResponse]

    class Config:
        from_attributes = True


#Legacy schemas kept for backward-compat (deprecated) 
class AttentionItemResponse(BaseModel):
    id: int
    name: str
    status: str
    time: str
    priority: str

class FlowStatResponse(BaseModel):
    label: str
    count: int

class ScheduleItemResponse(BaseModel):
    day: str
    title: str
    details: str


class AIInsightResponse(BaseModel):
    insight: str
    category: Optional[str] = None
    priority: Optional[str] = None