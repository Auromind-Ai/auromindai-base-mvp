
import logging
import threading
from typing import Optional

from sentence_transformers import CrossEncoder

from app.core.config import settings

logger = logging.getLogger(__name__)


_reranker_instance: Optional["RerankerService"] = None
_reranker_lock = threading.Lock()

RERANKER_MODEL_NAME: str = getattr(settings, "RERANKER_MODEL_NAME", "BAAI/bge-reranker-large")


class RerankerService:
 
    def __init__(self, model_name: str = RERANKER_MODEL_NAME) -> None:
        logger.info("Loading reranker model: %s", model_name)
        self._model = CrossEncoder(model_name)
        logger.info("Reranker model loaded successfully: %s", model_name)

    def predict(self, pairs: list) -> list:
        return self._model.predict(pairs)


def get_reranker() -> RerankerService:

    global _reranker_instance
    if _reranker_instance is None:       
        with _reranker_lock:
            if _reranker_instance is None: 
                _reranker_instance = RerankerService()
    return _reranker_instance