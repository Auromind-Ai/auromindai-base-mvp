from pydantic import BaseModel
from datetime import datetime

class SessionResponse(BaseModel):
    id: str
    device_info: str
    ip_address: str
    location: str | None
    is_blocked: bool
    created_at: datetime
    last_activity_at: datetime
    is_current: bool

    class Config:
        from_attributes = True

class SecuritySummaryResponse(BaseModel):
    active_sessions_count: int
    last_login_activity: str
    blocked_devices_count: int
    security_score: int
    security_score_label: str
