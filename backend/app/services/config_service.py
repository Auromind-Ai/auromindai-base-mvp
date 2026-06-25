from typing import Any
from app.core.config import settings

class ConfigService:
    def get(self, key: str, default: Any = None) -> Any:
        db_key = key.lower()
        # Import inside to avoid circular dependencies
        from app.services.platform_settings_service import get_setting as db_get_setting

        # 1. Fetch from PlatformSettingsService (which handles cache/DB/decryption)
        val = db_get_setting(None, db_key, None)
        if val is not None:
            return val

        # 2. Fallback to bootstrap settings (uppercased key)
        bootstrap_key = key.upper()
        if hasattr(settings, bootstrap_key):
            return getattr(settings, bootstrap_key)

        return default

    async def aget(self, key: str, default: Any = None) -> Any:
        return self.get(key, default)

    def clear_cache(self):
        from app.services.platform_settings_service import clear_settings_cache
        clear_settings_cache()

config_service = ConfigService()
