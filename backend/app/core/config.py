
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):

    # DATABASE CONFIGURATION
    DATABASE_URL: str
    
    #hugging face models CONFIGURATION
    hf_token: str | None = None
    hf_home: str | None = None
    transformers_cache: str | None = None
    hf_hub_enable_hf_transfer: str | None = None

    # SECURITY & AUTHENTICATION
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ENCRYPTION_KEY: Optional[str] = None
    """Fernet encryption key for sensitive data (auto-generated if not set)"""

    ADMIN_CONSOLE_PATH: str = "x7k2-admin-9pqm"
    # LLM & AI PROVIDERS
    
    GOOGLE_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # MESSAGE QUEUE & CACHING
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # TWILIO & META INTEGRATION
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    META_VERIFY_TOKEN: Optional[str] = None
    META_PAGE_ID: Optional[str] = None
    META_PAGE_ACCESS_TOKEN: Optional[str] = None
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None
    META_REDIRECT_URI: Optional[str] = None
    IG_APP_ID: Optional[str] = None
    IG_APP_SECRET: Optional[str] = None
    IG_REDIRECT_URI: Optional[str] = None
    
    # GOOGLE & OAUTH INTEGRATIONS
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    OAUTH_REDIRECT_URI: str = "http://localhost:3000/auth/google/callback"
    
    # ADMIN & SECURITY
    OWNER_SECRET_KEY: Optional[str] = None
   
    # STORAGE & FILE MANAGEMENT
    STORAGE_PROVIDER: str = "SUPABASE"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_BUCKET: str = "uploads"
    AWS_S3_BUCKET: Optional[str] = None
    AWS_REGION: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_ENDPOINT_URL: Optional[str] = None
    AWS_S3_PUBLIC_BASE_URL: Optional[str] = None
    
    # FRONTEND & PUBLIC URLS
    FRONTEND_URL: Optional[str] = None
   
    # LLM MODEL PROVIDERS
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
   
    # WORKFLOW & MESSAGING
    FLOW_FALLBACK_MESSAGE: str = "I'm having trouble processing your request. Please try again later."
    TWILIO_STATUS_CALLBACK_URL: Optional[str] = None
    
    # APPLICATION SETTINGS
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"
    SCHEDULER_ENABLED: bool = True
    SYSTEM_METRICS_UPDATE_INTERVAL: int = 5
   
    # BILLING
    BILLING_RESERVATION_TTL_SECONDS: int = 1800
    RAZORPAY_PRO_PLAN_ID: str | None = None
    RAZORPAY_ENTERPRISE_PLAN_ID: str | None = None
    RAZORPAY_WEBHOOK_SECRET: str | None = None
    RAZORPAY_KEY: str | None = None
    RAZORPAY_SECRET: str | None = None
    PAYU_PRO_PLAN_ID: str | None = None
    PAYU_ENTERPRISE_PLAN_ID: str | None = None
    PAYU_MERCHANT_KEY: str | None = None
    PAYU_SALT: str | None = None
    PAYU_WEBHOOK_SECRET: str | None = None

    # LOGGING
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

# Singleton instance
settings = get_settings()
