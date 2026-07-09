from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class IngestTextRequest(BaseModel):
    title: str
    content: str
    workspace_id: Optional[str] = None
    region: Optional[str] = None
    language: Optional[str] = None
    cultural_context: Optional[str] = None
    collection: Optional[str] = None

class IngestURLRequest(BaseModel):
    url: str
    workspace_id: Optional[str] = None
    region: Optional[str] = None
    language: Optional[str] = None
    cultural_context: Optional[str] = None
    collection: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    workspace_id: Optional[str] = None
    top_k: int = 5
    entry_ids: Optional[List[str]] = None
    collection: Optional[str] = None

class QueryRequest(BaseModel):
    question: str
    workspace_id: Optional[str] = None
    top_k: int = 5
    include_sources: bool = True
    entry_ids: Optional[List[str]] = None
    collection: Optional[str] = None

class BrainEntryResponse(BaseModel):
    id: UUID4
    title: str
    content_type: str
    status: str
    created_at: str
    word_count: int = 0
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    credits_charged: Optional[float] = None
    embedding_status: Optional[str] = None

class SearchResultItem(BaseModel):
    id: str
    content: str
    title: str
    score: float

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
    total: int
    collection: Optional[str] = None
    entry_ids: Optional[List[str]] = None

class SourceItem(BaseModel):
    id: str
    title: str
    score: float

class QueryResponse(BaseModel):
    answer: str
    sources: Optional[List[SourceItem]] = None

class BrainStatsResponse(BaseModel):
    knowledge_entries: int
    chunk_count: Optional[int] = None

class IngestionStatusResponse(BaseModel):
    id: UUID
    status: str
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None 
    title: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    credits_charged: Optional[float] = None
    embedding_status: Optional[str] = None

class ListEntriesResponse(BaseModel):
    entries: List[dict]
    total: int
    indexed_chunks: int
    status: str

class CrawlWebsiteRequest(BaseModel):
    url: str
    workspace_id: Optional[str] = None
    max_pages: int = 50
    region: Optional[str] = None
    language: Optional[str] = None
    cultural_context: Optional[str] = None
    collection: Optional[str] = None

class IngestResponse(BaseModel):
    status: str
    entry_id: str
    title: str
    message: Optional[str] = None
    original_filename: Optional[str] = None
    content_type: Optional[str] = None
    chunks_created: int = 0
    total_words: Optional[int] = None

class CrawlResponse(BaseModel):
    status: str
    website: str
    pages_crawled: int
    chunks_created: int
    message: str
