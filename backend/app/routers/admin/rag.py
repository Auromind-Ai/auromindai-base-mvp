from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from sqlalchemy import func

from app.database import get_db
from app.models.brain import BrainEntry, BrainChunk

router = APIRouter()


@router.get("/rag")
async def get_rag_entries(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get RAG knowledge base entries.
    """
    try:
        entries = db.query(BrainEntry).all()
        rag_list = []
        for entry in entries:
            chunk_count = db.query(func.count(BrainChunk.id)).filter(
                BrainChunk.entry_id == entry.id
            ).scalar() or 0
            rag_list.append({
                "id": entry.id,
                "workspace_id": entry.workspace_id,
                "title": entry.title,
                "content_type": entry.content_type,
                "chunk_count": chunk_count,
                "status": entry.status,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            })
        return rag_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching RAG entries: {str(e)}")
