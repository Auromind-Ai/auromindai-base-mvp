"""
Text Chunking Utility for RAG System
Splits large documents into overlapping chunks for better retrieval.
"""

from typing import List, Dict, Any
import re


class TextChunker:
    """
    Splits text into semantic chunks with overlap for context preservation.
    
    Attributes:
        chunk_size: Target size of each chunk in characters (~500 tokens ≈ 2000 chars)
        chunk_overlap: Overlap between chunks for context continuity
    """
    
    def __init__(self, chunk_size: int = 1500, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def split_text(self, text: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks with metadata.
        
        Args:
            text: The text to split
            metadata: Optional metadata to attach to each chunk
            
        Returns:
            List of chunk dictionaries with content and metadata
        """
        if not text or not text.strip():
            return []
        
        # Clean the text
        text = self._clean_text(text)
        
        # Split by paragraphs first for semantic boundaries
        paragraphs = self._split_by_paragraphs(text)
        
        chunks = []
        current_chunk = ""
        chunk_index = 0
        
        for paragraph in paragraphs:
            # If adding this paragraph exceeds chunk size
            if len(current_chunk) + len(paragraph) > self.chunk_size:
                if current_chunk:
                    chunks.append(self._create_chunk(
                        content=current_chunk.strip(),
                        index=chunk_index,
                        metadata=metadata
                    ))
                    chunk_index += 1
                    
                    # Keep overlap from previous chunk
                    overlap_start = max(0, len(current_chunk) - self.chunk_overlap)
                    current_chunk = current_chunk[overlap_start:] + "\n\n" + paragraph
                else:
                    # Paragraph itself is too large, split it
                    sub_chunks = self._split_large_paragraph(paragraph)
                    for sub_chunk in sub_chunks[:-1]:
                        chunks.append(self._create_chunk(
                            content=sub_chunk.strip(),
                            index=chunk_index,
                            metadata=metadata
                        ))
                        chunk_index += 1
                    current_chunk = sub_chunks[-1] if sub_chunks else ""
            else:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph
        
        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(self._create_chunk(
                content=current_chunk.strip(),
                index=chunk_index,
                metadata=metadata
            ))
        
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)
        # Remove control characters except newlines and tabs
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        return text.strip()
    
    def _split_by_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs."""
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if p.strip()]
    
    def _split_large_paragraph(self, paragraph: str) -> List[str]:
        """Split a large paragraph by sentences."""
        sentences = re.split(r'(?<=[.!?])\s+', paragraph)
        
        chunks = []
        current = ""
        
        for sentence in sentences:
            if len(current) + len(sentence) > self.chunk_size:
                if current:
                    chunks.append(current)
                current = sentence
            else:
                current += " " + sentence if current else sentence
        
        if current:
            chunks.append(current)
        
        return chunks
    
    def _create_chunk(self, content: str, index: int, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create a chunk dictionary with metadata."""
        chunk = {
            "content": content,
            "chunk_index": index,
            "char_count": len(content),
            "word_count": len(content.split())
        }
        
        if metadata:
            chunk["metadata"] = metadata
        
        return chunk


def chunk_document(text: str, title: str = None, source: str = None, **extra_metadata) -> List[Dict[str, Any]]:
    """
    Convenience function to chunk a document with standard metadata.
    
    Args:
        text: Document text to chunk
        title: Document title
        source: Source identifier (filename, URL, etc.)
        **extra_metadata: Additional metadata to attach
        
    Returns:
        List of chunk dictionaries
    """
    metadata = {
        "title": title,
        "source": source,
        **extra_metadata
    }
    
    chunker = TextChunker()
    return chunker.split_text(text, metadata)
