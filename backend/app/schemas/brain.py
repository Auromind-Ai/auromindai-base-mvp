from pydantic import BaseModel, UUID4, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.utils.ssrf_protection import is_safe_url

class IngestTextRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=20, max_length=500000)
    workspace_id: Optional[str] = None
    region: Optional[str] = Field(None, max_length=100)
    language: Optional[str] = Field(None, max_length=50)
    cultural_context: Optional[str] = Field(None, max_length=100)
    collection: Optional[str] = Field("general", max_length=50)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v_str = v.strip()
        if not v_str:
            raise ValueError("Document title cannot be empty.")
        return v_str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v_str = v.strip()
        if len(v_str) < 20:
            raise ValueError("Content too short (minimum 20 characters required).")
        return v_str

class IngestURLRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048)
    workspace_id: Optional[str] = None
    region: Optional[str] = Field(None, max_length=100)
    language: Optional[str] = Field(None, max_length=50)
    cultural_context: Optional[str] = Field(None, max_length=100)
    collection: Optional[str] = Field("general", max_length=50)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v_str = v.strip()
        if not v_str.startswith(("http://", "https://")):
            v_str = "https://" + v_str
        if not is_safe_url(v_str):
            raise ValueError("Invalid or restricted URL. Private network addresses and localhost are forbidden.")
        return v_str

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=96000, description="Search query limited to max 96000 characters")
    workspace_id: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=50)
    entry_ids: Optional[List[str]] = None
    collection: Optional[str] = Field(None, max_length=50)

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Search query cannot be empty.")
        return v

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=96000, description="Question prompt limited to max 96000 characters")
    workspace_id: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=50)
    include_sources: bool = True
    entry_ids: Optional[List[str]] = None
    collection: Optional[str] = Field(None, max_length=50)

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Question prompt cannot be empty.")
        return v

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
    url: str = Field(..., min_length=4, max_length=2048)
    workspace_id: Optional[str] = None
    max_pages: int = Field(default=50, ge=1, le=100)
    region: Optional[str] = Field(None, max_length=100)
    language: Optional[str] = Field(None, max_length=50)
    cultural_context: Optional[str] = Field(None, max_length=100)
    collection: Optional[str] = Field("general", max_length=50)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v_str = v.strip()
        if not v_str.startswith(("http://", "https://")):
            v_str = "https://" + v_str
        if not is_safe_url(v_str):
            raise ValueError("Invalid or restricted website URL. Private network addresses and localhost are forbidden.")
        return v_str

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
    entry_id: Optional[str] = None

