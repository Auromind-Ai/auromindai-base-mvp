from sqlalchemy.orm import Session
from app.models.platform_setting import PlatformSetting
from typing import Dict, Any
import json
import time
import logging
from app.utils.crypto import encrypt_value, decrypt_value, is_encrypted

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "openai_api_key",
    "google_api_key",
    "gemini_api_key",
    "groq_api_key",
    "anthropic_api_key",
    "hf_token",
    "razorpay_secret",
    "payu_salt",
    "payu_merchant_key",
    "razorpay_webhook_secret",
    "payu_webhook_secret",
    "google_client_secret",
    "meta_app_secret",
    "meta_system_user_token",
    "ig_app_secret",
    "smtp_password",
    "gmail_app_password",
    "supabase_service_role_key",
    "aws_secret_access_key",
    "twilio_auth_token",
}

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
        value = setting.value

        # decrypt only for sensitive
        if setting.key in SENSITIVE_KEYS and value:
            if is_encrypted(value):
                try:
                    value = decrypt_value(value)
                except Exception as e:
                    logger.warning(f"Failed to decrypt sensitive setting '{setting.key}': {e}. Returning value as-is.")
            else:
                logger.warning(f"Sensitive setting '{setting.key}' is stored as plain-text. Returning value as-is.")
        else:
            value = _parse_value(value, setting.value_type)

        result[setting.key] = value

    result["_supported_storage_providers"] = ["SUPABASE", "S3"]
    _cache = result
    _cache_timestamp = current_time

    return result.copy()


def get_setting(db: Session | None, key: str, default: Any = None) -> Any:
    global _cache, _cache_timestamp
    current_time = time.time()

    if current_time - _cache_timestamp < CACHE_TTL and _cache:
        return _cache.get(key, default)

    if db is None:
        from app.database import SessionLocal
        with SessionLocal() as db_session:
            settings = get_all_settings(db_session)
            return settings.get(key, default)
    else:
        settings = get_all_settings(db)
        return settings.get(key, default)


def clear_settings_cache():
    global _cache, _cache_timestamp
    _cache = {}
    _cache_timestamp = 0


def seed_settings_from_env(db: Session):
    import os
    env_map = {
        # Brand Configuration
        "APP_NAME": "app_name",
        "APP_LOGO_URL": "app_logo_url",
        
        # AI
        "OPENAI_API_KEY": "openai_api_key",
        "GOOGLE_API_KEY": "google_api_key",
        "GROQ_API_KEY": "groq_api_key",
        "ANTHROPIC_API_KEY": "anthropic_api_key",
        "HF_TOKEN": "hf_token",
        "HF_HOME": "hf_home",
        "TRANSFORMERS_CACHE": "transformers_cache",
        "HF_HUB_ENABLE_HF_TRANSFER": "hf_hub_enable_hf_transfer",
        
        # Payments
        "RAZORPAY_PRO_PLAN_ID": "razorpay_pro_plan_id",
        "RAZORPAY_ENTERPRISE_PLAN_ID": "razorpay_enterprise_plan_id",
        "RAZORPAY_WEBHOOK_SECRET": "razorpay_webhook_secret",
        "RAZORPAY_KEY": "razorpay_key",
        "RAZORPAY_SECRET": "razorpay_secret",
        "PAYU_PRO_PLAN_ID": "payu_pro_plan_id",
        "PAYU_ENTERPRISE_PLAN_ID": "payu_enterprise_plan_id",
        "PAYU_MERCHANT_KEY": "payu_merchant_key",
        "PAYU_SALT": "payu_salt",
        "PAYU_WEBHOOK_SECRET": "payu_webhook_secret",
        
        # OAuth
        "GOOGLE_CLIENT_ID": "google_client_id",
        "GOOGLE_CLIENT_SECRET": "google_client_secret",
        "OAUTH_REDIRECT_URI": "oauth_redirect_uri",
        "GOOGLE_INTEGRATION_REDIRECT_URI": "google_integration_redirect_uri",
        
        # Meta
        "TWILIO_ACCOUNT_SID": "twilio_account_sid",
        "TWILIO_AUTH_TOKEN": "twilio_auth_token",
        "TWILIO_PHONE_NUMBER": "twilio_phone_number",
        "META_VERIFY_TOKEN": "meta_verify_token",
        "META_PAGE_ID": "meta_page_id",
        "META_PAGE_ACCESS_TOKEN": "meta_page_access_token",
        "META_APP_ID": "meta_app_id",
        "META_APP_SECRET": "meta_app_secret",
        "META_SYSTEM_USER_TOKEN": "meta_system_user_token",
        "META_REDIRECT_URI": "meta_redirect_uri",
        "IG_APP_ID": "ig_app_id",
        "IG_APP_SECRET": "ig_app_secret",
        "IG_REDIRECT_URI": "ig_redirect_uri",
        
        # SMTP
        "GMAIL_USER": "gmail_user",
        "GMAIL_APP_PASSWORD": "gmail_app_password",
        "SMTP_HOST": "smtp_host",
        "SMTP_PORT": "smtp_port",
        "SMTP_USER": "smtp_user",
        "SMTP_PASS": "smtp_password",
        "FROM_EMAIL": "from_email",
        
        # Storage
        "STORAGE_PROVIDER": "storage_provider",
        "SUPABASE_URL": "supabase_url",
        "SUPABASE_SERVICE_ROLE_KEY": "supabase_service_role_key",
        "SUPABASE_ANON_KEY": "supabase_anon_key",
        "SUPABASE_BUCKET": "supabase_bucket",
        "AWS_S3_BUCKET": "aws_s3_bucket",
        "AWS_REGION": "aws_region",
        "AWS_ACCESS_KEY_ID": "aws_access_key_id",
        "AWS_SECRET_ACCESS_KEY": "aws_secret_access_key",
        "AWS_S3_ENDPOINT_URL": "aws_s3_endpoint_url",
        "AWS_S3_PUBLIC_BASE_URL": "aws_s3_public_base_url",
        
        # Platform Settings
        "FLOW_FALLBACK_MESSAGE": "flow_fallback_message",
        "TWILIO_STATUS_CALLBACK_URL": "twilio_status_callback_url",
        "ALLOWED_ORIGINS": "allowed_origins",
        "SCHEDULER_ENABLED": "scheduler_enabled",
        "SYSTEM_METRICS_UPDATE_INTERVAL": "system_metrics_update_interval",
        "BILLING_RESERVATION_TTL_SECONDS": "billing_reservation_ttl_seconds",
    }

    existing_settings = {s.key: s for s in db.query(PlatformSetting).all()}
    updates_made = False

    for env_var, db_key in env_map.items():
        val = os.getenv(env_var)
        if val is not None and val != "":
            setting = existing_settings.get(db_key)
            
            db_val = None
            if setting:
                db_val = setting.value
                if db_key in SENSITIVE_KEYS and db_val:
                    if is_encrypted(db_val):
                        try:
                            db_val = decrypt_value(db_val)
                        except Exception:
                            pass
            
            if not setting or not db_val or db_val.strip() == "":
                str_value, value_type = _serialize_value(val)
                if db_key in ["smtp_port", "system_metrics_update_interval", "billing_reservation_ttl_seconds"]:
                    try:
                        str_value, value_type = _serialize_value(int(val))
                    except ValueError:
                        pass
                elif db_key == "scheduler_enabled":
                    str_value, value_type = _serialize_value(val.lower() in ("true", "1", "yes"))
                
                if db_key in SENSITIVE_KEYS:
                    if str_value and not is_encrypted(str_value):
                        str_value = encrypt_value(str_value)

                if setting:
                    setting.value = str_value
                    setting.value_type = value_type
                else:
                    new_setting = PlatformSetting(
                        key=db_key,
                        value=str_value,
                        value_type=value_type
                    )
                    db.add(new_setting)
                updates_made = True

    # Seed default branding configs if not present in DB
    default_brand = {
        "app_name": "Orbionagents",
        "app_logo_url": "/logo.png"
    }
    for k, v in default_brand.items():
        if k not in existing_settings:
            setting = PlatformSetting(
                key=k,
                value=v,
                value_type="string"
            )
            db.add(setting)
            updates_made = True

    # Seed default pricing configs if not present in DB
    default_pricing = {
        "free_plan_price": (0.0, "float"),
        "solo_plan_price": (999.0, "float"),
        "pro_plan_price": (5999.0, "float"),
        "enterprise_plan_price": (24999.0, "float"),
        "free_plan_name": ("Free", "string"),
        "solo_plan_name": ("Solo Smart", "string"),
        "pro_plan_name": ("Professional", "string"),
        "enterprise_plan_name": ("Business", "string"),
        "free_plan_desc": ("Try Orbion Agents for free and see the ROI yourself.", "string"),
        "solo_plan_desc": ("RAG & custom knowledge base on a budget for solopreneurs.", "string"),
        "pro_plan_desc": ("Advanced features for growing teams and scalable workflows.", "string"),
        "enterprise_plan_desc": ("Perfect for businesses starting with AI automation at scale.", "string"),
        "free_plan_features": (["1,000 AI Replies", "Basic Workflows", "Meta API Included"], "json"),
        "solo_plan_features": (["15,000 AI Replies", "RAG Knowledge Base Enabled", "1 Gmail Integration", "Basic Automations"], "json"),
        "pro_plan_features": (["100,000 AI Replies", "Advanced Workflows + RAG", "Priority Support", "Full Analytics"], "json"),
        "enterprise_plan_features": (["500,000 AI Replies", "Dedicated Manager", "Custom API Access", "On-premise Options", "Global SLA"], "json"),
        "token_limit_per_plan": ({"free": 1000000, "solo": 15000000, "pro": 100000000, "enterprise": 500000000}, "json")
    }
    for k, (v, t) in default_pricing.items():
        if k not in existing_settings:
            if t == "json":
                from json import dumps
                str_val = dumps(v)
            else:
                str_val = str(v)
            setting = PlatformSetting(
                key=k,
                value=str_val,
                value_type=t
            )
            db.add(setting)
            updates_made = True

    if updates_made:
        db.commit()
        clear_settings_cache()


def get_prospective_settings(db: Session, updates: Dict[str, Any]) -> Dict[str, Any]:
    # Fetch current settings to form the prospective settings dictionary
    current_settings = {}
    for s in db.query(PlatformSetting).all():
        val = s.value
        if s.key in SENSITIVE_KEYS and val:
            if is_encrypted(val):
                try:
                    val = decrypt_value(val)
                except Exception:
                    pass
        else:
            val = _parse_value(val, s.value_type)
        current_settings[s.key] = val

    # Merge updates to form prospective settings
    # For sensitive keys, if the update value is the mask placeholder or empty,
    # use the existing DB value so validations/tests work against real data.
    prospective = {**current_settings}
    for key, value in updates.items():
        if key in SENSITIVE_KEYS and (not value or str(value) == "••••••••"):
            # Keep existing decrypted value
            continue
        prospective[key] = value
    return prospective


def update_settings(db: Session, updates: Dict[str, Any]) -> Dict[str, Any]:
    # 1. Get prospective settings
    prospective = get_prospective_settings(db, updates)

    # 2. Perform validations on prospective settings
    # 2.1 Google Client ID / Secret together
    google_id = prospective.get("google_client_id")
    google_secret = prospective.get("google_client_secret")
    if (google_id or google_secret) and not (google_id and google_secret):
        raise ValueError("Google Client ID and Google Client Secret must be configured together.")

    # 2.2 Meta App ID / Secret together
    meta_id = prospective.get("meta_app_id")
    meta_secret = prospective.get("meta_app_secret")
    if (meta_id or meta_secret) and not (meta_id and meta_secret):
        raise ValueError("Meta App ID and Meta App Secret must be configured together.")

    # 2.3 SMTP Port integer validation
    smtp_port = prospective.get("smtp_port")
    if smtp_port is not None and smtp_port != "":
        try:
            int(smtp_port)
        except (ValueError, TypeError):
            raise ValueError("SMTP Port must be a valid integer.")

    # 2.4 Storage Provider validation
    storage_provider = prospective.get("storage_provider")
    if storage_provider:
        prov_upper = str(storage_provider).upper()
        if prov_upper not in ["SUPABASE", "S3"]:
            raise ValueError(f"Storage Provider must be either SUPABASE or S3. Received: {storage_provider}")
        
        # 2.5 Conditionally validate active storage provider config
        if prov_upper == "S3":
            aws_key = prospective.get("aws_access_key_id")
            aws_secret = prospective.get("aws_secret_access_key")
            aws_region = prospective.get("aws_region")
            aws_bucket = prospective.get("aws_s3_bucket")
            if not (aws_key and aws_secret and aws_region and aws_bucket):
                raise ValueError("AWS Access Key ID, Secret Access Key, Region, and Bucket are required when S3 is the selected Storage Provider.")
        elif prov_upper == "SUPABASE":
            sub_url = prospective.get("supabase_url")
            sub_key = prospective.get("supabase_service_role_key")
            sub_bucket = prospective.get("supabase_bucket")
            if not (sub_url and sub_key and sub_bucket):
                raise ValueError("Supabase URL, Service Role Key, and Supabase Bucket are required when SUPABASE is the selected Storage Provider.")

    for key, value in updates.items():
        str_value, value_type = _serialize_value(value)

        setting = db.query(PlatformSetting).filter(PlatformSetting.key == key).first()

        #  HANDLE SENSITIVE KEYS SAFELY
        if key in SENSITIVE_KEYS:
            if not str_value or str_value == "••••••••":
                # ❗ skip empty or masked placeholder → DON'T overwrite existing secret
                continue
            if not is_encrypted(str_value):
                str_value = encrypt_value(str_value)

        if setting:
            setting.value = str_value
            setting.value_type = value_type
        else:
            setting = PlatformSetting(
                key=key,
                value=str_value,
                value_type=value_type
            )
            db.add(setting)

    db.commit()

    # clear cache
    global _cache, _cache_timestamp
    _cache = {}
    _cache_timestamp = 0

    try:
        from app.services.config_service import config_service
        config_service.clear_cache()
    except Exception:
        pass

    return get_all_settings(db)


def migrate_sensitive_settings(db: Session) -> dict[str, int]:
    """
    Idempotent one-time migration that:
    1. Renames any legacy 'smtp_pass' key to 'smtp_password' if 'smtp_password' doesn't exist yet,
       and deletes 'smtp_pass' to avoid duplicate configuration entries.
    2. Scans the DB for sensitive keys and encrypts any unencrypted plain-text values.
    """
    # 1. Handle renaming smtp_pass to smtp_password
    legacy_smtp_pass = db.query(PlatformSetting).filter(PlatformSetting.key == "smtp_pass").first()
    if legacy_smtp_pass:
        canonical_smtp_password = db.query(PlatformSetting).filter(PlatformSetting.key == "smtp_password").first()
        if not canonical_smtp_password:
            legacy_smtp_pass.key = "smtp_password"
            logger.info("[MIGRATION] Renamed legacy 'smtp_pass' setting to 'smtp_password'")
        else:
            db.delete(legacy_smtp_pass)
            logger.info("[MIGRATION] Deleted duplicate legacy 'smtp_pass' setting")
        db.commit()

    settings = db.query(PlatformSetting).filter(PlatformSetting.key.in_(SENSITIVE_KEYS)).all()
    migrated_count = 0
    skipped_count = 0
    invalid_count = 0

    for setting in settings:
        val = setting.value
        if not val:
            skipped_count += 1
            continue

        if is_encrypted(val):
            skipped_count += 1
            continue

        # If it is plain text, encrypt it!
        try:
            encrypted_val = encrypt_value(val)
            setting.value = encrypted_val
            migrated_count += 1
            logger.info(f"[MIGRATION] Encrypted plain-text sensitive setting key: '{setting.key}'")
        except Exception as e:
            invalid_count += 1
            logger.error(f"[MIGRATION] Failed to encrypt sensitive setting key '{setting.key}': {e}")

    if migrated_count > 0:
        db.commit()
        clear_settings_cache()
        logger.info(f"[MIGRATION] Database settings migration completed: {migrated_count} migrated, {skipped_count} skipped, {invalid_count} failed.")
    else:
        logger.info("[MIGRATION] Database settings migration completed: all sensitive settings are already encrypted.")

    return {
        "migrated": migrated_count,
        "skipped": skipped_count,
        "failed": invalid_count,
        "total_sensitive_found": len(settings),
    }

