import asyncio
import logging
import httpx
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)


async def verify_turnstile_token(token: str, remote_ip: str = None) -> bool:
    """
    Verifies the Cloudflare Turnstile token using the Cloudflare Siteverify API.
    Handles timeout, retries, maps Cloudflare responses to FastAPI HTTPExceptions,
    and forwards remote_ip.
    """
    print(f"[Turnstile] Verifying token... Token snippet: {token[:15] if token else 'None'}... Remote IP: {remote_ip}")
    # 1. Missing or empty token -> 400 Bad Request
    if not token or not token.strip():
        print("[Turnstile] Verification failed: Missing token")
        logger.warning("[Turnstile] Verification failed: Missing token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing verification."
        )

    # Validate secret key configuration
    if not settings.TURNSTILE_SECRET_KEY:
        print("[Turnstile] TURNSTILE_SECRET_KEY is not configured on the backend.")
        logger.error("[Turnstile] TURNSTILE_SECRET_KEY is not configured on the backend.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal configuration error."
        )

    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    data = {
        "secret": settings.TURNSTILE_SECRET_KEY,
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
                print(f"[Turnstile] siteverify returned status code {response.status_code} (attempt {attempt}/{max_attempts})")
                logger.warning(
                    f"[Turnstile] siteverify returned status code {response.status_code} "
                    f"(attempt {attempt}/{max_attempts})"
                )
                if attempt == max_attempts:
                    print("[Turnstile] Token verification failed (503 Service Unavailable)")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Unable to verify request. Please try again later."
                    )
                await asyncio.sleep(backoff_seconds)
                continue

            res_json = response.json()
            success = res_json.get("success", False)

            if success:
                print("[Turnstile] Token verified successfully")
                logger.info("[Turnstile] Token verified successfully")
                return True

            # If success is False, inspect error codes
            error_codes = res_json.get("error-codes", [])
            print(f"[Turnstile] Token verification failed. Error codes: {error_codes}")
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
            print(f"[Turnstile] Connection error on attempt {attempt}/{max_attempts}: {exc}")
            logger.error(
                f"[Turnstile] Connection error on attempt {attempt}/{max_attempts}: "
                f"{exc.__class__.__name__}: {exc}"
            )
            if attempt == max_attempts:
                print("[Turnstile] Token verification failed due to connection error")
                # Fail closed with 503 Service Unavailable
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Unable to verify request. Please try again later."
                )
            await asyncio.sleep(backoff_seconds)

    # Fallback fail closed
    print("[Turnstile] Token verification failed (Fallback)")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Unable to verify request. Please try again later."
    )
