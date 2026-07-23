
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):

    # DATABASE CONFIGURATION
    DATABASE_URL: str

    # SECURITY & AUTHENTICATION
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ENCRYPTION_KEY: Optional[str] = None
    """Fernet encryption key for sensitive data (auto-generated if not set)"""

    # MESSAGE QUEUE & CACHING
    REDIS_URL: str = "redis://localhost:6379/0"

    # ADMIN & SECURITY
    OWNER_SECRET_KEY: Optional[str] = None

    # FRONTEND & PUBLIC URLS
    FRONTEND_URL: Optional[str] = None

    # GOOGLE OAUTH CONFIGURATION
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    OAUTH_REDIRECT_URI: Optional[str] = None

    # SMTP / EMAIL CONFIGURATION
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # # Meta / Instagram Config Fallbacks
    META_VERIFY_TOKEN: Optional[str] = None
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None
    META_SYSTEM_USER_TOKEN: Optional[str] = None
    META_REDIRECT_URI: Optional[str] = None
    IG_APP_ID: Optional[str] = None
    IG_APP_SECRET: Optional[str] = None
    IG_REDIRECT_URI: Optional[str] = None

    # APPLICATION SETTINGS
    ENVIRONMENT: str = "development"
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # LOGGING
    LOG_LEVEL: str = "INFO"

    # INGESTION & TEXT VALIDATION CONFIGURATION
    MIN_INGESTION_TEXT_LENGTH: int = 20
    MIN_ALPHANUMERIC_RATIO: float = 0.35
    MAX_UNBROKEN_WORD_LENGTH: int = 150
    MIN_UNIQUE_WORD_RATIO: float = 0.12
    MAX_URL_DENSITY_RATIO: float = 0.30
    MAX_REPEATED_LINES: int = 6
    MAX_NON_PRINTABLE_RATIO: float = 0.03

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

# Singleton instance
settings = get_settings()
