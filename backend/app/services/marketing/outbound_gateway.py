import time
import logging
import requests
from typing import Dict, Any, Optional
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# Throughput rate limit constants
META_THEORETICAL_MAX_MPS = 80
ORBION_SAFE_DISPATCH_MPS = 40   
ORBION_AGGRESSIVE_MPS = 60       
ORBION_CONSERVATIVE_MPS = 20    

TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill_rate = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])

if not tokens or not last_updated then
    tokens = capacity
    last_updated = now
else
    local elapsed = math.max(0, now - last_updated)
    tokens = math.min(capacity, tokens + (elapsed * refill_rate))
    last_updated = now
end

if tokens >= 1 then
    tokens = tokens - 1
    redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last_updated)
    redis.call('EXPIRE', key, 60)
    return 1 -- Token granted
else
    redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last_updated)
    redis.call('EXPIRE', key, 60)
    return 0 -- Rate limited
end
"""


class WhatsAppOutboundGateway:
    _session: Optional[requests.Session] = None

    @classmethod
    def get_pooled_session(cls) -> requests.Session:
        if cls._session is None:
            session = requests.Session()
            adapter = HTTPAdapter(
                pool_connections=50,
                pool_maxsize=100,
                max_retries=Retry(
                    total=2,
                    backoff_factor=0.2,
                    status_forcelist=[500, 502, 503, 504],
                ),
            )
            session.mount("https://", adapter)
            session.mount("http://", adapter)
            cls._session = session
        return cls._session

    @classmethod
    def acquire_phone_token(
        cls,
        redis_client,
        phone_number_id: str,
        target_mps: int = ORBION_SAFE_DISPATCH_MPS,
        timeout_seconds: float = 2.0
    ) -> bool:
        if not redis_client:
            return True

        key = f"wa:mps:{phone_number_id}"
        deadline = time.time() + timeout_seconds

        while time.time() < deadline:
            now = time.time()
            try:
                granted = redis_client.eval(
                    TOKEN_BUCKET_LUA,
                    1,
                    key,
                    now,
                    target_mps,
                    float(target_mps)
                )
                if granted == 1:
                    return True
            except Exception as exc:
                logger.error("Error evaluating token bucket in Redis: %s", exc)
                return True

            time.sleep(0.025)  # 25ms jitter pause before retry

        logger.warning("Token bucket acquisition timed out for phone %s at %s MPS", phone_number_id, target_mps)
        return False

    @classmethod
    def send_meta_message(
        cls,
        access_token: str,
        phone_number_id: str,
        payload: Dict[str, Any],
        redis_client=None,
        target_mps: int = ORBION_SAFE_DISPATCH_MPS,
    ) -> Dict[str, Any]:
        
        # 1. Acquire throughput token
        cls.acquire_phone_token(
            redis_client=redis_client,
            phone_number_id=phone_number_id,
            target_mps=target_mps,
            timeout_seconds=2.0
        )

        # 2. Dispatch via pooled connection
        session = cls.get_pooled_session()
        url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            resp = session.post(url, headers=headers, json=payload, timeout=10)
            status_code = resp.status_code
            data = resp.json() if resp.content else {}

            if status_code in (200, 201):
                messages = data.get("messages", [])
                wamid = messages[0].get("id") if messages else None
                return {
                    "success": True,
                    "status": "accepted",
                    "wamid": wamid,
                    "raw": data
                }

            # Handle Meta Cloud API Errors
            error_data = data.get("error", {})
            error_code = error_data.get("code")
            error_msg = error_data.get("message", "Unknown Meta API error")

            # Meta Error 131049: Per-user marketing template frequency cap hit
            if error_code == 131049:
                return {
                    "success": False,
                    "status": "skipped_marketing_frequency_limit",
                    "error_code": "131049",
                    "error_message": error_msg,
                    "is_marketing_frequency_limit": True
                }

            # Meta Error 130429: Cloud API Rate Limit exceeded
            if error_code == 130429 or status_code == 429:
                return {
                    "success": False,
                    "status": "rate_limited",
                    "error_code": "130429",
                    "error_message": error_msg,
                    "is_rate_limited": True
                }

            return {
                "success": False,
                "status": "failed",
                "error_code": str(error_code) if error_code else str(status_code),
                "error_message": error_msg
            }
        except Exception as exc:
            logger.error("Outbound Gateway HTTP transport error for phone %s: %s", phone_number_id, exc)
            return {
                "success": False,
                "status": "failed",
                "error_code": "TRANSPORT_ERROR",
                "error_message": str(exc)
            }
