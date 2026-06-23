from pydantic import BaseModel
from typing import Optional

class PreferencesUpdate(BaseModel):
    timezone: Optional[str] = None
    timezone_auto: Optional[bool] = None
    reminders: Optional[bool] = None
    productUpdates: Optional[bool] = None
    securityAlerts: Optional[bool] = None
    aiAgentEvents: Optional[bool] = None
    workflowAlerts: Optional[bool] = None
    leadsAlerts: Optional[bool] = None

