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
    push_enabled: Optional[bool] = None
    show_message_preview: Optional[bool] = None
    mute_pushes_until: Optional[str] = None
    mute_pushes_duration: Optional[str] = None
    expo_push_token: Optional[str] = None
    push_platform: Optional[str] = None
    push_device_name: Optional[str] = None
    biometric_lock: Optional[bool] = None

