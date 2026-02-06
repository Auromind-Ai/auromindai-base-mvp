"""
Document Processing Service for RAG System
Handles parsing of PDF, DOCX, TXT files and URL scraping.
"""

from typing import Dict, Any, Optional
import io
import logging
import re
import pandas as pd

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Processes various document types for RAG ingestion.
    
    Supported formats:
    - PDF (using PyPDF2)
    - DOCX (using python-docx)
    - TXT (plain text)
    - Excel (.xlsx) (using openpyxl via pandas)
    - CSV (using pandas)
    """
    
    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".csv"}
    MAX_FILE_SIZE_MB = 10
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """
        Extract text from a PDF file.
        
        Args:
            file_content: Raw PDF bytes
            
        Returns:
            Extracted text content
        """
        try:
            from PyPDF2 import PdfReader
            
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            
            text_parts = []
            for page_num, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(f"[Page {page_num + 1}]\n{page_text}")
                except Exception as e:
                    logger.warning(f"Failed to extract page {page_num + 1}: {e}")
                    continue
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Could not extract text from PDF: {e}")
    
    def extract_text_from_docx(self, file_content: bytes) -> str:
        """
        Extract text from a DOCX file.
        
        Args:
            file_content: Raw DOCX bytes
            
        Returns:
            Extracted text content
        """
        try:
            from docx import Document
            
            docx_file = io.BytesIO(file_content)
            doc = Document(docx_file)
            
            text_parts = []
            for para in doc.paragraphs:
                if para.text.strip():
                    text_parts.append(para.text)
            
            # Also extract from tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        text_parts.append(row_text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error(f"DOCX extraction failed: {e}")
            raise ValueError(f"Could not extract text from DOCX: {e}")
    
    def extract_text_from_txt(self, file_content: bytes) -> str:
        """
        Extract text from a plain text file.
        
        Args:
            file_content: Raw text bytes
            
        Returns:
            Text content
        """
        try:
            # Try different encodings
            for encoding in ["utf-8", "latin-1", "cp1252"]:
                try:
                    return file_content.decode(encoding)
                except UnicodeDecodeError:
                    continue
            
            # Fallback with error replacement
            return file_content.decode("utf-8", errors="replace")
        except Exception as e:
            logger.error(f"TXT extraction failed: {e}")
            raise ValueError(f"Could not read text file: {e}")
    
    def process_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Process a file and extract its content.
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            
        Returns:
            Dictionary with extracted text and metadata
        """
        # Validate file size
        size_mb = len(file_content) / (1024 * 1024)
        if size_mb > self.MAX_FILE_SIZE_MB:
            raise ValueError(f"File too large: {size_mb:.1f}MB. Maximum: {self.MAX_FILE_SIZE_MB}MB")
        
        # Determine file type
        filename_lower = filename.lower()
        
        if filename_lower.endswith(".pdf"):
            text = self.extract_text_from_pdf(file_content)
            content_type = "pdf"
        elif filename_lower.endswith((".docx", ".doc")):
            text = self.extract_text_from_docx(file_content)
            content_type = "docx"
        elif filename_lower.endswith((".txt", ".md")):
            text = self.extract_text_from_txt(file_content)
            content_type = "txt"
        elif filename_lower.endswith(".xlsx"):
            text = self.extract_text_from_excel(file_content)
            content_type = "xlsx"
        elif filename_lower.endswith(".csv"):
            text = self.extract_text_from_csv(file_content)
            content_type = "csv"
        else:
            raise ValueError(f"Unsupported file type: {filename}")
        
        if not text or len(text.strip()) < 10:
            raise ValueError("No text content could be extracted from the file")
        
        return {
            "text": text,
            "filename": filename,
            "content_type": content_type,
            "size_bytes": len(file_content),
            "char_count": len(text),
            "word_count": len(text.split())
        }
    def extract_text_from_excel(self, file_content: bytes) -> str:
        """
        Extract text from an Excel (.xlsx) file.
        """
        try:
            excel_file = io.BytesIO(file_content)

            # Read all sheets
            sheets = pd.read_excel(excel_file, sheet_name=None)

            text_parts = []

            for sheet_name, df in sheets.items():
                if df.empty:
                    continue

                # Replace NaN with empty strings
                df = df.fillna("")

                headers = [str(col).strip() for col in df.columns]

                text_parts.append(f"[Sheet: {sheet_name}]")

                # Faster than iterrows()
                for row in df.itertuples(index=False):
                    pairs = []

                    for header, value in zip(headers, row):
                        value = str(value).strip()
                        if value:
                            pairs.append(f"{header}: {value}")

                    if pairs:
                        text_parts.append(", ".join(pairs))

            final_text = "\n".join(text_parts)
            print(final_text)
            if not final_text.strip():
                raise ValueError("Excel file contains no readable data")

            return final_text

        except Exception as e:
            logger.error(f"Excel extraction failed: {e}")
            raise ValueError(f"Could not extract text from Excel file: {e}")

        
    def extract_text_from_csv(self, file_content: bytes) -> str:
       
        try:
            import csv

            try:
                text_data = file_content.decode("utf-8")
            except UnicodeDecodeError:
                text_data = file_content.decode("latin-1")

            reader = csv.reader(text_data.splitlines())

            rows = list(reader)
            if len(rows) < 2:
                raise ValueError("CSV file has no data rows")

            headers = [h.strip() for h in rows[0]]

            text_parts = []

            for row in rows[1:]:
                pairs = []
                for header, value in zip(headers, row):
                    value = value.strip()
                    if value:
                        pairs.append(f"{header}: {value}")

                if pairs:
                    text_parts.append(", ".join(pairs))

            final_text = "\n".join(text_parts)
            print(final_text)
            if not final_text.strip():
                raise ValueError("CSV file contains no readable data")

            return final_text

        except Exception as e:
            logger.error(f"CSV extraction failed: {e}")
            raise ValueError(f"Could not extract text from CSV file: {e}")

class URLScraperService:
    """
    Scrapes and extracts content from URLs.
    """
    
    TIMEOUT_SECONDS = 30
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB
    
    async def scrape_url(self, url: str) -> Dict[str, Any]:
        """
        Scrape content from a URL.
        
        Args:
            url: URL to scrape
            
        Returns:
            Dictionary with extracted text and metadata
        """
        import httpx
        from bs4 import BeautifulSoup
        
        # Validate URL
        if not url.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        
        try:
            async with httpx.AsyncClient(
                timeout=self.TIMEOUT_SECONDS,
                follow_redirects=True,
                headers={"User-Agent": "AuromindAI/1.0 (Knowledge Indexer)"}
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # Check content length
                if len(response.content) > self.MAX_CONTENT_LENGTH:
                    raise ValueError("Page content too large")
                
                # Parse HTML
                soup = BeautifulSoup(response.content, "lxml")
                
                # Extract title
                title = soup.title.string if soup.title else url
                
                # Remove script and style elements
                for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                    element.decompose()
                
                # Extract main content
                main_content = soup.find("main") or soup.find("article") or soup.find("body")
                
                if main_content:
                    text = self._extract_text(main_content)
                else:
                    text = soup.get_text(separator="\n", strip=True)
                
                # Clean text
                text = self._clean_text(text)
                
                if not text or len(text.strip()) < 50:
                    raise ValueError("No meaningful content found on page")
                
                return {
                    "text": text,
                    "title": title.strip() if title else url,
                    "url": url,
                    "content_type": "url",
                    "char_count": len(text),
                    "word_count": len(text.split())
                }
                
        except httpx.RequestError as e:
            logger.error(f"Request failed for {url}: {e}")
            raise ValueError(f"Failed to fetch URL: {e}")
        except Exception as e:
            logger.error(f"Scraping failed for {url}: {e}")
            raise ValueError(f"Failed to scrape URL: {e}")
    
    def _extract_text(self, element) -> str:
        """Extract text from a BeautifulSoup element."""
        texts = []
        for child in element.descendants:
            if child.name in ["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th"]:
                text = child.get_text(strip=True)
                if text:
                    texts.append(text)
        return "\n\n".join(texts)
    
    def _clean_text(self, text: str) -> str:
        """Clean scraped text."""
        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)
        # Remove common boilerplate patterns
        text = re.sub(r'Cookie[s]? (policy|consent|notice).*?(\n|$)', '', text, flags=re.IGNORECASE)
        return text.strip()


# Global instances
_document_service: Optional[DocumentService] = None
_url_scraper: Optional[URLScraperService] = None


def get_document_service() -> DocumentService:
    """Get the global document service instance."""
    global _document_service
    if _document_service is None:
        _document_service = DocumentService()
    return _document_service


def get_url_scraper() -> URLScraperService:
    """Get the global URL scraper instance."""
    global _url_scraper
    if _url_scraper is None:
        _url_scraper = URLScraperService()
    return _url_scraper
