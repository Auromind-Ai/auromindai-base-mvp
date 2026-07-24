from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app.services.platform_settings_service import get_all_settings, update_settings, SENSITIVE_KEYS, _parse_value
from app.utils.crypto import is_encrypted, decrypt_value
from app.models.admin_audit_log import AdminAuditLog
from jose import jwt
from app.core.config import settings as core_settings
from app.services.platform_settings_service import get_prospective_settings
import time
router = APIRouter()

SENSITIVE_MASK = "••••••••"


def _sanitize_response(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Mask all sensitive values before sending to the client."""
    sanitized = settings.copy()
    for key in SENSITIVE_KEYS:
        if key in sanitized and sanitized[key]:
            sanitized[key] = SENSITIVE_MASK
    return sanitized


@router.get("/settings")
async def get_platform_settings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    
    try:
        return _sanitize_response(get_all_settings(db))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching settings: {str(e)}")


@router.post("/settings")
async def update_platform_settings(
    request: Request,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    
    try:
        # Determine admin user identity
        admin_user = "platform_admin"
        token = request.cookies.get("admin_session")
        if token:
            try:
                payload = jwt.decode(token, core_settings.SECRET_KEY, algorithms=[core_settings.ALGORITHM])
                admin_user = payload.get("sub", "platform_admin")
            except Exception:
                pass

        # Identify client IP
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.headers.get("x-real-ip", request.client.host if request.client else "unknown").strip()

        # Fetch old values of the keys being updated
        from app.models.platform_setting import PlatformSetting
        old_settings = db.query(PlatformSetting).filter(PlatformSetting.key.in_(updates.keys())).all()
        old_values = {}
        for s in old_settings:
            val = s.value
            if s.key in SENSITIVE_KEYS and val:
                if is_encrypted(val):
                    try:
                        val = decrypt_value(val)
                    except Exception:
                        pass
            else:
                val = _parse_value(val, s.value_type)
            old_values[s.key] = val

        # Now update the settings
        result = update_settings(db, updates)

        # Diff old and new values to check for changes
        changes_old = {}
        changes_new = {}
        for key, new_val in updates.items():
            old_val = old_values.get(key)
            if old_val != new_val:
                changes_old[key] = old_val
                changes_new[key] = new_val

        # Create AdminAuditLog if there are changes
        if changes_old or changes_new:
            def mask_val(k, v):
                return "••••••••" if k in SENSITIVE_KEYS and v else v
            
            masked_old = {k: mask_val(k, v) for k, v in changes_old.items()}
            masked_new = {k: mask_val(k, v) for k, v in changes_new.items()}

            infra_keys = {
                "smtp_host", "smtp_port", "smtp_user", "smtp_password", "from_email",
                "google_client_id", "google_client_secret", "oauth_redirect_uri", "google_integration_redirect_uri",
                "meta_verify_token", "meta_app_id", "meta_app_secret", "meta_system_user_token",
                "ig_app_id", "ig_app_secret", "ig_redirect_uri",
                "storage_provider", "supabase_url", "supabase_service_role_key", "supabase_bucket",
                "aws_access_key_id", "aws_secret_access_key", "aws_region", "aws_s3_bucket",
                "aws_s3_endpoint_url", "aws_s3_public_base_url"
            }
            
            is_infra_update = any(k in infra_keys for k in changes_new.keys())
            action_name = "UPDATE_INFRASTRUCTURE_SETTINGS" if is_infra_update else "UPDATE_PLATFORM_SETTINGS"

            log = AdminAuditLog(
                admin_user_id=admin_user,
                action=action_name,
                old_value=masked_old,
                new_value=masked_new,
                ip_address=ip
            )
            db.add(log)

        # Synchronize plans table
        from app.services.billing.plan_service import PlanService
        plan_service = PlanService()
        for plan_key in ["free", "pro", "enterprise"]:
            config = plan_service._get_plan_config(db, plan_key)
            plan_service._get_or_create_plan(db, config)
        db.commit()

        return _sanitize_response(result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")


def _get_audit_details(request: Request) -> tuple[str, str]:
    admin_user = "platform_admin"
    token = request.cookies.get("admin_session")
    if token:
        try:
            payload = jwt.decode(token, core_settings.SECRET_KEY, algorithms=[core_settings.ALGORITHM])
            admin_user = payload.get("sub", "platform_admin")
        except Exception:
            pass

    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.headers.get("x-real-ip", request.client.host if request.client else "unknown").strip()
    return admin_user, ip


def _log_test_audit(db: Session, admin_user: str, ip: str, action: str, status: str, details: dict):
    # Mask any potential sensitive details
    masked_details = details.copy()
    for k in SENSITIVE_KEYS:
        if k in masked_details:
            masked_details[k] = "••••••••"
    
    log = AdminAuditLog(
        admin_user_id=admin_user,
        action=action,
        old_value={"status": "IN_PROGRESS"},
        new_value={"status": status, **masked_details},
        ip_address=ip
    )
    db.add(log)
    db.commit()


def make_test_response(success: bool, service: str, message: str, latency_ms: int, error_code: str = None) -> Dict[str, Any]:
    res = {
        "success": success,
        "service": service,
        "message": message,
        "latency_ms": latency_ms
    }
    if error_code:
        res["error_code"] = error_code
    return res


@router.post("/settings/test/smtp")
async def test_smtp_connection(
    request: Request,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    import time
    import smtplib
    
    start_time = time.time()
    admin_user, ip = _get_audit_details(request)
    
    from app.services.platform_settings_service import get_prospective_settings
    settings = get_prospective_settings(db, updates)
    
    smtp_host = settings.get("smtp_host", "")
    smtp_port_val = settings.get("smtp_port")
    smtp_user = settings.get("smtp_user", "")
    smtp_password = settings.get("smtp_password", "")
    
    if not smtp_host or not smtp_port_val:
        return make_test_response(False, "smtp", "Missing host or port", 0, "INVALID_CONFIGURATION")
        
    try:
        smtp_port = int(smtp_port_val)
    except Exception:
        return make_test_response(False, "smtp", "SMTP port must be an integer", 0, "INVALID_PORT")

    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10.0)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10.0)
            server.ehlo()
            if server.has_extn("STARTTLS"):
                server.starttls()
                server.ehlo()
        
        if smtp_user and smtp_password:
            server.login(smtp_user, smtp_password)
            
        server.noop()
        server.quit()
        
        latency = int((time.time() - start_time) * 1000)
        _log_test_audit(db, admin_user, ip, "TEST_SMTP_CONNECTION", "SUCCESS", {})
        return make_test_response(True, "smtp", "SMTP connection and authentication successful", latency)
        
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        _log_test_audit(db, admin_user, ip, "TEST_SMTP_CONNECTION", "FAILED", {"error": error_msg})
        return make_test_response(False, "smtp", f"SMTP test failed: {error_msg}", latency, "SMTP_CONNECTION_FAILED")


@router.post("/settings/test/google")
async def test_google_connection(
    request: Request,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    import time
    start_time = time.time()
    admin_user, ip = _get_audit_details(request)
    
    
    settings = get_prospective_settings(db, updates)
    
    client_id = settings.get("google_client_id")
    client_secret = settings.get("google_client_secret")
    redirect_uri = settings.get("google_integration_redirect_uri") or settings.get("oauth_redirect_uri", "https://localhost:3000")
    
    if not client_id or not client_secret:
        return make_test_response(False, "google", "Google Client ID and Secret are required", 0, "INVALID_CONFIGURATION")
        
    try:
        from google_auth_oauthlib.flow import Flow
        from app.services.integration_service import GOOGLE_SCOPES
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=GOOGLE_SCOPES
        )
        flow.redirect_uri = redirect_uri
        
        # Attempt to build authorization URL (local computation, does not hit API but validates structure/config)
        flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        latency = int((time.time() - start_time) * 1000)
        _log_test_audit(db, admin_user, ip, "TEST_GOOGLE_CONNECTION", "SUCCESS", {})
        return make_test_response(True, "google", "Google OAuth configuration initialized successfully", latency)
        
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        _log_test_audit(db, admin_user, ip, "TEST_GOOGLE_CONNECTION", "FAILED", {"error": error_msg})
        return make_test_response(False, "google", f"Google OAuth validation failed: {error_msg}", latency, "GOOGLE_CONFIG_FAILED")


@router.post("/settings/test/meta")
async def test_meta_connection(
    request: Request,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    import time
    import requests
    
    start_time = time.time()
    admin_user, ip = _get_audit_details(request)
    
    from app.services.platform_settings_service import get_prospective_settings
    settings = get_prospective_settings(db, updates)
    
    app_id = settings.get("meta_app_id")
    app_secret = settings.get("meta_app_secret")
    system_user_token = settings.get("meta_system_user_token")
    
    if not app_id or not app_secret:
        return make_test_response(False, "meta", "Meta App ID and Secret are required", 0, "INVALID_CONFIGURATION")
        
    try:
        # 1. Test App ID & Secret by querying the App details
        app_res = requests.get(
            f"https://graph.facebook.com/v19.0/{app_id}",
            params={"access_token": f"{app_id}|{app_secret}"},
            timeout=10.0
        )
        app_data = app_res.json()
        if "error" in app_data:
            raise ValueError(app_data["error"].get("message", "Invalid App credentials"))
            
        # 2. If System User Token is provided, verify it too
        if system_user_token:
            me_res = requests.get(
                "https://graph.facebook.com/v19.0/me",
                params={"access_token": system_user_token},
                timeout=10.0
            )
            me_data = me_res.json()
            if "error" in me_data:
                raise ValueError(f"System User Token invalid: {me_data['error'].get('message', 'Access denied')}")
                
        latency = int((time.time() - start_time) * 1000)
        _log_test_audit(db, admin_user, ip, "TEST_META_CONNECTION", "SUCCESS", {})
        return make_test_response(True, "meta", "Meta App credentials verified successfully", latency)
        
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        _log_test_audit(db, admin_user, ip, "TEST_META_CONNECTION", "FAILED", {"error": error_msg})
        return make_test_response(False, "meta", f"Meta OAuth test failed: {error_msg}", latency, "META_TEST_FAILED")


@router.post("/settings/test/supabase")
async def test_supabase_connection(
    request: Request,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    import time
    import requests
    
    start_time = time.time()
    admin_user, ip = _get_audit_details(request)
    
    from app.services.platform_settings_service import get_prospective_settings
    settings = get_prospective_settings(db, updates)
    
    url = settings.get("supabase_url")
    key = settings.get("supabase_service_role_key") or settings.get("supabase_anon_key")
    bucket = settings.get("supabase_bucket", "uploads")
    
    if not url or not key:
        return make_test_response(False, "supabase", "Supabase URL and Service Role Key are required", 0, "INVALID_CONFIGURATION")
        
    try:
        # Perform manual check of list buckets endpoint with a 10s timeout
        res = requests.get(
            f"{url.rstrip('/')}/storage/v1/bucket",
            headers={"Authorization": f"Bearer {key}", "apikey": key},
            timeout=10.0
        )
        if res.status_code != 200:
            raise ValueError(f"Supabase storage returned status {res.status_code}: {res.text}")
            
        buckets = res.json()
        bucket_names = [b.get("id") for b in buckets]
        if bucket not in bucket_names:
            raise ValueError(f"Bucket '{bucket}' not found in Supabase Storage. Available buckets: {', '.join(bucket_names) if bucket_names else 'None'}")
            
        latency = int((time.time() - start_time) * 1000)
        _log_test_audit(db, admin_user, ip, "TEST_SUPABASE_CONNECTION", "SUCCESS", {})
        return make_test_response(True, "supabase", "Supabase storage connection verified successfully", latency)
        
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        _log_test_audit(db, admin_user, ip, "TEST_SUPABASE_CONNECTION", "FAILED", {"error": error_msg})
        return make_test_response(False, "supabase", f"Supabase connection failed: {error_msg}", latency, "SUPABASE_TEST_FAILED")


@router.post("/settings/test/s3")
async def test_s3_connection(
    request: Request,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    
    start_time = time.time()
    admin_user, ip = _get_audit_details(request)
    
    from app.services.platform_settings_service import get_prospective_settings
    settings = get_prospective_settings(db, updates)
    
    bucket = settings.get("aws_s3_bucket")
    region = settings.get("aws_region")
    access_key = settings.get("aws_access_key_id")
    secret_key = settings.get("aws_secret_access_key")
    endpoint_url = settings.get("aws_s3_endpoint_url")
    
    if not bucket or not access_key or not secret_key:
        return make_test_response(False, "s3", "S3 Bucket, Access Key, and Secret Key are required", 0, "INVALID_CONFIGURATION")
        
    try:
        import boto3
        from botocore.config import Config
        config = Config(connect_timeout=10.0, read_timeout=10.0, retries={'max_attempts': 0})
        s3 = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            endpoint_url=endpoint_url,
            config=config
        )
        
        # Check bucket existence/permissions using head_bucket
        s3.head_bucket(Bucket=bucket)
        
        latency = int((time.time() - start_time) * 1000)
        _log_test_audit(db, admin_user, ip, "TEST_S3_CONNECTION", "SUCCESS", {})
        return make_test_response(True, "s3", "S3 Bucket connection verified successfully", latency)
        
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        _log_test_audit(db, admin_user, ip, "TEST_S3_CONNECTION", "FAILED", {"error": error_msg})
        return make_test_response(False, "s3", f"S3 connection failed: {error_msg}", latency, "S3_TEST_FAILED")


@router.post("/settings/test/email_template")
async def test_email_template(
    request: Request,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    import time
    import os
    start_time = time.time()
    admin_user, ip = _get_audit_details(request)
    
    updates = payload.get("updates", {})
    template_key = payload.get("template_key", "")
    test_recipient = payload.get("test_recipient", "")
    
    if not test_recipient:
        return make_test_response(False, "email_template", "Recipient email is required", 0, "INVALID_RECIPIENT")
        
    from app.services.platform_settings_service import get_prospective_settings
    settings = get_prospective_settings(db, updates)
    
    # Temporarily override OS env vars or config_service settings to use these prospective SMTP settings
    smtp_keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "from_email"]
    old_env = {}
    for key in smtp_keys:
        val = settings.get(key)
        env_key = key.upper()
        old_env[env_key] = os.environ.get(env_key)
        if val is not None:
            os.environ[env_key] = str(val)
            
    try:
        from app.services.email_service import EmailService
        
        # Determine subject and body templates from prospective settings
        db_subject = settings.get(f"{template_key}_subject") or "Test Email"
        db_body = settings.get(f"{template_key}_body") or "This is a test email."
        
        # Build mock variables for the template
        mock_vars = {
            "user_name": "Test User",
            "otp": "123456",
            "otp_code": "123456",
            "credits": "500",
            "order_id": "order_test_987654",
            "payment_id": "pay_test_123456",
            "amount": "999.00",
            "currency": "INR",
            "workspace_name": "Test AI Workspace",
            "customer_phone": "+1234567890",
            "last_message": "Hello, I have a question about bulk pricing."
        }
        
        subject = EmailService.render_template(db_subject, mock_vars)
        body = EmailService.render_template(db_body, mock_vars)
        
        EmailService.send_email(
            to_email=test_recipient,
            subject=subject,
            body=body
        )
        
        latency = int((time.time() - start_time) * 1000)
        _log_test_audit(db, admin_user, ip, f"TEST_EMAIL_TEMPLATE_{template_key.upper()}", "SUCCESS", {"to": test_recipient})
        return make_test_response(True, "email_template", f"Test email sent successfully to {test_recipient}", latency)
        
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        _log_test_audit(db, admin_user, ip, f"TEST_EMAIL_TEMPLATE_{template_key.upper()}", "FAILED", {"error": error_msg})
        return make_test_response(False, "email_template", f"Failed to send test email: {error_msg}", latency, "EMAIL_TEST_FAILED")
        
    finally:
        # Restore environment variables
        for env_key, old_val in old_env.items():
            if old_val is None:
                os.environ.pop(env_key, None)
            else:
                os.environ[env_key] = old_val


