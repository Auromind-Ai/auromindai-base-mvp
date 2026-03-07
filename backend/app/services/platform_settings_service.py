from sqlalchemy.orm import Session
from app.models.platform_setting import PlatformSetting
from typing import Dict, Any, Optional
import json
import time

# Simple in-memory cache
_cache = {}
_cache_timestamp = 0
CACHE_TTL = 300  # 5 minutes

def _parse_value(value: str, value_type: str) -> Any:
    if value_type == "int":
        return int(value)
    elif value_type == "float":
        return float(value)
    elif value_type == "bool":
        return value.lower() in ("true", "1", "yes")
    elif value_type == "json":
        return json.loads(value)
    else:
        return value

def _serialize_value(value: Any) -> tuple[str, str]:
    if isinstance(value, bool):
        return str(value).lower(), "bool"
    elif isinstance(value, int):
        return str(value), "int"
    elif isinstance(value, float):
        return str(value), "float"
    elif isinstance(value, (list, dict)):
        return json.dumps(value), "json"
    else:
        return str(value), "string"

def get_all_settings(db: Session) -> Dict[str, Any]:
    global _cache, _cache_timestamp
    current_time = time.time()
    if current_time - _cache_timestamp < CACHE_TTL and _cache:
        return _cache.copy()

    settings = db.query(PlatformSetting).all()
    result = {}
    for setting in settings:
        result[setting.key] = _parse_value(setting.value, setting.value_type)

    _cache = result
    _cache_timestamp = current_time
    return result.copy()

def get_setting(db: Session, key: str, default: Any = None) -> Any:
    settings = get_all_settings(db)
    return settings.get(key, default)

def update_settings(db: Session, updates: Dict[str, Any]) -> Dict[str, Any]:
    for key, value in updates.items():
        str_value, value_type = _serialize_value(value)
        setting = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()
        if setting:
            setting.value = str_value
            setting.value_type = value_type
        else:
            setting = PlatformSetting(key=key, value=str_value, value_type=value_type)
            db.add(setting)
    db.commit()
    # Invalidate cache
    global _cache, _cache_timestamp
    _cache = {}
    _cache_timestamp = 0
    return get_all_settings(db)

def initialize_default_settings(db: Session):
    """Initialize default settings if not exist"""
    defaults = {
        # Pricing
        "free_plan_price": 0.0,
        "pro_plan_price": 1000.0,
        "enterprise_plan_price": 10000.0,
        "token_limit_per_plan": {"free": 10000, "pro": 100000, "enterprise": 1000000},

        # AI Controls
        "temperature": 0.7,
        "max_tokens": 4096,
        "rpm_limit": 60,
        "context_window": 8192,

        # Rate Limit Controls (new global settings)
        "api_rpm_limit": 60,
        "api_tpm_limit": 100000,
        "workspace_token_limit": 1000000,

        # AI Model & Kill‑switch
        "model_name": "gpt-4o",
        "ai_enabled": True,

        # Announcement banner
        "announcement_enabled": False,
        "announcement_message": "",

        # Feature Toggles
        "enable_gmail_integration": True,
        "enable_calendar_integration": True,
        "enable_rag": True,
        "enable_ai_learning": True,

        # Platform Limits
        "max_workspaces": 10,
        "max_users_per_workspace": 50,
        "max_conversations": 1000,
    }

    existing_keys = {s.key for s in db.query(PlatformSetting.key).all()}
    for key, value in defaults.items():
        if key not in existing_keys:
            str_value, value_type = _serialize_value(value)
            setting = PlatformSetting(key=key, value=str_value, value_type=value_type)
            db.add(setting)
    db.commit()