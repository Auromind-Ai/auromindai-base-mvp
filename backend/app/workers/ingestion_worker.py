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
from app.services.billing.feature_billing_service import FeatureBillingService
from app.services.ai.execution_service import AIFeatureRegistry

from app.core.celery_app import celery_app
from app.utils.website_scraper import Webscrapper
from app.services.agentic_rag.rag_service import get_rag_service

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
            try:
                final_credits_charged = float(FeatureBillingService.calculate_cost(db, AIFeatureRegistry.KNOWLEDGE, actual_units))
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


@celery_app.task(
    name="app.workers.ingestion_worker.crawl_website_task",
    bind=True,
    max_retries=2,
    default_retry_delay=60
)
def crawl_website_task(
    self,
    entry_id: str,
    url: str,
    workspace_id: str,
    user_id: str,
    base_metadata: Optional[Dict[str, Any]] = None
):
  
    import time
    task_start_time = time.time()
    db = SessionLocal()
    try:
        logger.info(f"[TIMING] [1. CRAWL TASK STARTED] entry={entry_id} workspace={workspace_id} url={url} at {task_start_time:.3f}")

        entry = db.query(BrainEntry).filter(BrainEntry.id == entry_id).first()
        if not entry:
            logger.error(f"[CRAWL WORKER FAULT] Entry {entry_id} not found in DB")
            return

        entry.status = "processing"
        entry.embedding_status = "processing"
        db.commit()

        scrape_start = time.time()
        logger.info(f"[TIMING] [2. BROWSER/SCRAPER LAUNCH] url={url}")
        scraper = Webscrapper(url)
        pages = scraper.scrapper_choose()
        scrape_duration = time.time() - scrape_start

        page_count = len(pages) if isinstance(pages, list) else 0
        logger.info(f"[TIMING] [3. SCRAPING COMPLETED] pages_crawled={page_count} duration={scrape_duration:.3f}s")

        if not pages or isinstance(pages, str):
            raise ValueError(f"No pages could be crawled from website: {url} (result: {pages})")

        rag = get_rag_service()
        total_chunks = 0
        meta = base_metadata or {}
        ingest_start = time.time()

        for idx, page in enumerate(pages):
            page_ingest_start = time.time()
            content = " ".join(
                page.get("paragraphs", []) +
                page.get("headings", []) +
                page.get("sub_headings", []) +
                page.get("list_point", [])
            )
            if not content.strip():
                continue

            page_metadata = {"word_count": len(content.split())}
            final_metadata = {**meta, **page_metadata}
            page_text_bytes = len(content.encode('utf-8'))
            size_mb = page_text_bytes / 1_000_000.0
            page_title = page.get("title", "") or url

            credits_cost = float(FeatureBillingService.calculate_cost(db, AIFeatureRegistry.KNOWLEDGE, size_mb))

            result = rag.ingest_document(
                db=db,
                workspace_id=workspace_id,
                text=content,
                title=page_title,
                content_type="website_page",
                source=page.get("url", url),
                metadata=final_metadata,
                file_name=page.get("url", url),
                file_size=page_text_bytes,
                credits_charged=credits_cost,
                embedding_status="completed"
            )
            created = result.get("chunks_created", 0) if isinstance(result, dict) else 0
            total_chunks += created
            logger.info(f"[TIMING] [PAGE INGESTED #{idx+1}/{page_count}] url={page.get('url', url)} chunks={created} duration={(time.time() - page_ingest_start):.3f}s")

        ingest_duration = time.time() - ingest_start
        total_task_duration = time.time() - task_start_time

        entry.status = "completed"
        entry.embedding_status = "completed"
        entry.content = f"Crawled {len(pages)} pages from {url}"
        entry.error_message = None
        db.commit()

        stop_reason = getattr(scraper.static, "stop_reason", "COMPLETED")
        max_pages = getattr(scraper, "max_pages", 30)
        max_depth = getattr(scraper, "max_depth", 2)

        summary = (
            "\n=============================\n"
            "CRAWL SUMMARY\n"
            "=============================\n"
            f"URL              : {url}\n"
            f"Pages Crawled    : {page_count}\n"
            f"Max Pages        : {max_pages}\n"
            f"Depth            : {max_depth}\n"
            f"Duration         : {total_task_duration:.1f} sec\n"
            f"Chunks           : {total_chunks}\n"
            f"Embeddings       : {total_chunks}\n"
            f"Stop Reason      : {stop_reason}\n"
            "============================="
        )
        logger.info(summary)

        logger.info(
            f"[TIMING] [4. CRAWL TASK SUCCESS] entry={entry_id} total_pages={page_count} total_chunks={total_chunks} "
            f"scrape_time={scrape_duration:.3f}s ingest_time={ingest_duration:.3f}s total_task_time={total_task_duration:.3f}s"
        )

    except Exception as e:
        logger.error(f"[CRAWL WORKER ERROR] Failed for entry {entry_id} (attempt {self.request.retries + 1}/{self.max_retries + 1}): {e}")
        try:
            db.rollback()
        except Exception:
            pass

        if self.request.retries < self.max_retries:
            db.close()
            raise self.retry(exc=e, countdown=60)
        else:
            try:
                entry = db.query(BrainEntry).filter(BrainEntry.id == entry_id).first()
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


