import logging
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func
import uuid

from app.models.brain import BrainChunk

logger = logging.getLogger(__name__)


class VectorStoreService:

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def add_chunks(
        self,
        db: Session,
        workspace_id: str,
        chunks: List[Dict[str, Any]],
        embeddings,
        parent_id: Optional[str] = None
    ) -> List[str]:

        if not chunks:
            return []

        if len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings length mismatch")

        chunks_to_add = []

        for i, chunk in enumerate(chunks):

            metadata = {
                "chunk_index": chunk.get("chunk_index"),
                "token_count": chunk.get("token_count"),
                "content_hash": chunk.get("id"),  # MD5 from Schunker
                "parent_id": parent_id
            }

            db_chunk = BrainChunk(
                id=chunk["id"],  # Use deterministic MD5 id
                workspace_id=workspace_id,
                entry_id=parent_id,
                content=chunk["text"],
                embedding=embeddings[i].tolist(),  # numpy → list
                chunk_index=chunk.get("chunk_index", 0),
                metadata_json=json.dumps(metadata, default=str)
            )

            chunks_to_add.append(db_chunk)

        try:
            db.bulk_save_objects(chunks_to_add)
            db.commit()

            logger.info(
                f"Stored {len(chunks)} chunks in workspace {workspace_id}"
            )

            return [c["id"] for c in chunks]

        except Exception as e:
            db.rollback()
            logger.error(f"Failed storing chunks: {e}")
            raise
    
    # def add_email_chunks(
    #     self,
    #     db: Session,
    #     workspace_id: str,
    #     chunks: List[Dict[str, Any]],
    #     embeddings,
    #     parent_id: uuid.UUID  # must be EmailMessage.id
    # ) -> List[str]:

    #     if not chunks:
    #         return []

    #     if len(chunks) != len(embeddings):
    #         raise ValueError("Email chunks and embeddings length mismatch")

    #     chunks_to_add = []
    #     stored_ids = []

    #     for i, chunk in enumerate(chunks):

    #         meta = chunk.get("metadata", {})

    #         metadata = {
    #             "source": "gmail",
    #             "gmail_message_id": meta.get("gmail_message_id"),
    #             "thread_id": meta.get("thread_id"),
    #             "sender": meta.get("from"),
    #             "subject": meta.get("subject"),
    #             "date": meta.get("date"),
    #             "category": meta.get("category"),          # new
    #             "priority": meta.get("priority"),          # new
    #             "direction": meta.get("direction"),        # inbound/outbound
    #             "chunk_index": meta.get("chunk_index", 0)
    #         }

    #         chunk_id = uuid.uuid4()

    #         db_chunk = BrainChunk(
    #             id=chunk_id,
    #             workspace_id=workspace_id,
    #             entry_id=parent_id,   # EmailMessage.id
    #             content=chunk["text"],
    #             embedding=embeddings[i].tolist(),
    #             chunk_index=meta.get("chunk_index", 0),
    #             metadata_json=json.dumps(metadata, default=str)
    #         )

    #         chunks_to_add.append(db_chunk)
    #         stored_ids.append(str(chunk_id))

    #     try:
    #         db.bulk_save_objects(chunks_to_add)
    #         db.commit()

    #         logger.info(
    #             f"Stored {len(chunks)} email chunks for email {parent_id}"
    #         )

    #         return stored_ids

    #     except Exception as e:
    #         db.rollback()
    #         logger.error(f"Failed storing email chunks: {e}")
    #         raise

    def search(
        self,
        db: Session,
        workspace_id: str,
        query_embedding,
        top_k: int = 5,
        parent_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:

        try:

            query = db.query(
                BrainChunk,
                BrainChunk.embedding.cosine_distance(query_embedding).label("distance")
            ).filter(
                BrainChunk.workspace_id == workspace_id
            )

            if parent_id:
                query = query.filter(BrainChunk.entry_id == parent_id)

            results = query.order_by(
                text("distance ASC")
            ).limit(top_k).all()

            formatted = []

            for chunk, distance in results:

                similarity = 1 - float(distance) if distance else 0

                try:
                    meta = json.loads(chunk.metadata_json)
                except:
                    meta = {}

                formatted.append({
                    "id": chunk.id,
                    "text": chunk.content,
                    "score": similarity,
                    "metadata": meta
                })

            return formatted

        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            raise


    def delete_by_parent(
        self,
        db: Session,
        workspace_id: str,
        parent_id: str
    ) -> bool:

        try:
            db.query(BrainChunk).filter(
                BrainChunk.workspace_id == workspace_id,
                BrainChunk.entry_id == parent_id
            ).delete(synchronize_session=False)

            db.commit()
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Delete failed: {e}")
      
            return False
        
    # WORKSPACE STATS
    def get_collection_stats(
        self,
        db: Session,
        workspace_id: str
    ) -> Dict[str, Any]:

        try:
            count = db.query(func.count(BrainChunk.id)).filter(
                BrainChunk.workspace_id == workspace_id
            ).scalar()

            return {
                "workspace_id": workspace_id,
                "chunk_count": count or 0
            }

        except Exception as e:
            logger.error(f"Stats failed: {e}")
            return {
                "workspace_id": workspace_id,
                "chunk_count": 0
            }


_vector_store: Optional[VectorStoreService] = None


def get_vector_store() -> VectorStoreService:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
    return _vector_store