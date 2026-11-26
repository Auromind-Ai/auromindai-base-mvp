import asyncio
import hmac
import logging
import httpx
from fastapi import HTTPException, Request, status
from app.core.config import settings

logger = logging.getLogger(__name__)

CLOUDFLARE_TEST_RESPONSE_TOKEN = "1x00000000000000000000AA"
CLOUDFLARE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA"


def is_mobile_client_request(request: Request = None, token: str = None) -> bool:
    """
    Checks if a request originates from an authorized native mobile client.
    Verifies:
      1. x-client-platform header ('ios', 'android', 'mobile', 'react-native', 'expo')
      2. If MOBILE_API_SECRET is set on the backend, validates matching x-mobile-api-key.
    """
    if not request:
        return False

    client_platform = (request.headers.get("x-client-platform") or "").lower().strip()
    is_mobile_header = client_platform in ("mobile", "ios", "android", "react-native", "expo")

    user_agent = (request.headers.get("user-agent") or "").lower()
    is_mobile_ua = any(
        agent in user_agent for agent in ("okhttp", "expo", "cfnetwork", "reactnative", "dalvik")
    )

    if not (is_mobile_header or (is_mobile_ua and token == CLOUDFLARE_TEST_RESPONSE_TOKEN)):
        return False

    # If MOBILE_API_SECRET is configured, enforce shared secret validation
    mobile_secret = getattr(settings, "MOBILE_API_SECRET", None)
    is_non_prod = bool(settings.ENVIRONMENT and settings.ENVIRONMENT.lower() != "production")

    if mobile_secret:
        provided_key = request.headers.get("x-mobile-api-key") or ""
        if not hmac.compare_digest(provided_key, mobile_secret):
            logger.warning("[Turnstile] Mobile client verification failed: Invalid x-mobile-api-key")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid mobile client verification.",
            )
    elif not is_non_prod:
        # In production, require MOBILE_API_SECRET for mobile bypass to prevent header spoofing
        logger.warning(
            "[Turnstile] Mobile client verification rejected: MOBILE_API_SECRET is not configured on production backend."
        )
        return False

    return True


async def verify_turnstile_token(
    token: str,
    remote_ip: str = None,
    request: Request = None,
) -> bool:
    """
    Verifies the Cloudflare Turnstile token using the Cloudflare Siteverify API.
    Supports authenticated mobile client bypass (iOS/Android) where browser
    CAPTCHA widgets cannot be displayed natively.
    """
    # 1. Check for Mobile Client Bypass
    if request and is_mobile_client_request(request, token):
        platform_name = request.headers.get("x-client-platform", "mobile")
        logger.info(
            f"[Turnstile] Bypassed verification for verified mobile client "
            f"(Platform: {platform_name}, IP: {remote_ip})"
        )
        return True

    # 2. In non-production environments with Cloudflare test token, allow instant pass
    is_non_prod = bool(settings.ENVIRONMENT and settings.ENVIRONMENT.lower() != "production")
    if (not settings.TURNSTILE_SECRET_KEY or is_non_prod) and token == CLOUDFLARE_TEST_RESPONSE_TOKEN:
        logger.info("[Turnstile] Accepted Cloudflare test token in non-production environment")
        return True

    # 3. Missing or empty token -> 400 Bad Request
    if not token or not token.strip():
        logger.warning("[Turnstile] Verification failed: Missing token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing verification."
        )

    # 4. Validate secret key configuration
    secret_key = settings.TURNSTILE_SECRET_KEY
    if not secret_key:
        if is_non_prod:
            secret_key = CLOUDFLARE_TEST_SECRET_KEY
            logger.warning("[Turnstile] TURNSTILE_SECRET_KEY is not configured on backend. Using Cloudflare dev test secret key.")
        else:
            logger.error("[Turnstile] TURNSTILE_SECRET_KEY is not configured on the backend.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal configuration error."
            )

    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    data = {
        "secret": secret_key,
        "response": token,
    }
    if remote_ip:
        data["remoteip"] = remote_ip

    max_attempts = 2  # Initial + 1 retry
    timeout_seconds = 5.0
    backoff_seconds = 0.5

    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, data=data, timeout=timeout_seconds)

            if response.status_code != 200:
                logger.warning(
                    f"[Turnstile] siteverify returned status code {response.status_code} "
                    f"(attempt {attempt}/{max_attempts})"
                )
                if attempt == max_attempts:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Unable to verify request. Please try again later."
                    )
                await asyncio.sleep(backoff_seconds)
                continue

            res_json = response.json()
            success = res_json.get("success", False)

            if success:
                logger.info("[Turnstile] Token verified successfully")
                return True

            # If success is False, inspect error codes
            error_codes = res_json.get("error-codes", [])
            logger.warning(
                f"[Turnstile] Verification failed. Error codes: {error_codes} "
                f"(attempt {attempt}/{max_attempts})"
            )

            # Check for expired or reused token
            if "timeout-or-duplicate" in error_codes:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Verification expired."
                )

            # Other verification failures (invalid, malformed token) -> 401 Unauthorized
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Verification failed."
            )

        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.error(
                f"[Turnstile] Connection error on attempt {attempt}/{max_attempts}: "
                f"{exc.__class__.__name__}: {exc}"
            )
            if attempt == max_attempts:
                # Fail closed with 503 Service Unavailable
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to verify request. Please try again later."
                )
            await asyncio.sleep(backoff_seconds)

    # Fallback fail closed
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Unable to verify request. Please try again later."
    )
