import time
import logging
import requests
from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

PORTFOLIO_TIER_LIMITS: Dict[str, float] = {
    "TIER_50": 50,
    "50": 50,
    "TIER_250": 250,
    "250": 250,
    "TIER_1K": 1000,
    "1000": 1000,
    "TIER_2K": 2000,
    "2000": 2000,
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
        waba_id: Optional[str] = None,
        access_token: Optional[str] = None,
        business_id: Optional[str] = None,
        phone_number_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not access_token or not (phone_number_id or waba_id):
            return {
                "tier_label": "NOT_CONNECTED",
                "daily_limit": 0,
                "quality_score": "NOT_CONNECTED",
                "is_connected": False,
            }

        tier_label = None
        daily_limit = None
        quality_score = "UNKNOWN"
        is_connected = False

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # 1. First attempt: Query Phone Number node (official WhatsApp Cloud API tier location)
        if phone_number_id:
            try:
                url = f"https://graph.facebook.com/v21.0/{phone_number_id}"
                params = {
                    "fields": "id,messaging_limit_tier,quality_rating,display_phone_number",
                }
                res = requests.get(url, params=params, headers=headers, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    is_connected = True
                    quality_score = data.get("quality_rating") or "GREEN"
                    raw_tier = data.get("messaging_limit_tier")
                    if raw_tier:
                        tier_label = str(raw_tier).upper()
                        daily_limit = PORTFOLIO_TIER_LIMITS.get(tier_label, 1000)
                else:
                    logger.warning("Meta Phone Number tier fetch returned %s: %s", res.status_code, res.text)
            except Exception as exc:
                logger.error("Error querying Meta Phone Number node: %s", exc)

        # 2. Second attempt: If daily_limit not resolved, query WABA node
        if daily_limit is None and waba_id:
            try:
                url = f"https://graph.facebook.com/v21.0/{waba_id}"
                params = {
                    "fields": "id,whatsapp_business_manager_messaging_limit,owner_business_info,phone_numbers{id,messaging_limit_tier,quality_rating}",
                }
                res = requests.get(url, params=params, headers=headers, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    is_connected = True
                    phone_data = (data.get("phone_numbers") or {}).get("data", [])
                    if phone_data:
                        first_phone = phone_data[0]
                        quality_score = first_phone.get("quality_rating") or quality_score
                        raw_tier = first_phone.get("messaging_limit_tier")
                        if raw_tier:
                            tier_label = str(raw_tier).upper()
                            daily_limit = PORTFOLIO_TIER_LIMITS.get(tier_label, 1000)

                    if daily_limit is None:
                        raw_limit = data.get("whatsapp_business_manager_messaging_limit")
                        if raw_limit:
                            tier_label = str(raw_limit).upper()
                            daily_limit = PORTFOLIO_TIER_LIMITS.get(tier_label, 1000)
                else:
                    logger.warning("Meta WABA tier fetch returned %s: %s", res.status_code, res.text)
            except Exception as exc:
                logger.error("Error querying Meta WABA node: %s", exc)

        if daily_limit is not None:
            return {
                "tier_label": tier_label or "TIER_1K",
                "daily_limit": int(daily_limit),
                "quality_score": quality_score,
                "is_connected": True,
            }

        # If Meta call succeeded but no explicit tier field returned, default to standard Meta starting tier 1000
        if is_connected:
            return {
                "tier_label": "TIER_1K",
                "daily_limit": 1000,
                "quality_score": quality_score,
                "is_connected": True,
            }

        # If Meta returned error (e.g. 400 Invalid OAuth token, expired token), line is not valid/connected
        return {
            "tier_label": "NOT_CONNECTED",
            "daily_limit": 0,
            "quality_score": "NOT_CONNECTED",
            "is_connected": False,
        }

    @classmethod
    def check_and_register_recipient(
        cls,
        redis_client,
        portfolio_id: str,
        recipient_normalized_phone: str,
        portfolio_tier_limit: int = 1000,
        rolling_window_seconds: int = 86400
    ) -> Tuple[bool, int]:
        if not redis_client:
            # In memory / fallback mode without redis
            return True, 0

        if portfolio_tier_limit == float("inf"):
            return True, 0

        if portfolio_tier_limit <= 0:
            return False, int(time.time()) + 3600

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
            return True, 0

    @classmethod
    def get_portfolio_usage(
        cls,
        redis_client,
        portfolio_id: str,
        portfolio_tier_limit: int = 1000,
        rolling_window_seconds: int = 86400,
        db=None,
        workspace_id=None,
    ) -> Dict[str, Any]:
        if portfolio_tier_limit <= 0:
            return {
                "used": 0,
                "limit": 0,
                "remaining": 0,
                "next_unlock_at": None,
            }

        if not redis_client:
            used = 0
            if db and workspace_id:
                try:
                    from app.models.campaign import CampaignRecipient
                    cutoff_dt = datetime.now(timezone.utc) - timedelta(seconds=rolling_window_seconds)
                    used = db.query(CampaignRecipient.normalized_phone).filter(
                        CampaignRecipient.workspace_id == workspace_id,
                        CampaignRecipient.status.in_(["sent", "delivered", "read", "accepted"]),
                        CampaignRecipient.accepted_at >= cutoff_dt
                    ).distinct().count()
                except Exception as e:
                    logger.debug("DB usage query notice: %s", e)
            return {
                "used": used,
                "limit": portfolio_tier_limit,
                "remaining": max(0, int(portfolio_tier_limit - used)),
                "next_unlock_at": None,
            }

        key = cls.get_portfolio_redis_key(portfolio_id)
        now_ts = int(time.time())
        cutoff = now_ts - rolling_window_seconds

        try:
            # Evict stale entries
            redis_client.zremrangebyscore(key, "-inf", cutoff)
            used = redis_client.zcard(key) or 0

            # If Redis counter is 0, check DB if available
            if used == 0 and db and workspace_id:
                try:
                    from app.models.campaign import CampaignRecipient
                    cutoff_dt = datetime.now(timezone.utc) - timedelta(seconds=rolling_window_seconds)
                    db_used = db.query(CampaignRecipient.normalized_phone).filter(
                        CampaignRecipient.workspace_id == workspace_id,
                        CampaignRecipient.status.in_(["sent", "delivered", "read", "accepted"]),
                        CampaignRecipient.accepted_at >= cutoff_dt
                    ).distinct().count()
                    if db_used > 0:
                        used = db_used
                except Exception as db_exc:
                    logger.debug("DB usage query notice: %s", db_exc)

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
