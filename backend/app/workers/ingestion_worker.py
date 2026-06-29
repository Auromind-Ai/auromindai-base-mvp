import logging
import os
import traceback
from typing import Optional, Dict, Any
from app.database import SessionLocal
from app.models.brain import BrainEntry
from app.services.agentic_rag.embedding_service import get_embedding_generator
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app.utils.text_chunker import Schunker
from app.services.document_service import get_document_service
from app.services.billing.billing_service import BillingService

logger = logging.getLogger(__name__)


async def process_document_background(
    entry_id: str,
    workspace_id: str,
    file_path: str,
    original_filename: str,
    content_type: str,
    file_size: int,
    reservation_id: Optional[str] = None,
    required_credits: Optional[float] = 0.0,
    metadata=None
):
    db = SessionLocal()
    billing_service = BillingService()

    try:
        print(f"\n>>> [WORKER START] Starting background processing for entry {entry_id} (File: '{original_filename}', Size: {file_size} bytes)")
        logger.info(f"Starting background processing for entry {entry_id}")

        # SECURITY CHECK 
        entry = db.query(BrainEntry).filter(
            BrainEntry.id == entry_id
        ).first()

        if not entry:
            logger.error(f"SECURITY FAULT: Entry {entry_id} not found")
            return

        workspace_id = entry.workspace_id

        #  UPDATE STATUS 
        entry.status = "processing"
        entry.embedding_status = "processing"
        db.commit()

        #  READ FILE 
        with open(file_path, "rb") as f:
            content = f.read()

        #  PROCESS DOCUMENT 
        doc_service = get_document_service()

        doc_result = await doc_service.process_file(
            content,
            original_filename,
            db=db
        )

        entry.content = doc_result["text"]

        #  BUILD SERVICES 
        # Re-use process-level singleton — model is NOT reloaded.
        embedding_generator = get_embedding_generator()
        
        vector_store = VectorStoreService()
        chunker = Schunker()

        #  METADATA 
        ingestion_metadata = {
            "original_size": file_size
        }

        if metadata:
            ingestion_metadata.update(metadata)

        logger.info(
            f"Starting vector ingestion for {entry_id}"
        )

        is_image = content_type in ["image", "png", "jpg", "jpeg", "webp"]

        if not is_image:
            #  CHUNKING 
            chunks = chunker.build_chunks(
                doc_result["text"]
            )

            if not chunks:
                raise ValueError(
                    "No chunks generated from document"
                )

            for chunk in chunks:
                chunk["metadata"] = ingestion_metadata

            #  EMBEDDINGS 
            embeddings = embedding_generator.generate_embeddings(
                [chunk["text"] for chunk in chunks]
            )

            #  VECTOR STORAGE 
            vector_store.add_chunks(
                db=db,
                workspace_id=workspace_id,
                chunks=chunks,
                embeddings=embeddings,
                parent_id=entry_id,
                chunk_metadata=ingestion_metadata
            )
        else:
            logger.info(f"Skipping vector embedding for image entry {entry_id}")

        # Finalize credits and get exact cost charged from ledger
        actual_units = file_size / 1_000_000.0
        if reservation_id:
            ledger_entry = billing_service.token_service.finalize_feature_credits(
                db=db,
                reservation_id=reservation_id,
                actual_units=float(actual_units)
            )
            final_credits_charged = abs(float(ledger_entry.credits_delta))
        else:
            from app.services.billing.feature_billing_service import FeatureBillingService
            try:
                final_credits_charged = float(FeatureBillingService.calculate_cost(db, "knowledge_base_upload", actual_units))
            except Exception:
                final_credits_charged = round(actual_units * 10.0, 4)

        print(f"\n>>> [BILLING SUCCESS] Finalized charge of {final_credits_charged:.4f} credits for entry '{entry_id}' (file: '{original_filename}', size: {file_size} bytes / {actual_units:.4f} MB)\n")
        logger.info(
            f"[INGEST BILLING SUCCESS] Finalized charge of {final_credits_charged} credits for entry '{entry_id}' (file: '{original_filename}', size: {file_size} bytes / {actual_units:.4f} MB)"
        )

        if not is_image:
            logger.info(
                f"Stored {len(chunks)} chunks for entry {entry_id}"
            )
        else:
            logger.info(
                f"Completed image document analysis for entry {entry_id}"
            )

        #  COMPLETE 
        entry.status = "completed"
        entry.embedding_status = "completed"
        entry.credits_charged = final_credits_charged
        entry.error_message = None

        db.commit()

        logger.info(
            f"Background processing completed for {entry_id}"
        )

    except Exception as e:
        logger.error(f"Background processing failed: {e}")
        traceback.print_exc()

        try:
            db.rollback()
        except Exception as rb_err:
            logger.error(f"Failed to rollback database session: {rb_err}")

        if reservation_id:
            try:
                billing_service.release_token_reservation(
                    db=db,
                    reservation_id=reservation_id,
                    reason="knowledge_base_processing_failed"
                )
                db.commit()
                print(f"\n>>> [BILLING FAILURE] Released reservation for entry '{entry_id}' (file: '{original_filename}', reason: 'knowledge_base_processing_failed')\n")
            except Exception as release_err:
                logger.error(f"Failed to release reservation {reservation_id} on worker failure: {release_err}")
                try:
                    db.rollback()
                except Exception:
                    pass

        # FAIL SAFE status update
        try:
            entry = db.query(BrainEntry).filter(
                BrainEntry.id == entry_id
            ).first()

            if entry:
                entry.status = "failed"
                entry.embedding_status = "failed"
                entry.credits_charged = 0.0
                entry.error_message = str(e)[:500]
                db.commit()
                logger.info(f"Updated entry {entry_id} status to failed")
        except Exception as update_err:
            logger.error(f"Failed to update entry {entry_id} status to failed: {update_err}")
            try:
                db.rollback()
            except Exception:
                pass

    finally:
        db.close()

        #  CLEANUP 
        if os.path.exists(file_path):
            os.remove(file_path)
