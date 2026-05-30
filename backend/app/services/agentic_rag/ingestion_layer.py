import logging
from sqlalchemy.orm import Session 
from typing import Dict, Any
import uuid
from app.utils.text_chunker import Schunker
import json
from app.models.brain import BrainEntry
from app.services.agentic_rag.embedding_service import EmbeddingGenerator

logger = logging.getLogger(__name__)

class IngestionLayer:

    def __init__(self, vector_store):
        self.vector_store = vector_store

    def ingest_document(
        self,
        db: Session,
        workspace_id: str,
        text: str,
        title: str,
        content_type: str,
        source: str = None,
        metadata: Dict[str, Any] = None,
        existing_entry_id: str = None  
    ) -> Dict[str, Any]:
         
        if not text or len(text.strip()) < 10:
            raise ValueError("Document text is too short")
        
        # Generate parent entry ID
        parent_id = existing_entry_id if existing_entry_id else str(uuid.uuid4())

        
        # Chunk the document
        chunk_metadata = {
            "title": title,
            "content_type": content_type,
            "source": source or "",
            "parent_id": parent_id,
            **(metadata or {})
        }
        
        chunker = Schunker()
        chunks = chunker.build_chunks(text)
        
        if not chunks:
            raise ValueError("No chunks could be created from document")
        
        logger.info(f"Created {len(chunks)} chunks for document: {title}")
        
        # Generate embeddings for all chunks
        chunk_texts = [c["text"] for c in chunks]
        embedding = EmbeddingGenerator()
        embeddings = embedding.generate_embeddings(chunk_texts)
        
        # Prepare data for vector store
        metadata_json_str = json.dumps(metadata) if metadata else None

        if existing_entry_id:
            # Update existing entry
            brain_entry = db.query(BrainEntry).filter(BrainEntry.id == existing_entry_id).first()
            if brain_entry:
                brain_entry.title = title
                brain_entry.content = text[:5000]
                brain_entry.content_type = content_type
                brain_entry.metadata_json = metadata_json_str
        else:
            # Create new entry
            brain_entry = BrainEntry(
                id=parent_id,
                workspace_id=workspace_id,
                title=title,
                content=text[:5000] if text else "Pending processing...",  # Ensure non-null content
                content_type=content_type,
                embedding=None,  # Embeddings are in BrainChunk table
                version=1,
                status="completed", # Default for synchronous calls
                metadata_json=metadata_json_str
            )
            db.add(brain_entry)
        
        # Flush to ensure parent_id is valid for FK
        db.flush()
        
        # Store in vector database
        self.vector_store.add_chunks(
            db=db,
            workspace_id=workspace_id,
            chunks=chunks,   
            embeddings=embeddings,
            parent_id=parent_id
        )
        
        db.commit()
        
        logger.info(f"Ingested document '{title}' with {len(chunks)} chunks")
        
        return {
            "status": "success",
            "entry_id": parent_id,
            "title": title,
            "content_type": content_type,
            "chunks_created": len(chunks),
            "total_words": sum(len(c["text"].split()) for c in chunks)
        }
