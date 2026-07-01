
import logging
import threading
from typing import Optional

from sentence_transformers import CrossEncoder

logger = logging.getLogger(__name__)


_reranker_cache = {}
_reranker_cache_lock = threading.Lock()


class RerankerService:
 
    def __init__(self, model_name: str) -> None:
        logger.info("Loading reranker model: %s", model_name)
        self._model = CrossEncoder(model_name)
        logger.info("Reranker model loaded successfully: %s", model_name)

    def predict(self, pairs: list) -> list:
        return self._model.predict(pairs)

    async def predict_async(self, pairs: list) -> list:
        import asyncio
        return await asyncio.to_thread(self.predict, pairs)


def get_reranker() -> RerankerService:
    from app.services.config_service import config_service
    model_name = config_service.get("reranker_model_name", "cross-encoder/ms-marco-MiniLM-L-6-v2")

    global _reranker_cache
    if model_name not in _reranker_cache:
        with _reranker_cache_lock:
            if model_name not in _reranker_cache:
                # Clear existing cache entries to free memory before loading a new model
                _reranker_cache.clear()
                _reranker_cache[model_name] = RerankerService(model_name)
    return _reranker_cache[model_name]