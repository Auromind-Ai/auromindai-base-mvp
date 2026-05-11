from pydantic import BaseModel

class MetricResponse(BaseModel):
    label: str
    value: str
    change: str
    trend: str # 'up', 'down', 'neutral'
    subtext: str

class AttentionItemResponse(BaseModel):
    id: int
    name: str
    status: str
    time: str
    priority: str # 'high', 'medium', 'low'

class AIInsightResponse(BaseModel):
    type: str # 'opportunity', 'optimization'
    text: str

class FlowStatResponse(BaseModel):
    label: str
    count: int

class ScheduleItemResponse(BaseModel):
    day: str
    title: str
    details: str
