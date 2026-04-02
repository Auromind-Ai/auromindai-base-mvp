"""
Brain Router - REST API for Knowledge Base Operations
Provides endpoints for document ingestion, search, and RAG queries.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from app.routers.auth import get_current_user # Import auth dependency
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import logging
from app.database import get_db
from app.services.document_service import get_url_scraper
from app.models.brain import BrainEntry
from app.workers.ingestion_worker import process_document_background
import uuid
import os
import shutil
from fastapi import Request
from app.services.agentic_rag.ingestion_layer import IngestionLayer
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app.utils.website_scraper import Webscrapper


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/brain", tags=["brain"])


# ============== Request/Response Models ==============

class IngestTextRequest(BaseModel):
    """Request model for manual text ingestion."""
    title: str
    content: str
    workspace_id: str
    region: Optional[str] = None
    language: Optional[str] = None
    cultural_context: Optional[str] = None


class IngestURLRequest(BaseModel):
    """Request model for URL ingestion."""
    url: str
    workspace_id: str
    region: Optional[str] = None
    language: Optional[str] = None
    cultural_context: Optional[str] = None


class SearchRequest(BaseModel):
    """Request model for semantic search."""
    query: str
    workspace_id: str
    top_k: int = 5


class QueryRequest(BaseModel):
    """Request model for RAG query."""
    question: str
    workspace_id: str
    top_k: int = 5
    include_sources: bool = True


class BrainEntryResponse(BaseModel):
    """Response model for brain entries."""
    id: str
    title: str
    content_type: str
    status: str
    created_at: str
    word_count: int = 0


class CrawlWebsiteRequest(BaseModel):
    """Request model for full website crawl."""
    url: str
    workspace_id: str
    max_pages: int = 50
    region: Optional[str] = None
    language: Optional[str] = None
    cultural_context: Optional[str] = None



# ============== Endpoints ==============

@router.post("/ingest/document")
async def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    region: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    cultural_context: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user) # Add authentication security
):

    """
    Upload and index a document (PDF, DOCX, TXT, Images).
    
    The document will be:
    1. Parsed to extract text (OCR for images if needed)
    2. Split into chunks
    3. Embedded and stored in vector database
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        allowed_extensions = {".pdf", ".docx", ".doc", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp", ".xlsx", ".xls", ".csv"}
        file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Create entry ID and temp path
        entry_id = str(uuid.uuid4())
        temp_dir = os.path.join(os.getcwd(), "temp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, f"{entry_id}_{file.filename}")
        
        # Save file to temp
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Get file size
        file_size = os.path.getsize(temp_file_path)
        
        # Create initial DB entry (PENDING)
        new_entry = BrainEntry(
            id=entry_id,
            workspace_id=workspace_id,
            title=file.filename,
            content="Processing...", # Placeholder
            content_type=file_ext.replace(".", ""),
            status="pending",
            embedding=None
        )
        db.add(new_entry)
        db.commit()
        
        # Trigger Background Task
        # Prepare metadata for background task
        metadata_for_worker = {}
        if region:
            metadata_for_worker["region"] = region
        if language:
            metadata_for_worker["language"] = language
        if cultural_context:
            metadata_for_worker["cultural_context"] = cultural_context

        background_tasks.add_task(
            process_document_background,
            entry_id=entry_id,
            workspace_id=workspace_id,
            file_path=temp_file_path,
            original_filename=file.filename,
            content_type=file_ext.replace(".", ""),
            file_size=file_size,
            metadata=metadata_for_worker # Pass the metadata
        )
        
        return {
            "status": "pending",
            "entry_id": entry_id,
            "title": file.filename,
            "message": "File upload accepted. Processing in background.",
            "original_filename": file.filename,
            "chunks_created": 0  # Will be updated in background
        }

        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.post("/ingest/url")
async def ingest_url(
    request: IngestURLRequest,
    db: Session = Depends(get_db)
):
    """
    Scrape and index content from a URL.
    
    The page will be:
    1. Fetched and parsed
    2. Text extracted from main content
    3. Split into chunks and embedded
    """
    try:
        # Scrape URL
        scraper = get_url_scraper()
        scrape_result = await scraper.scrape_url(request.url)
        
        # Prepare metadata for ingestion
        ingestion_metadata = {}
        if request.region:
            ingestion_metadata["region"] = request.region
        if request.language:
            ingestion_metadata["language"] = request.language
        if request.cultural_context:
            ingestion_metadata["cultural_context"] = request.cultural_context

        # Ingest into RAG system
        vector_store = VectorStoreService()
        ingestion = IngestionLayer(vector_store=vector_store)

        result = ingestion.ingest_document(
            db=db,
            workspace_id=request.workspace_id,
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


@router.get("/ingest/status/{entry_id}")
async def get_ingestion_status(
    entry_id: str,
    db: Session = Depends(get_db)
):
    """
    Check the status of a background ingestion job.
    """
    entry = db.query(BrainEntry).filter(BrainEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
        
    return {
        "id": entry.id,
        "status": entry.status,
        "error_message": entry.error_message,
        "created_at": entry.created_at,
        "title": entry.title
    }



@router.post("/ingest/text")
async def ingest_text(
    request: IngestTextRequest,
    db: Session = Depends(get_db)
):
    """
    Manually add text knowledge to the brain.
    
    Useful for:
    - FAQs
    - Business rules
    - Policies
    - Quick notes
    """
    try:
        if len(request.content.strip()) < 20:
            raise HTTPException(status_code=400, detail="Content too short (minimum 20 characters)")
        
        # Prepare metadata for ingestion
        ingestion_metadata = {}
        if request.region:
            ingestion_metadata["region"] = request.region
        if request.language:
            ingestion_metadata["language"] = request.language
        if request.cultural_context:
            ingestion_metadata["cultural_context"] = request.cultural_context

        vector_store = VectorStoreService()
        ingestion = IngestionLayer(vector_store=vector_store)

        result = ingestion.ingest_document(
            db=db,
            workspace_id=request.workspace_id,
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


@router.post("/ingest/website")
async def crawl_website(
    request: CrawlWebsiteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    try:
        url = request.url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        # 🔹 Use your existing Webscrapper
        scraper = Webscrapper(url)
        pages = scraper.scrapper_choose()

        if not pages or isinstance(pages, str):
            raise HTTPException(
                status_code=400,
                detail="No pages could be crawled from this website"
            )

        vector_store = VectorStoreService()
        ingestion = IngestionLayer(vector_store=vector_store)
        total_chunks = 0

        base_metadata = {}
        if request.region:
            base_metadata["region"] = request.region
        if request.language:
            base_metadata["language"] = request.language
        if request.cultural_context:
            base_metadata["cultural_context"] = request.cultural_context

        for page in pages:
            try:
                # 🟢 Convert your scraper output → API expected format
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
            
                result = ingestion.ingest_document(
                    db=db,
                    workspace_id=request.workspace_id,
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

@router.get("/entries")
async def list_entries(
    workspace_id: str,
    request: Request,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    List all knowledge entries for a workspace.
    """
    try:
        entries = db.query(BrainEntry).filter(
            BrainEntry.workspace_id == workspace_id
        ).order_by(
            BrainEntry.created_at.desc()
        ).offset(skip).limit(limit).all()

        # Get vector store stats
        orchestrator = request.app.state.orchestrator
        vector_store = orchestrator.retrieval.vector_store

        stats = vector_store.get_collection_stats(
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

        # Dynamic workspace status
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

@router.delete("/entries/{entry_id}")
async def delete_entry(
    entry_id: str,
    workspace_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Delete a knowledge entry and all its chunks.
    """
    try:
        orchestrator = request.app.state.orchestrator

        success = orchestrator.retrieval.vector_store.delete_entry(
            db=db,
            workspace_id=workspace_id,
            entry_id=entry_id
        )
        
        if success:
            return {"status": "success", "message": "Entry deleted"}
        else:
            raise HTTPException(status_code=404, detail="Entry not found")
            
    except Exception as e:
        logger.error(f"Failed to delete entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_knowledge(
    request: SearchRequest,
    db: Session = Depends(get_db)
):
    """
    Perform semantic search across the knowledge base.
    
    Returns matching chunks ranked by relevance.
    """
    try:
        orchestrator = request.app.state.orchestrator

        results = orchestrator.retrieval.semantic_search(
            db=db,
            workspace_id=request.workspace_id,
            query=request.query
        )
        
        return {
            "query": request.query,
            "results": [
                {
                    "id": r["id"],
                    "content": r["document"],
                    "title": r["metadata"].get("title", "Unknown"),
                    "score": round(r["score"], 3)
                }
                for r in results
            ],
            "total": len(results)
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
async def query_knowledge(
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    """
    Ask a question and get an AI-generated answer using RAG.
    
    The system will:
    1. Search for relevant context
    2. Generate an answer using the LLM
    3. Return the answer with source citations
    """
    try:
        orchestrator = request.app.state.orchestrator

        result = await orchestrator.agent_loop(
            db=db,
            workspace_id=request.workspace_id,
            query=request.question
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_brain_stats(
    workspace_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get statistics for the knowledge base.
    """
    try:
        orchestrator = request.app.state.orchestrator
        vector_store = orchestrator.retrieval.vector_store

        stats = vector_store.get_collection_stats(
            db=db,
            workspace_id=workspace_id
        )
        
        # Count entries in SQL
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
