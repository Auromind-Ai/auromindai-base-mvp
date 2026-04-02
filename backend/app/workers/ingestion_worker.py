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
from app.services.document_service import get_document_service

logger = logging.getLogger(__name__)

async def process_document_background(
    entry_id: str,
    workspace_id: str,
    file_path: str,
    original_filename: str,
    content_type: str,
    file_size: int,
    metadata: Optional[Dict[str, Any]] = None # New parameter
):
    """
    Background task to process a document ingestion.
    1. Updates status to PROCESSING
    2. Calls RAG service to ingest
    3. Updates status to COMPLETED or FAILED
    4. Cleans up temp file
    """
    db = SessionLocal()
    try:
        logger.info(f"Starting background processing for entry {entry_id}")
        
        # 1. Update status to PROCESSING
        entry = db.query(BrainEntry).filter(BrainEntry.id == entry_id).first()
        if entry:
            entry.status = "processing"
            db.commit()
        else:
            logger.error(f"Entry {entry_id} not found for background processing")
            return

        # 2. Process File
        
        
        # Read file from temp path
        with open(file_path, "rb") as f:
            content = f.read()
            
        # Parse Document
        doc_service = get_document_service()
        doc_result = doc_service.process_file(content, original_filename)
        
        # Ingest to RAG
        embedding_generator = EmbeddingGenerator()
        vector_store = get_vector_store()
        chunker = Schunker()
       # Merge existing metadata with new incoming metadata
        ingestion_metadata = {"original_size": file_size}
        if metadata:
            ingestion_metadata.update(metadata)

        logger.info(f"Starting vector ingestion for {entry_id}")

        # Use singleton embedding generator
        embedding_generator = EmbeddingGenerator()

        # Use singleton vector store
        vector_store = get_vector_store()

        # Use Schunker directly
        chunker = Schunker()

        # 1️Build chunks
        chunks = chunker.build_chunks(doc_result["text"])

        if not chunks:
            raise ValueError("No chunks generated from document")

        # Attach metadata to each chunk
        for chunk in chunks:
            chunk["metadata"] = ingestion_metadata
        
        print("Chunks:", len(chunks))
        

        # 2️⃣ Generate embeddings
        embeddings = embedding_generator.generate_embeddings(
            [chunk["text"] for chunk in chunks]
        )

        print("Embeddings:", len(embeddings))
        print("Embeddings shape:", embeddings.shape)

        # 3️⃣ Store in vector DB
        vector_store.add_chunks(
            db=db,
            workspace_id=workspace_id,
            chunks=chunks,
            embeddings=embeddings,
            parent_id=entry_id
        )
        
        logger.info(f"Stored {len(chunks)} chunks for entry {entry_id}")
        # 3. Update status to COMPLETED
        # (The service might have updated the entry content, but we ensure status here)
        entry = db.query(BrainEntry).filter(BrainEntry.id == entry_id).first()
        entry.status = "completed"
        entry.error_message = None
        db.commit()
        
        logger.info(f"Background processing completed for {entry_id}")

    except Exception as e:
        logger.error(f"Background processing failed: {e}")
        traceback.print_exc()
        
        # Update status to FAILED
        entry = db.query(BrainEntry).filter(BrainEntry.id == entry_id).first()
        if entry:
            entry.status = "failed"
            entry.error_message = str(e)[:500]
            db.commit()
            
    finally:
        db.close()
        # 4. Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)
