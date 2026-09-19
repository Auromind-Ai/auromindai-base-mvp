import time
import logging
import requests
from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

PORTFOLIO_TIER_LIMITS: Dict[str, float] = {
    "TIER_250": 250,
    "250": 250,
    "TIER_2K": 2000,
    "2000": 2000,
    "TIER_1K": 2000, 
    "1000": 2000,
    "TIER_10K": 10000,
    "10000": 10000,
    "TIER_100K": 100000,
    "100000": 100000,
    "TIER_UNLIMITED": float("inf"),
    "UNLIMITED": float("inf"),
}


CHECK_PORTFOLIO_QUOTA_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local recipient = ARGV[3]
local limit = tonumber(ARGV[4])

-- 1. Evict entries outside the rolling 24-hour window
local cutoff = now - window
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

-- 2. Check if recipient was already contacted in the current 24-hour window
local existing_score = redis.call('ZSCORE', key, recipient)
if existing_score then
    -- Already counted in rolling 24h; allowed without taking a new slot
    return {1, 0}
end

-- 3. Check current unique recipient count against Portfolio Limit
local current_count = redis.call('ZCARD', key)
if current_count < limit then
    redis.call('ZADD', key, now, recipient)
    redis.call('EXPIRE', key, window + 3600)
    return {1, 0}
else
    -- Portfolio quota exhausted: determine exact second oldest member leaves rolling window
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    if oldest and #oldest >= 2 then
        local oldest_ts = tonumber(oldest[2])
        local wake_up_ts = oldest_ts + window
        return {0, wake_up_ts}
    else
        return {0, now + window}
    end
end
"""


class WhatsAppTierService:
    @staticmethod
    def get_portfolio_redis_key(portfolio_id: str) -> str:
        return f"wa:portfolio:{portfolio_id}:unique_recipients"

    @classmethod
    def fetch_live_portfolio_tier(
        cls,
        waba_id: str,
        access_token: str,
        business_id: Optional[str] = None
    ) -> Dict[str, Any]:
        tier_label = "2000"
        daily_limit = 2000
        quality_score = "GREEN"

        try:
            # 1. First attempt: Query WABA node
            url = f"https://graph.facebook.com/v21.0/{waba_id}"
            params = {
                "fields": "id,whatsapp_business_manager_messaging_limit,owner_business_info",
                "access_token": access_token
            }
            res = requests.get(url, params=params, timeout=8)
            if res.status_code == 200:
                data = res.json()
                raw_limit = data.get("whatsapp_business_manager_messaging_limit")
                if raw_limit:
                    tier_label = str(raw_limit).upper()
                    daily_limit = PORTFOLIO_TIER_LIMITS.get(tier_label, 2000)
            else:
                logger.warning("Meta WABA tier fetch returned %s: %s", res.status_code, res.text)
        except Exception as exc:
            logger.error("Error fetching Meta live portfolio tier: %s", exc)

        return {
            "tier_label": tier_label,
            "daily_limit": daily_limit,
            "quality_score": quality_score
        }

    @classmethod
    def check_and_register_recipient(
        cls,
        redis_client,
        portfolio_id: str,
        recipient_normalized_phone: str,
        portfolio_tier_limit: int = 2000,
        rolling_window_seconds: int = 86400
    ) -> Tuple[bool, int]:
        if not redis_client:
            # In memory / fallback mode without redis
            return True, 0

        if portfolio_tier_limit == float("inf"):
            return True, 0

        key = cls.get_portfolio_redis_key(portfolio_id)
        now_ts = int(time.time())

        try:
            result = redis_client.eval(
                CHECK_PORTFOLIO_QUOTA_LUA,
                1,
                key,
                now_ts,
                rolling_window_seconds,
                recipient_normalized_phone,
                portfolio_tier_limit
            )
            is_allowed = bool(result[0] == 1)
            wake_up_ts = int(result[1])
            return is_allowed, wake_up_ts
        except Exception as exc:
            logger.error("Redis Lua script error on portfolio quota check: %s", exc)
            # Fallback to permissive on redis error to avoid blocking critical traffic
            return True, 0

    @classmethod
    def get_portfolio_usage(
        cls,
        redis_client,
        portfolio_id: str,
        portfolio_tier_limit: int = 2000,
        rolling_window_seconds: int = 86400
    ) -> Dict[str, Any]:
        """
        Returns the current rolling 24-hour unique recipient consumption for dashboard reporting.
        """
        if not redis_client:
            return {
                "used": 0,
                "limit": portfolio_tier_limit,
                "remaining": portfolio_tier_limit,
                "next_unlock_at": None
            }

        key = cls.get_portfolio_redis_key(portfolio_id)
        now_ts = int(time.time())
        cutoff = now_ts - rolling_window_seconds

        try:
            # Evict stale entries
            redis_client.zremrangebyscore(key, "-inf", cutoff)
            used = redis_client.zcard(key) or 0
            remaining = max(0, int(portfolio_tier_limit - used))

            next_unlock_at = None
            if used >= portfolio_tier_limit:
                oldest = redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    oldest_ts = int(oldest[0][1])
                    next_unlock_at = datetime.fromtimestamp(oldest_ts + rolling_window_seconds, tz=timezone.utc).isoformat()

            return {
                "used": used,
                "limit": portfolio_tier_limit,
                "remaining": remaining,
                "next_unlock_at": next_unlock_at
            }
        except Exception as exc:
            logger.error("Error reading portfolio usage from Redis: %s", exc)
            return {
                "used": 0,
                "limit": portfolio_tier_limit,
                "remaining": portfolio_tier_limit,
                "next_unlock_at": None
            }
