import yaml
import time
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)
CONFIG_DIR = Path(__file__).parent.parent / "config" / "scoring"

class ScoringConfig:
    def __init__(self, business_type: str = "default"):
        self.business_type = business_type
        self._config: dict[str, Any] = {}
        self._last_loaded: float = 0
        self._cache_ttl: int = 60
        self._load()

    def _get_config_path(self) -> Path:
        specific = CONFIG_DIR / f"{self.business_type}.yaml"
        if specific.exists():
            return specific
        return CONFIG_DIR / "default.yaml"

    def _load(self) -> None:
        path = self._get_config_path()
        try:
            with open(path) as f:
                data = yaml.safe_load(f)
            self._config = data
            self._cache_ttl = data.get("cache_ttl_seconds", 60)
            self._last_loaded = time.time()
            logger.info(f"Scoring config loaded: {path}")
        except Exception as e:
            logger.error(f"Config load failed: {e}")

    def _maybe_reload(self) -> None:
        if time.time() - self._last_loaded > self._cache_ttl:
            self._load()

    def get_weights(self) -> dict[str, int]:
        self._maybe_reload()
        return self._config.get("signal_weights", {})

    def get_cap(self, key: str) -> int:
        self._maybe_reload()
        return self._config.get("caps", {}).get(key, 0)

    def get_tier(self, score: int) -> str:
        self._maybe_reload()
        tiers = self._config.get("tiers", {"hot": 75, "warm": 40})
        if score >= tiers.get("hot", 75):
            return "hot"
        if score >= tiers.get("warm", 40):
            return "warm"
        return "cold"

    def get_status_threshold(self, key: str) -> int:
        self._maybe_reload()
        return self._config.get("status_thresholds", {}).get(key, 0)

    def get_worker_config(self, key: str) -> int:
        self._maybe_reload()
        return self._config.get("worker", {}).get(key, 0)


_config_cache: dict[str, ScoringConfig] = {}

def get_scoring_config(business_type: str = "default") -> ScoringConfig:
    if business_type not in _config_cache:
        _config_cache[business_type] = ScoringConfig(business_type)
    return _config_cache[business_type]
