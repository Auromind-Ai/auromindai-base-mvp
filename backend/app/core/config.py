
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):

    
    # DATABASE CONFIGURATION
    
    DATABASE_URL: str
    """PostgreSQL connection URL"""

    
    # SECURITY & AUTHENTICATION
    
    SECRET_KEY: str
    """JWT secret key for token signing"""

    ALGORITHM: str = "HS256"
    """JWT algorithm (default: HS256)"""

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    """JWT token expiration time in minutes"""

    ENCRYPTION_KEY: Optional[str] = None
    """Fernet encryption key for sensitive data (auto-generated if not set)"""

    
    # LLM & AI PROVIDERS
    
    GOOGLE_API_KEY: str = ""
    """Google Generative AI API key"""

    GROQ_API_KEY: str = ""
    """Groq API key for LLM"""

    
    # MESSAGE QUEUE & CACHING
    
    REDIS_URL: str = "redis://localhost:6379/0"
    """Redis connection URL for caching and task queue"""

    
    # TWILIO & META INTEGRATION
    
    TWILIO_ACCOUNT_SID: Optional[str] = None
    """Twilio account SID"""

    TWILIO_AUTH_TOKEN: Optional[str] = None
    """Twilio authentication token"""

    TWILIO_PHONE_NUMBER: Optional[str] = None
    """Twilio phone number for SMS"""

    META_VERIFY_TOKEN: Optional[str] = None
    """Meta webhook verification token"""

    META_PAGE_ID: Optional[str] = None
    """Meta/Instagram page ID"""

    META_PAGE_ACCESS_TOKEN: Optional[str] = None
    """Meta/Instagram page access token"""

    META_APP_ID: Optional[str] = None
    """Meta app ID"""

    META_APP_SECRET: Optional[str] = None
    """Meta app secret"""

    META_REDIRECT_URI: Optional[str] = None
    """Meta OAuth redirect URI"""

    IG_APP_ID: Optional[str] = None
    """Instagram app ID"""

    IG_APP_SECRET: Optional[str] = None
    """Instagram app secret"""

    IG_REDIRECT_URI: Optional[str] = None
    """Instagram OAuth redirect URI"""

    
    # GOOGLE & OAUTH INTEGRATIONS
    
    GOOGLE_CLIENT_ID: Optional[str] = None
    """Google OAuth client ID"""

    GOOGLE_CLIENT_SECRET: Optional[str] = None
    """Google OAuth client secret"""

    OAUTH_REDIRECT_URI: str = "http://localhost:3000/auth/google/callback"
    """OAuth redirect URI"""

    
    # ADMIN & SECURITY
    
    OWNER_SECRET_KEY: Optional[str] = None
    """Secret key for owner/admin operations"""

    
    # STORAGE & FILE MANAGEMENT
    
    STORAGE_PROVIDER: str = "SUPABASE"
    """Storage provider: SUPABASE or AWS_S3"""

    SUPABASE_URL: Optional[str] = None
    """Supabase project URL"""

    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    """Supabase service role key (prefer over anon key)"""

    SUPABASE_ANON_KEY: Optional[str] = None
    """Supabase anonymous key (fallback)"""

    SUPABASE_BUCKET: str = "uploads"
    """Supabase storage bucket name"""

    AWS_S3_BUCKET: Optional[str] = None
    """AWS S3 bucket name"""

    AWS_REGION: Optional[str] = None
    """AWS region"""

    AWS_ACCESS_KEY_ID: Optional[str] = None
    """AWS access key"""

    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    """AWS secret key"""

    AWS_S3_ENDPOINT_URL: Optional[str] = None
    """AWS S3 endpoint URL (for S3-compatible services)"""

    AWS_S3_PUBLIC_BASE_URL: Optional[str] = None
    """Custom public base URL for S3 files"""

    
    # FRONTEND & PUBLIC URLS
    

    FRONTEND_URL: Optional[str] = None
    """Frontend public URL"""

    
    # OPENAI (LLM)
    

    OPENAI_API_KEY: Optional[str] = None
    """OpenAI API key"""

    
    # TWILIO EXTRA
    

    TWILIO_FROM_NUMBER: Optional[str] = None
    """Twilio WhatsApp/SMS sender number"""
    
    # LLM MODEL PROVIDERS
    
    ANTHROPIC_API_KEY: Optional[str] = None
    """Anthropic API key for Claude models"""

    
    # WORKFLOW & MESSAGING
    
    FLOW_FALLBACK_MESSAGE: str = "I'm having trouble processing your request. Please try again later."
    """Default fallback message for flow failures"""

    TWILIO_STATUS_CALLBACK_URL: Optional[str] = None
    """Webhook URL for Twilio message status callbacks"""

    
    # APPLICATION SETTINGS
    
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    """Comma-separated list of allowed CORS origins"""

    ENVIRONMENT: str = "development"
    """Application environment (development, staging, production)"""

    SCHEDULER_ENABLED: bool = True
    """Enable background schedulers (set to False in multi-worker environments)"""

    SYSTEM_METRICS_UPDATE_INTERVAL: int = 5
    """System metrics collection interval in seconds"""

    
    # BILLING
    

    BILLING_RESERVATION_TTL_SECONDS: int = 1800
    """Billing reservation TTL in seconds"""

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
    """Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"""


    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Get cached settings singleton.
    
    Uses LRU cache to ensure settings are loaded only once.
    All application code should call this function or import 'settings'.
    
    Returns:
        Settings: Singleton settings instance
    """
    return Settings()


# Singleton instance — import this in all modules
settings = get_settings()
