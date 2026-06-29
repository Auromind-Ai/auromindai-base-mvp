from sentence_transformers import SentenceTransformer
import logging

import logging
import threading
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


#  Module-level singleton cache state (per OS process)
_embedding_cache = {}
_embedding_cache_lock = threading.Lock()


class EmbeddingGenerator:
    """Never instantiate directly — call ``get_embedding_generator()``."""

    def __init__(
        self,
        model_name: str,
        device: str,
    ) -> None:
        logger.info("Loading embedding model: %s on %s", model_name, device)
        self._model = SentenceTransformer(model_name, device=device)
        self._dimension: int = self._model.get_sentence_embedding_dimension()
        logger.info(
            "Embedding model loaded: %s | dimension=%d", model_name, self._dimension
        )

    @property
    def dimension(self) -> int:
        return self._dimension


    #  Public API


    def generate_embeddings(self, chunks: list, batch_size: int = 32) -> np.ndarray:
        if not isinstance(chunks, list) or not chunks:
            raise ValueError("Chunks must be a non-empty list")

        embeddings = self._model.encode(
            chunks,
            batch_size=batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        if embeddings.shape[1] != self._dimension:
            raise ValueError(
                f"Embedding dimension mismatch: "
                f"Expected {self._dimension}, Got {embeddings.shape[1]}"
            )

        logger.info("Chunk embeddings generated successfully")
        return embeddings

    def generate_query_embedding(self, query: str) -> np.ndarray:
        if not isinstance(query, str) or not query.strip():
            raise ValueError("Invalid query for embedding")

        embedding = self._model.encode(
            query,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        if len(embedding) != self._dimension:
            raise ValueError("Query embedding dimension mismatch")
        return embedding

    def generate_batch_embeddings(self, texts: list) -> np.ndarray:
        embeddings = self._model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        if embeddings.shape[1] != self._dimension:
            raise ValueError("Batch embedding dimension mismatch")
        return embeddings


def get_embedding_generator() -> EmbeddingGenerator:
    """Return the process-level EmbeddingGenerator singleton matching current config (thread-safe)."""
    from app.services.config_service import config_service
    model_name = config_service.get("embedding_model_name", "BAAI/bge-small-en-v1.5")
    device = config_service.get("embedding_device", "cpu")
    cache_key = (model_name, device)

    global _embedding_cache
    if cache_key not in _embedding_cache:
        with _embedding_cache_lock:
            if cache_key not in _embedding_cache:
                # Clear existing cache entries to free memory before loading a new model
                _embedding_cache.clear()
                _embedding_cache[cache_key] = EmbeddingGenerator(model_name, device)
    return _embedding_cache[cache_key]
