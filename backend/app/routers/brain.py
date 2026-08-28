import json
import math
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from app.routers.auth import get_current_user
from sqlalchemy.orm import Session
from typing import Optional
import logging
from app.database import get_db
from app.services.document_service import get_url_scraper
from app.models.brain import BrainEntry
from app.workers.ingestion_worker import process_document_background, crawl_website_task
import uuid
import os
import shutil
import tempfile
from app.services.agentic_rag.rag_service import get_rag_service
from app.utils.website_scraper import Webscrapper
from app.core.exceptions import BillingError, WorkspaceAccessError
from app.core.security import verify_workspace_access, to_uuid
from app.schemas.brain import *
from app.services.billing.billing_service import BillingService
from app.services.billing.feature_billing_service import FeatureBillingService
from app.services.ai.execution_service import AIFeatureRegistry,AIExecutionService
from app.core.pagination import SkipLimitParams, paginate_query
from app.services.billing.entitlement_service import EntitlementService



logger = logging.getLogger(__name__)


def get_temp_upload_dir() -> str:
    
    # Respect custom environment variable
    env_dir = os.environ.get("TEMP_UPLOAD_DIR")
    if env_dir:
        try:
            os.makedirs(env_dir, exist_ok=True)
            # Verify write access by writing a tiny test file
            test_path = os.path.join(env_dir, f".write_test_{uuid.uuid4().hex}")
            with open(test_path, "w") as f:
                f.write("test")
            os.remove(test_path)
            return env_dir
        except Exception as e:
            logger.warning(f"Configured TEMP_UPLOAD_DIR '{env_dir}' is not writable: {e}. Falling back...")

    # Try default local path
    default_dir = os.path.join(os.getcwd(), "temp_uploads")
    try:
        os.makedirs(default_dir, exist_ok=True)
        # Verify write access by writing a tiny test file
        test_path = os.path.join(default_dir, f".write_test_{uuid.uuid4().hex}")
        with open(test_path, "w") as f:
            f.write("test")
        os.remove(test_path)
        return default_dir
    except Exception as e:
        logger.warning(f"Default upload directory '{default_dir}' is not writable: {e}. Falling back to system temp.")

    # Fallback to system-level temp directory
    sys_temp_dir = os.path.join(tempfile.gettempdir(), "auromind_uploads")
    os.makedirs(sys_temp_dir, exist_ok=True)
    return sys_temp_dir


MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".png", ".jpg", ".jpeg", ".webp"}


def _validate_and_save_upload(file: UploadFile, entry_id: str) -> tuple[str, str, str, int]:
    if not file.filename or not file.filename.strip():
        raise HTTPException(status_code=400, detail="No filename provided.")

    clean_filename = os.path.basename(file.filename.strip())
    if not clean_filename:
        raise HTTPException(status_code=400, detail="Invalid filename provided.")

    file_ext = "." + clean_filename.split(".")[-1].lower() if "." in clean_filename else ""
    if file_ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file_ext}'. Allowed types: {', '.join(sorted(ALLOWED_DOCUMENT_EXTENSIONS))}"
        )

    temp_dir = get_temp_upload_dir()
    temp_file_path = os.path.join(temp_dir, f"{entry_id}_{clean_filename}")

    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(temp_file_path)
    if file_size == 0:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if file_size > MAX_DOCUMENT_SIZE:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")

    return clean_filename, file_ext, temp_file_path, file_size


router = APIRouter(prefix="/brain", tags=["brain"])


# Endpoints

@router.post("/ingest/document", response_model=IngestResponse)
async def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
    region: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    cultural_context: Optional[str] = Form(None),
    collection: Optional[str] = Form("general"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id)

    # Enforce Knowledge Base limit
    ent_check = EntitlementService.check_entitlement(db, workspace_id, "knowledge_base")
    if not ent_check["allowed"]:
        EntitlementService.raise_entitlement_exceeded(
            db, workspace_id, "knowledge_base", ent_check["limit"], 100
        )

    entry_id = str(uuid.uuid4())
    clean_filename, file_ext, temp_file_path, file_size = _validate_and_save_upload(file, entry_id)

    reservation = None
    billing_service = None
    try:
        logger.info(f"[INGEST DOCUMENT] user={current_user.id} workspace={workspace_id} file={clean_filename}")

        billing_service = BillingService()
        size_mb = file_size / 1_000_000.0
        credits_cost = float(FeatureBillingService.calculate_cost(db, AIFeatureRegistry.KNOWLEDGE, size_mb))

        logger.info(f"[BILLING RESERVATION] File: '{clean_filename}' | Size: {file_size} bytes ({size_mb:.4f} MB) | Reserving {credits_cost:.4f} credits")

        reservation = billing_service.token_service.reserve_feature_credits(
            db=db,
            workspace_id=workspace_id,
            feature_key=AIFeatureRegistry.KNOWLEDGE,
            unit_amount=float(size_mb),
            reference_key=f"kb:{entry_id}",
            description=f"Knowledge Upload: {clean_filename}"
        )

        metadata_for_worker = {}
        if region: metadata_for_worker["region"] = str(region)[:100]
        if language: metadata_for_worker["language"] = str(language)[:50]
        if cultural_context: metadata_for_worker["cultural_context"] = str(cultural_context)[:100]
        metadata_for_worker["collection"] = str(collection or "general")[:50]

        new_entry = BrainEntry(
            id=entry_id,
            workspace_id=workspace_id,
            title=clean_filename,
            content="Processing...",
            content_type=file_ext.replace(".", ""),
            status="pending",
            embedding=None,
            metadata_json=json.dumps(metadata_for_worker),
            file_name=clean_filename,
            file_size=file_size,
            credits_charged=credits_cost,
            embedding_status="pending"
        )
        db.add(new_entry)
        db.commit()

        background_tasks.add_task(
            process_document_background,
            entry_id=entry_id,
            workspace_id=workspace_id,
            file_path=temp_file_path,
            original_filename=clean_filename,
            content_type=file_ext.replace(".", ""),
            file_size=file_size,
            reservation_id=reservation.id,
            required_credits=credits_cost,
            metadata=metadata_for_worker
        )

        return {
            "status": "pending",
            "entry_id": entry_id,
            "title": clean_filename,
            "message": "File upload accepted. Processing in background.",
            "original_filename": clean_filename,
            "chunks_created": 0
        }

    except HTTPException:
        if reservation and billing_service:
            try:
                billing_service.release_token_reservation(
                    db=db,
                    reservation_id=reservation.id,
                    reason="upload_api_failed"
                )
            except Exception:
                pass
        raise
    except Exception as e:
        if reservation and billing_service:
            try:
                billing_service.release_token_reservation(
                    db=db,
                    reservation_id=reservation.id,
                    reason="upload_api_failed"
                )
            except Exception:
                pass
        logger.error(f"Document ingestion failed: {e}")
        raise HTTPException(status_code=500, detail="Document ingestion failed. Please try again.")

@router.post("/ingest/sales_document", response_model=IngestResponse)
async def ingest_sales_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id)

    # Enforce Knowledge Base limit
    ent_check = EntitlementService.check_entitlement(db, workspace_id, "knowledge_base")
    if not ent_check["allowed"]:
        EntitlementService.raise_entitlement_exceeded(
            db, workspace_id, "knowledge_base", ent_check["limit"], 100
        )

    entry_id = str(uuid.uuid4())
    clean_filename, file_ext, temp_file_path, file_size = _validate_and_save_upload(file, entry_id)

    reservation = None
    billing_service = None
    try:
        logger.info(f"[INGEST SALES DOCUMENT] user={current_user.id} workspace={workspace_id} file={clean_filename}")

        billing_service = BillingService()
        size_mb = file_size / 1_000_000.0
        credits_cost = float(FeatureBillingService.calculate_cost(db, AIFeatureRegistry.KNOWLEDGE, size_mb))

        logger.info(f"[BILLING RESERVATION] Sales File: '{clean_filename}' | Size: {file_size} bytes ({size_mb:.4f} MB) | Reserving {credits_cost:.4f} credits")

        reservation = billing_service.token_service.reserve_feature_credits(
            db=db,
            workspace_id=workspace_id,
            feature_key=AIFeatureRegistry.KNOWLEDGE,
            unit_amount=float(size_mb),
            reference_key=f"kb:{entry_id}",
            description=f"Sales Knowledge Upload: {clean_filename}"
        )

        metadata_for_worker = {"collection": "sales"}

        new_entry = BrainEntry(
            id=entry_id,
            workspace_id=workspace_id,
            title=clean_filename,
            content="Processing...",
            content_type=file_ext.replace(".", ""),
            status="pending",
            embedding=None,
            metadata_json=json.dumps(metadata_for_worker),
            file_name=clean_filename,
            file_size=file_size,
            credits_charged=credits_cost,
            embedding_status="pending"
        )
        db.add(new_entry)
        db.commit()

        background_tasks.add_task(
            process_document_background,
            entry_id=entry_id,
            workspace_id=workspace_id,
            file_path=temp_file_path,
            original_filename=clean_filename,
            content_type=file_ext.replace(".", ""),
            file_size=file_size,
            reservation_id=reservation.id,
            required_credits=credits_cost,
            metadata=metadata_for_worker
        )

        return {
            "status": "pending",
            "entry_id": entry_id,
            "title": clean_filename,
            "message": "File upload accepted. Processing in background.",
            "original_filename": clean_filename,
            "chunks_created": 0
        }

    except HTTPException:
        if reservation and billing_service:
            try:
                billing_service.release_token_reservation(
                    db=db,
                    reservation_id=reservation.id,
                    reason="upload_api_failed"
                )
            except Exception:
                pass
        raise
    except Exception as e:
        if reservation and billing_service:
            try:
                billing_service.release_token_reservation(
                    db=db,
                    reservation_id=reservation.id,
                    reason="upload_api_failed"
                )
            except Exception:
                pass
        logger.error(f"Sales document ingestion failed: {e}")
        raise HTTPException(status_code=500, detail="Sales document ingestion failed. Please try again.")

@router.post("/ingest/support_document", response_model=IngestResponse)
async def ingest_support_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id)

    # Enforce Knowledge Base limit
    ent_check = EntitlementService.check_entitlement(db, workspace_id, "knowledge_base")
    if not ent_check["allowed"]:
        EntitlementService.raise_entitlement_exceeded(
            db, workspace_id, "knowledge_base", ent_check["limit"], 100
        )

    entry_id = str(uuid.uuid4())
    clean_filename, file_ext, temp_file_path, file_size = _validate_and_save_upload(file, entry_id)

    reservation = None
    billing_service = None
    try:
        logger.info(f"[INGEST SUPPORT DOCUMENT] user={current_user.id} workspace={workspace_id} file={clean_filename}")

        billing_service = BillingService()
        size_mb = file_size / 1_000_000.0
        credits_cost = float(FeatureBillingService.calculate_cost(db, AIFeatureRegistry.KNOWLEDGE, size_mb))

        logger.info(f"[BILLING RESERVATION] Support File: '{clean_filename}' | Size: {file_size} bytes ({size_mb:.4f} MB) | Reserving {credits_cost:.4f} credits")

        reservation = billing_service.token_service.reserve_feature_credits(
            db=db,
            workspace_id=workspace_id,
            feature_key=AIFeatureRegistry.KNOWLEDGE,
            unit_amount=float(size_mb),
            reference_key=f"kb:{entry_id}",
            description=f"Support Knowledge Upload: {clean_filename}"
        )

        metadata_for_worker = {"collection": "support"}

        new_entry = BrainEntry(
            id=entry_id,
            workspace_id=workspace_id,
            title=clean_filename,
            content="Processing...",
            content_type=file_ext.replace(".", ""),
            status="pending",
            embedding=None,
            metadata_json=json.dumps(metadata_for_worker),
            file_name=clean_filename,
            file_size=file_size,
            credits_charged=credits_cost,
            embedding_status="pending"
        )
        db.add(new_entry)
        db.commit()

        background_tasks.add_task(
            process_document_background,
            entry_id=entry_id,
            workspace_id=workspace_id,
            file_path=temp_file_path,
            original_filename=clean_filename,
            content_type=file_ext.replace(".", ""),
            file_size=file_size,
            reservation_id=reservation.id,
            required_credits=credits_cost,
            metadata=metadata_for_worker
        )

        return {
            "status": "pending",
            "entry_id": entry_id,
            "title": clean_filename,
            "message": "File upload accepted. Processing in background.",
            "original_filename": clean_filename,
            "chunks_created": 0
        }

    except HTTPException:
        if reservation and billing_service:
            try:
                billing_service.release_token_reservation(
                    db=db,
                    reservation_id=reservation.id,
                    reason="upload_api_failed"
                )
            except Exception:
                pass
        raise
    except Exception as e:
        if reservation and billing_service:
            try:
                billing_service.release_token_reservation(
                    db=db,
                    reservation_id=reservation.id,
                    reason="upload_api_failed"
                )
            except Exception:
                pass
        logger.error(f"Support document ingestion failed: {e}")
        raise HTTPException(status_code=500, detail="Support document ingestion failed. Please try again.")




@router.post("/ingest/url", response_model=IngestResponse)
async def ingest_url(
    request: IngestURLRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    workspace_id = verify_workspace_access(current_user, db, request.workspace_id)

    # Enforce Knowledge Base limit
    ent_check = EntitlementService.check_entitlement(db, workspace_id, "knowledge_base")
    if not ent_check["allowed"]:
        EntitlementService.raise_entitlement_exceeded(
            db, workspace_id, "knowledge_base", ent_check["limit"], 100
        )

    try:
        logger.info(f"[INGEST URL] user={current_user.id} workspace={workspace_id} url={request.url}")
        scraper = get_url_scraper()
        scrape_result = await scraper.scrape_url(request.url)

        ingestion_metadata = {}
        if request.region: ingestion_metadata["region"] = request.region
        if request.language: ingestion_metadata["language"] = request.language
        if request.cultural_context: ingestion_metadata["cultural_context"] = request.cultural_context
        ingestion_metadata["collection"] = request.collection or "general"

        url_bytes = len(scrape_result["text"].encode('utf-8'))
        size_mb = url_bytes / 1_000_000.0

        async def run_ingestion():
            credits_cost = float(FeatureBillingService.calculate_cost(db, AIFeatureRegistry.KNOWLEDGE, size_mb))
            rag = get_rag_service()
            return rag.ingest_document(
                db=db,
                workspace_id=workspace_id,
                text=scrape_result["text"],
                title=scrape_result["title"],
                content_type="url",
                source=request.url,
                metadata=ingestion_metadata,
                file_name=request.url,
                file_size=url_bytes,
                credits_charged=credits_cost,
                embedding_status="completed"
            )

        result = await AIExecutionService.execute(
            db=db,
            workspace_id=workspace_id,
            user_id=current_user.id,
            feature_key=AIFeatureRegistry.KNOWLEDGE,
            prompt="",
            custom_unit_amount=size_mb,
            description=f"URL Ingestion: {request.url}",
            execute_fn=run_ingestion
        )
        return result

    except HTTPException as e:
        raise e
    except (BillingError, WorkspaceAccessError) as e:
        raise e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"URL ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"URL ingestion failed: {str(e)}")

@router.get("/ingest/status/{entry_id:uuid}", response_model=IngestionStatusResponse)
async def get_ingestion_status(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
   
    logger.info(f"[INGEST STATUS] user={current_user.id} entry_id={entry_id}")
    workspace_id = verify_workspace_access(current_user, db)
  
    entry = db.query(BrainEntry).filter(
        BrainEntry.id == entry_id,
        BrainEntry.workspace_id == workspace_id,
    ).first()
  
    if not entry:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
  
    return {
        "id": entry.id,
        "status": entry.status,
        "error_message": entry.error_message,
        "created_at": entry.created_at,
        "title": entry.title,
        "file_name": entry.file_name,
        "file_size": entry.file_size,
        "credits_charged": entry.credits_charged,
        "embedding_status": entry.embedding_status,
    }

@router.post("/ingest/text", response_model=IngestResponse)
async def ingest_text(
    request: IngestTextRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
   
    workspace_id = verify_workspace_access(current_user, db, request.workspace_id)

    # Enforce Knowledge Base limit
    ent_check = EntitlementService.check_entitlement(db, workspace_id, "knowledge_base")
    if not ent_check["allowed"]:
        EntitlementService.raise_entitlement_exceeded(
            db, workspace_id, "knowledge_base", ent_check["limit"], 100
        )

    try:
        logger.info(f"[INGEST TEXT] user={current_user.id} workspace={workspace_id}")
        if len(request.content.strip()) < 20:
            raise HTTPException(status_code=400, detail="Content too short (minimum 20 characters)")

        ingestion_metadata = {}
        if request.region: ingestion_metadata["region"] = request.region
        if request.language: ingestion_metadata["language"] = request.language
        if request.cultural_context: ingestion_metadata["cultural_context"] = request.cultural_context
        ingestion_metadata["collection"] = request.collection or "general"

        text_bytes = len(request.content.encode('utf-8'))
        size_mb = text_bytes / 1_000_000.0

        async def run_ingestion():
            credits_cost = float(FeatureBillingService.calculate_cost(db, AIFeatureRegistry.KNOWLEDGE, size_mb))
            rag = get_rag_service()
            return rag.ingest_document(
                db=db,
                workspace_id=workspace_id,
                text=request.content,
                title=request.title,
                content_type="manual",
                source="user_input",
                metadata=ingestion_metadata,
                file_name=request.title,
                file_size=text_bytes,
                credits_charged=credits_cost,
                embedding_status="completed"
            )


        result = await AIExecutionService.execute(
            db=db,
            workspace_id=workspace_id,
            user_id=current_user.id,
            feature_key=AIFeatureRegistry.KNOWLEDGE,
            prompt="",
            custom_unit_amount=size_mb,
            description=f"Text Ingestion: {request.title}",
            execute_fn=run_ingestion
        )
        return result

    except HTTPException:
        raise
    except (BillingError, WorkspaceAccessError):
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Text ingestion failed: {e}")
        raise HTTPException(status_code=500, detail="Text ingestion failed. Please try again.")


@router.post("/ingest/website", response_model=CrawlResponse, status_code=202)
async def crawl_website(
    request: CrawlWebsiteRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, request.workspace_id)

    # Enforce Knowledge Base limit
    ent_check = EntitlementService.check_entitlement(db, workspace_id, "knowledge_base")
    if not ent_check["allowed"]:
        EntitlementService.raise_entitlement_exceeded(
            db, workspace_id, "knowledge_base", ent_check["limit"], 100
        )

    try:
        logger.info(f"[CRAWL WEBSITE ENQUEUE] user={current_user.id} workspace={workspace_id} url={request.url}")
        url = request.url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        base_metadata = {}
        if request.region: base_metadata["region"] = str(request.region)[:100]
        if request.language: base_metadata["language"] = str(request.language)[:50]
        if request.cultural_context: base_metadata["cultural_context"] = str(request.cultural_context)[:100]
        base_metadata["collection"] = str(request.collection or "general")[:50]

        entry_uuid = uuid.uuid4()
        workspace_uuid = uuid.UUID(workspace_id) if isinstance(workspace_id, str) else workspace_id
        new_entry = BrainEntry(
            id=entry_uuid,
            workspace_id=workspace_uuid,
            title=url[:255],
            content=url,
            content_type="website",
            status="pending",
            embedding=None,
            metadata_json=json.dumps(base_metadata),
            file_name=url[:255],
            file_size=0,
            credits_charged=0.0,
            embedding_status="pending"
        )
        db.add(new_entry)
        db.commit()

        import time
        logger.info(f"[TIMING] [0. CRAWL REQUEST DISPATCHED] entry_id={entry_uuid} url={url} at {time.time():.3f}")

        crawl_website_task.delay(
            entry_id=str(entry_uuid),
            url=url,
            workspace_id=str(workspace_id),
            user_id=str(current_user.id),
            base_metadata=base_metadata
        )

        return {
            "status": "processing",
            "entry_id": str(entry_uuid),
            "website": url,
            "pages_crawled": 0,
            "chunks_created": 0,
            "message": "Website crawl job enqueued successfully for background processing in Celery Worker"
        }

    except HTTPException:
        raise
    except (BillingError, WorkspaceAccessError):
        raise
    except Exception as e:
        logger.error(f"Failed to enqueue website crawl: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to enqueue website crawl. Please check the URL and try again."
        )


@router.get("/entries", response_model=ListEntriesResponse)
async def list_entries(
    workspace_id: Optional[str] = None,
    pagination: SkipLimitParams = Depends(),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):      
    workspace_id = verify_workspace_access(current_user, db, workspace_id)

    try:
        logger.info(f"[LIST ENTRIES] user={current_user.id} workspace={workspace_id} skip={pagination.skip} limit={pagination.limit}")
        query = db.query(BrainEntry).filter(
            BrainEntry.workspace_id == workspace_id
        ).order_by(
            BrainEntry.created_at.desc()
        )

        entries = paginate_query(
            query,
            pagination
        ).all()
        rag = get_rag_service()
        stats = rag.vector_store.get_collection_stats(
            db=db,
            workspace_id=workspace_id
        )

        chunk_count = stats.get("chunk_count", 0)
        result_entries = []
        has_pending = False

        for entry in entries:
            if entry.status == "pending":
                has_pending = True

            result_entries.append({
                "id": str(entry.id),
                "title": entry.title or (
                    entry.content[:50] + "..."
                    if entry.content and len(entry.content) > 50
                    else entry.content
                ),
                "content_type": entry.content_type or "text",
                "status": entry.status or "indexed",
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
                "word_count": len(entry.content.split()) if entry.content else 0,
                "file_name": entry.file_name,
                "file_size": entry.file_size,
                "credits_charged": entry.credits_charged,
                "embedding_status": entry.embedding_status,
            })

        if chunk_count == 0 and not entries:
            workspace_status = "empty"
        elif has_pending:
            workspace_status = "processing"
        else:
            workspace_status = "ready"

        return {
            "entries": result_entries,
            "total": len(result_entries),
            "indexed_chunks": chunk_count,
            "status": workspace_status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list entries: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge base entries.")


@router.delete("/entries/{entry_id:uuid}")
async def delete_entry(
    entry_id: uuid.UUID,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id)

    try:
        logger.warning(f"[DELETE ENTRY] user={current_user.id} workspace={workspace_id} entry_id={entry_id}")
        entry = db.query(BrainEntry).filter(
            BrainEntry.id == to_uuid(entry_id),
            BrainEntry.workspace_id == to_uuid(workspace_id)
        ).first()

        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found in this workspace")

        rag = get_rag_service()
        success = await rag.delete_entry(
            db,
            workspace_id,
            str(entry_id)
        )

        if success:
            return {"status": "success", "message": "Entry deleted"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete from vector store")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete entry: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete knowledge base entry.")


@router.post("/search", response_model=SearchResponse)
async def search_knowledge(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, request.workspace_id)

    try:
        logger.info(
            f"[SEARCH] user={current_user.id} workspace={workspace_id} "
            f"query={request.query} collection={request.collection} entry_ids={request.entry_ids}"
        )
        rag = get_rag_service()
        results = await rag.retrieval.semantic_search_async(
            db=db,
            workspace_id=workspace_id,
            query=request.query,
            top_k=request.top_k,
            entry_ids=request.entry_ids,
            collection=request.collection,
        )

        return {
            "query": request.query,
            "results": [
                {
                    "id": str(r["id"]),
                    "content": r.get("text", ""),
                    "title": r["metadata"].get("title", "Unknown"),
                    "score": round(r["score"], 3)
                }
                for r in results
            ],
            "total": len(results),
            "collection": request.collection,
            "entry_ids": request.entry_ids,
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail="Semantic search failed. Please try again.")


@router.post("/query", response_model=QueryResponse)
async def query_knowledge(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, request.workspace_id)

    try:
        logger.info(
            f"[QUERY] user={current_user.id} workspace={workspace_id} "
            f"question={request.question} collection={request.collection} entry_ids={request.entry_ids}"
        )
        rag = get_rag_service()
        response = await rag.agent_loop(
            db=db,
            workspace_id=workspace_id,
            query=request.question,
            entry_ids=request.entry_ids,
            collection=request.collection,
        )
        return {
            "answer": response.get("answer", ""),
            "sources": []
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail="Knowledge retrieval query failed.")


@router.get("/stats", response_model=BrainStatsResponse)
async def get_brain_stats(
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db, workspace_id)

    try:
        logger.info(f"[STATS] user={current_user.id} workspace={workspace_id}")
        rag = get_rag_service()
        stats = rag.vector_store.get_collection_stats(
            db=db,
            workspace_id=workspace_id
        )

        entry_count = db.query(BrainEntry).filter(
            BrainEntry.workspace_id == workspace_id
        ).count()

        return {
            **stats,
            "knowledge_entries": entry_count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch knowledge base statistics.")