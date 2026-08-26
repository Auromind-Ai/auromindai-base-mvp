from typing import Any
from app.core.config import settings

class ConfigService:
    def get(self, key: str, default: Any = None) -> Any:
        db_key = key.lower()
        # Import inside to avoid circular dependencies
        from app.services.platform_settings_service import get_setting as db_get_setting

     
        val = db_get_setting(None, db_key, None)
        if val is not None and val != "":
            return val

        if db_key in ("google_api_key", "gemini_api_key"):
            alt_key = "gemini_api_key" if db_key == "google_api_key" else "google_api_key"
            alt_val = db_get_setting(None, alt_key, None)
            if alt_val is not None and alt_val != "":
                return alt_val

        bootstrap_key = key.upper()
        if bootstrap_key == "SMTP_PASSWORD":
            val = getattr(settings, "SMTP_PASSWORD", None) or getattr(settings, "SMTP_PASS", None)
            if val is not None:
                return val
        if hasattr(settings, bootstrap_key):
            val = getattr(settings, bootstrap_key)
            if val is not None and val != "":
                return val

        if bootstrap_key in ("GOOGLE_API_KEY", "GEMINI_API_KEY"):
            alt_bkey = "GEMINI_API_KEY" if bootstrap_key == "GOOGLE_API_KEY" else "GOOGLE_API_KEY"
            if hasattr(settings, alt_bkey):
                alt_val = getattr(settings, alt_bkey)
                if alt_val is not None and alt_val != "":
                    return alt_val

        import os
        val = os.getenv(bootstrap_key)
        if val is not None and val != "":
            return val

        return default

    async def aget(self, key: str, default: Any = None) -> Any:
        return self.get(key, default)

    def clear_cache(self):
        from app.services.platform_settings_service import clear_settings_cache
        clear_settings_cache()

config_service = ConfigService()
