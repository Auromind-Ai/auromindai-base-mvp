from sentence_transformers import SentenceTransformer
import logging
import numpy as np


logger = logging.getLogger(__name__)

class EmbeddingGenerator:

    _model = None
    _dimension = None

    def __init__(self, model_name="BAAI/bge-small-en-v1.5", device="cpu"):
        if EmbeddingGenerator._model is None:
            logger.info(f"Loading embedding model ONCE: {model_name}")

            EmbeddingGenerator._model = SentenceTransformer(
                model_name,
                device=device
            )

            EmbeddingGenerator._dimension = (
                EmbeddingGenerator._model.get_sentence_embedding_dimension()
            )

            logger.info(
                f"Embedding model loaded: {model_name} | "
                f"Dimension: {EmbeddingGenerator._dimension}"
            )

        # reuse
        self.model = EmbeddingGenerator._model
        self.dimension = EmbeddingGenerator._dimension


    # Generate embeddings for full document
    def generate_embeddings(self, chunks, batch_size=32):

        if not isinstance(chunks, list) or not chunks:
            raise ValueError("Chunks must be a non-empty list")

        embeddings = self.model.encode(
            chunks,
            batch_size=batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True
        )

        if embeddings.shape[1] != self.dimension:
            raise ValueError(
                f"Embedding dimension mismatch: "
                f"Expected {self.dimension}, Got {embeddings.shape[1]}"
            )

        logger.info("Chunk embeddings generated successfully")

        return embeddings
    
    # Single Query Embedding (for search)
    def generate_query_embedding(self, query):

        if not isinstance(query, str) or not query.strip():
            raise ValueError("Invalid query for embedding")

        embedding = self.model.encode(
            query,
            convert_to_numpy=True,
            normalize_embeddings=True
        )

        if len(embedding) != self.dimension:
            raise ValueError("Query embedding dimension mismatch")

        return embedding

    # Batch Query Embedding (optional)
    def generate_batch_embeddings(self, texts):

        embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True
        )

        if embeddings.shape[1] != self.dimension:
            raise ValueError("Batch embedding dimension mismatch")

        return embeddings
