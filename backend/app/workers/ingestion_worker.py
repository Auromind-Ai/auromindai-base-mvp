import asyncio
import logging
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.brain import BrainEntry
import traceback

logger = logging.getLogger(__name__)

async def process_document_background(
    entry_id: str,
    workspace_id: str,
    file_path: str,
    original_filename: str,
    content_type: str,
    file_size: int
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
        from app.services.rag_service import get_rag_service
        from app.services.document_service import get_document_service
        
        # Read file from temp path
        with open(file_path, "rb") as f:
            content = f.read()
            
        # Parse Document
        doc_service = get_document_service()
        doc_result = doc_service.process_file(content, original_filename)
        
        # Ingest to RAG
        rag_service = get_rag_service()
        
        # We pass the existing_entry_id to update the record created by the API
        result = rag_service.ingest_document(
            db=db,
            workspace_id=workspace_id,
            text=doc_result["text"],
            title=original_filename,
            content_type=doc_result["content_type"],
            source=original_filename,
            metadata={"original_size": file_size},
            existing_entry_id=entry_id # <--- We will add this param
        )
        
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
