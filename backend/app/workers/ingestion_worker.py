import asyncio
import logging
import os
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.brain import BrainEntry
import traceback
from app.services.agentic_rag.embedding_service import EmbeddingGenerator
from app.services.agentic_rag.vector_store_service import get_vector_store
from app.utils.text_chunker import Schunker
from app.services.agentic_rag.rag_service import get_rag_service
from app.services.document_service import get_document_service

logger = logging.getLogger(__name__)

async def process_document_background(
    entry_id: str,
    workspace_id: str,  # 
    file_path: str,
    original_filename: str,
    content_type: str,
    file_size: int,
    metadata: Optional[Dict[str, Any]] = None 
):
    db = SessionLocal()

    try:
        logger.info(f"Starting background processing for entry {entry_id}")

        #  STEP 1: ALWAYS TRUST DB, NOT INPUT
        entry = db.query(BrainEntry).filter(
            BrainEntry.id == entry_id
        ).first()

        if not entry:
            logger.error(f"SECURITY FAULT: Entry {entry_id} not found")
            return

        #  derive workspace_id from DB (CRITICAL FIX)
        workspace_id = entry.workspace_id

        # 🔄 Update status
        entry.status = "processing"
        db.commit()

        # ================= FILE PROCESS =================
        with open(file_path, "rb") as f:
            content = f.read()

        doc_service = get_document_service()
        doc_result = doc_service.process_file(content, original_filename)

        ingestion_metadata = {"original_size": file_size}
        if metadata:
            ingestion_metadata.update(metadata)

        logger.info(f"Starting vector ingestion for {entry_id}")

        embedding_generator = EmbeddingGenerator()
        vector_store = get_vector_store()
        chunker = Schunker()

        chunks = chunker.build_chunks(doc_result["text"])

        if not chunks:
            raise ValueError("No chunks generated from document")

        for chunk in chunks:
            chunk["metadata"] = ingestion_metadata

        embeddings = embedding_generator.generate_embeddings(
            [chunk["text"] for chunk in chunks]
        )

        #  SAFE STORE (workspace_id from DB only)
        vector_store.add_chunks(
            db=db,
            workspace_id=workspace_id,
            chunks=chunks,
            embeddings=embeddings,
            parent_id=entry_id
        )

        logger.info(f"Stored {len(chunks)} chunks for entry {entry_id}")

        # ================= COMPLETE =================
        entry.status = "completed"
        entry.error_message = None
        db.commit()

        logger.info(f"Background processing completed for {entry_id}")

    except Exception as e:
        logger.error(f"Background processing failed: {e}")
        traceback.print_exc()

        #  SAFE FAIL UPDATE
        entry = db.query(BrainEntry).filter(
            BrainEntry.id == entry_id
        ).first()

        if entry:
            entry.status = "failed"
            entry.error_message = str(e)[:500]
            db.commit()

    finally:
        db.close()

        # 🧹 Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)