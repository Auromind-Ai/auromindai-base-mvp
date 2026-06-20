import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from app.routers.auth import get_current_user
from sqlalchemy.orm import Session
from typing import Optional
import logging
from app.database import get_db
from app.services.document_service import get_url_scraper
from app.models.brain import BrainEntry
from app.workers.ingestion_worker import process_document_background
import uuid
import os
import shutil
from app.services.agentic_rag.rag_service import get_rag_service
from app.utils.website_scraper import Webscrapper
from app.core.security import verify_workspace_access
from app.schemas.brain import *

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/brain", tags=["brain"])



#Endpoints

@router.post("/ingest/document", response_model=IngestResponse)
async def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    region: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    cultural_context: Optional[str] = Form(None),
    collection: Optional[str] = Form("general"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
   
    # verify_workspace_access now returns the verified workspace_id string directly
    workspace_id = verify_workspace_access(current_user, db)

    try:
        logger.info(f"[INGEST DOCUMENT] user={current_user.id} workspace={workspace_id} file={file.filename}")
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        allowed_extensions = {".pdf", ".docx", ".doc", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp", ".xlsx", ".xls", ".csv"}
        file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )

        entry_id = str(uuid.uuid4())
        temp_dir = os.path.join(os.getcwd(), "temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, f"{entry_id}_{file.filename}")

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(temp_file_path)

        metadata_for_worker = {}
        if region: metadata_for_worker["region"] = region
        if language: metadata_for_worker["language"] = language
        if cultural_context: metadata_for_worker["cultural_context"] = cultural_context
        metadata_for_worker["collection"] = collection or "general"

        new_entry = BrainEntry(
            id=entry_id,
            workspace_id=workspace_id,
            title=file.filename,
            content="Processing...",
            content_type=file_ext.replace(".", ""),
            status="pending",
            embedding=None,
            metadata_json=json.dumps(metadata_for_worker)
        )
        db.add(new_entry)
        db.commit()

        

        background_tasks.add_task(
            process_document_background,
            entry_id=entry_id,
            workspace_id=workspace_id,
            file_path=temp_file_path,
            original_filename=file.filename,
            content_type=file_ext.replace(".", ""),
            file_size=file_size,
            metadata=metadata_for_worker
        )

        return {
            "status": "pending",
            "entry_id": entry_id,
            "title": file.filename,
            "message": "File upload accepted. Processing in background.",
            "original_filename": file.filename,
            "chunks_created": 0
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@router.post("/ingest/sales_document", response_model=IngestResponse)
async def ingest_sales_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db)

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        allowed_extensions = {".pdf", ".docx", ".doc", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp", ".xlsx", ".xls", ".csv"}
        file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )

        entry_id = str(uuid.uuid4())
        temp_dir = os.path.join(os.getcwd(), "temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, f"{entry_id}_{file.filename}")

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(temp_file_path)

        metadata_for_worker = {"collection": "sales"}

        new_entry = BrainEntry(
            id=entry_id,
            workspace_id=workspace_id,
            title=file.filename,
            content="Processing...",
            content_type=file_ext.replace(".", ""),
            status="pending",
            embedding=None,
            metadata_json=json.dumps(metadata_for_worker)
        )
        db.add(new_entry)
        db.commit()

        background_tasks.add_task(
            process_document_background,
            entry_id=entry_id,
            workspace_id=workspace_id,
            file_path=temp_file_path,
            original_filename=file.filename,
            content_type=file_ext.replace(".", ""),
            file_size=file_size,
            metadata=metadata_for_worker
        )

        return {
            "status": "pending",
            "entry_id": entry_id,
            "title": file.filename,
            "message": "File upload accepted. Processing in background.",
            "original_filename": file.filename,
            "chunks_created": 0
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@router.post("/ingest/support_document", response_model=IngestResponse)
async def ingest_support_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db)

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        allowed_extensions = {".pdf", ".docx", ".doc", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp", ".xlsx", ".xls", ".csv"}
        file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )

        entry_id = str(uuid.uuid4())
        temp_dir = os.path.join(os.getcwd(), "temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, f"{entry_id}_{file.filename}")

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(temp_file_path)

        metadata_for_worker = {"collection": "support"}

        new_entry = BrainEntry(
            id=entry_id,
            workspace_id=workspace_id,
            title=file.filename,
            content="Processing...",
            content_type=file_ext.replace(".", ""),
            status="pending",
            embedding=None,
            metadata_json=json.dumps(metadata_for_worker)
        )
        db.add(new_entry)
        db.commit()

        background_tasks.add_task(
            process_document_background,
            entry_id=entry_id,
            workspace_id=workspace_id,
            file_path=temp_file_path,
            original_filename=file.filename,
            content_type=file_ext.replace(".", ""),
            file_size=file_size,
            metadata=metadata_for_worker
        )

        return {
            "status": "pending",
            "entry_id": entry_id,
            "title": file.filename,
            "message": "File upload accepted. Processing in background.",
            "original_filename": file.filename,
            "chunks_created": 0
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")



@router.post("/ingest/url", response_model=IngestResponse)
async def ingest_url(
    request: IngestURLRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    workspace_id = verify_workspace_access(current_user, db)

    try:
        logger.info(f"[INGEST URL] user={current_user.id} workspace={workspace_id} url={request.url}")
        scraper = get_url_scraper()
        scrape_result = await scraper.scrape_url(request.url)

        ingestion_metadata = {}
        if request.region: ingestion_metadata["region"] = request.region
        if request.language: ingestion_metadata["language"] = request.language
        if request.cultural_context: ingestion_metadata["cultural_context"] = request.cultural_context
        ingestion_metadata["collection"] = request.collection or "general"

        rag = get_rag_service()
        result = rag.ingest_document(
            db=db,
            workspace_id=workspace_id,
            text=scrape_result["text"],
            title=scrape_result["title"],
            content_type="url",
            source=request.url,
            metadata=ingestion_metadata
        )
        return result

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
    }

@router.post("/ingest/text", response_model=IngestResponse)
async def ingest_text(
    request: IngestTextRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
   
    workspace_id = verify_workspace_access(current_user, db)

    try:
        logger.info(f"[INGEST TEXT] user={current_user.id} workspace={workspace_id}")
        if len(request.content.strip()) < 20:
            raise HTTPException(status_code=400, detail="Content too short (minimum 20 characters)")

        ingestion_metadata = {}
        if request.region: ingestion_metadata["region"] = request.region
        if request.language: ingestion_metadata["language"] = request.language
        if request.cultural_context: ingestion_metadata["cultural_context"] = request.cultural_context
        ingestion_metadata["collection"] = request.collection or "general"

        rag = get_rag_service()
        result = rag.ingest_document(
            db=db,
            workspace_id=workspace_id,
            text=request.content,
            title=request.title,
            content_type="manual",
            source="user_input",
            metadata=ingestion_metadata
        )
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Text ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.post("/ingest/website", response_model=CrawlResponse)
async def crawl_website(
    request: CrawlWebsiteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    
    workspace_id = verify_workspace_access(current_user, db)

    try:
        logger.info(f"[CRAWL WEBSITE] user={current_user.id} workspace={workspace_id} url={request.url}")
        url = request.url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        scraper = Webscrapper(url)
        pages = scraper.scrapper_choose()

        if not pages or isinstance(pages, str):
            raise HTTPException(
                status_code=400,
                detail="No pages could be crawled from this website"
            )

        rag = get_rag_service()
        total_chunks = 0

        base_metadata = {}
        if request.region: base_metadata["region"] = request.region
        if request.language: base_metadata["language"] = request.language
        if request.cultural_context: base_metadata["cultural_context"] = request.cultural_context
        base_metadata["collection"] = request.collection or "general"

        for page in pages:
            try:
                content = " ".join(
                    page.get("paragraphs", []) +
                    page.get("headings", []) +
                    page.get("sub_headings", []) +
                    page.get("list_point", [])
                )

                page_metadata = {
                    "word_count": len(content.split())
                }

                final_metadata = {**base_metadata, **page_metadata}

                result = rag.ingest_document(
                    db=db,
                    workspace_id=workspace_id,
                    text=content,
                    title=page.get("title", ""),
                    content_type="website_page",
                    source=page.get("url", url),
                    metadata=final_metadata
                )
                total_chunks += result.get("chunks_created", 0)

            except Exception as e:
                logger.warning(f"Failed to ingest page: {e}")
                continue

        return {
            "status": "success",
            "website": url,
            "pages_crawled": len(pages),
            "chunks_created": total_chunks,
            "message": f"Successfully indexed {len(pages)} pages"
        }

    except Exception as e:
        logger.error(f"Website crawl failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Website crawl failed: {str(e)}"
        )


@router.get("/entries", response_model=ListEntriesResponse)
async def list_entries(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workspace_id = verify_workspace_access(current_user, db)

    try:
        logger.info(f"[LIST ENTRIES] user={current_user.id} workspace={workspace_id} skip={skip} limit={limit}")
        entries = db.query(BrainEntry).filter(
            BrainEntry.workspace_id == workspace_id
        ).order_by(
            BrainEntry.created_at.desc()
        ).offset(skip).limit(limit).all()

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
                "id": entry.id,
                "title": entry.title or (
                    entry.content[:50] + "..."
                    if entry.content and len(entry.content) > 50
                    else entry.content
                ),
                "content_type": entry.content_type or "text",
                "status": entry.status or "indexed",
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
                "word_count": len(entry.content.split()) if entry.content else 0
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

    except Exception as e:
        logger.error(f"Failed to list entries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/entries/{entry_id:uuid}")
async def delete_entry(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    
    workspace_id = verify_workspace_access(current_user, db)

    try:
        logger.warning(f"[DELETE ENTRY] user={current_user.id} workspace={workspace_id} entry_id={entry_id}")
        entry = db.query(BrainEntry).filter(
            BrainEntry.id == str(entry_id),
            BrainEntry.workspace_id == workspace_id
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
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=SearchResponse)
async def search_knowledge(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    
    workspace_id = verify_workspace_access(current_user, db)

    try:
        logger.info(
            f"[SEARCH] user={current_user.id} workspace={workspace_id} "
            f"query={request.query} collection={request.collection} entry_ids={request.entry_ids}"
        )
        rag = get_rag_service()
        results = rag.retrieval.semantic_search(
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

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query", response_model=QueryResponse)
async def query_knowledge(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    
    workspace_id = verify_workspace_access(current_user, db)

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

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=BrainStatsResponse)
async def get_brain_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
   
    workspace_id = verify_workspace_access(current_user, db)

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

    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))