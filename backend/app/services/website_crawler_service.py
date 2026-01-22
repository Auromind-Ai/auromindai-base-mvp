"""
Website Crawler Service for AuromindAI Brain
Crawls entire websites to build comprehensive knowledge bases.
"""

from typing import List, Dict, Any, Set, Optional
import asyncio
import logging
import re
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)


class WebsiteCrawlerService:
    """
    Crawls entire websites to extract knowledge.
    
    Features:
    - Follows internal links up to max_pages
    - Cleans content (removes nav, footer, ads)
    - Extracts page metadata
    - Respects same-domain policy
    """
    
    def __init__(
        self,
        max_pages: int = 50,
        timeout_seconds: int = 30,
        max_depth: int = 3
    ):
        self.max_pages = max_pages
        self.timeout_seconds = timeout_seconds
        self.max_depth = max_depth
        self.visited_urls: Set[str] = set()
        self.pages_crawled = 0
    
    async def crawl_website(self, start_url: str) -> List[Dict[str, Any]]:
        """
        Crawl a website starting from the given URL.
        
        Args:
            start_url: The homepage or starting URL
            
        Returns:
            List of page data dictionaries
        """
        import httpx
        from bs4 import BeautifulSoup
        
        # Normalize start URL
        if not start_url.startswith(('http://', 'https://')):
            start_url = 'https://' + start_url
        
        parsed = urlparse(start_url)
        base_domain = parsed.netloc
        
        logger.info(f"Starting website crawl: {start_url} (max {self.max_pages} pages)")
        
        self.visited_urls = set()
        self.pages_crawled = 0
        pages = []
        
        # BFS crawl
        queue = [(start_url, 0)]  # (url, depth)
        
        async with httpx.AsyncClient(
            timeout=self.timeout_seconds,
            follow_redirects=True,
            verify=False,  # Handle SSL issues
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
            }
        ) as client:
            while queue and self.pages_crawled < self.max_pages:
                url, depth = queue.pop(0)
                
                if url in self.visited_urls:
                    continue
                
                if depth > self.max_depth:
                    continue
                
                self.visited_urls.add(url)
                
                try:
                    page_data = await self._scrape_page(client, url, base_domain)
                    if page_data:
                        pages.append(page_data)
                        self.pages_crawled += 1
                        
                        # Add new links to queue
                        if depth < self.max_depth:
                            for link in page_data.get('internal_links', []):
                                if link not in self.visited_urls:
                                    queue.append((link, depth + 1))
                        
                        logger.info(f"Crawled {self.pages_crawled}/{self.max_pages}: {url}")
                        
                except Exception as e:
                    logger.warning(f"Failed to crawl {url}: {e}")
                    continue
                
                # Small delay to be polite
                await asyncio.sleep(0.5)
        
        logger.info(f"Website crawl complete. {len(pages)} pages indexed.")
        return pages
    
    async def _scrape_page(
        self,
        client,
        url: str,
        base_domain: str
    ) -> Optional[Dict[str, Any]]:
        """Scrape a single page and extract content + links."""
        from bs4 import BeautifulSoup
        
        try:
            response = await client.get(url)
            response.raise_for_status()
            
            # Only process HTML
            content_type = response.headers.get('content-type', '')
            if 'text/html' not in content_type:
                return None
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Extract title
            title = soup.title.string.strip() if soup.title else url
            
            # Remove unwanted elements
            for element in soup(
                ['script', 'style', 'nav', 'footer', 'header', 
                 'aside', 'iframe', 'noscript', 'form']
            ):
                element.decompose()
            
            # Remove common ad/widget classes
            for selector in [
                '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
                '[class*="banner"]', '[class*="sidebar"]', '[class*="widget"]',
                '[class*="advertisement"]', '[class*="social"]', '[id*="cookie"]',
                '[id*="popup"]', '[id*="banner"]', '[class*="nav"]'
            ]:
                for element in soup.select(selector):
                    element.decompose()
            
            # Extract main content
            main_content = soup.find('main') or soup.find('article') or soup.find('body')
            
            if main_content:
                text = self._extract_clean_text(main_content)
            else:
                text = soup.get_text(separator='\n', strip=True)
            
            # Clean text
            text = self._clean_text(text)
            
            if len(text.strip()) < 100:
                return None  # Skip pages with too little content
            
            # Extract internal links
            internal_links = self._extract_internal_links(soup, url, base_domain)
            
            # Detect page type
            page_type = self._detect_page_type(url, title, text)
            
            # Extract metadata
            meta_description = ''
            meta_tag = soup.find('meta', attrs={'name': 'description'})
            if meta_tag and meta_tag.get('content'):
                meta_description = meta_tag['content']
            
            return {
                'url': url,
                'title': title[:200],
                'content': text,
                'page_type': page_type,
                'meta_description': meta_description,
                'word_count': len(text.split()),
                'internal_links': internal_links
            }
            
        except Exception as e:
            logger.warning(f"Error scraping {url}: {type(e).__name__}: {e}")
            return None
    
    def _extract_clean_text(self, element) -> str:
        """Extract text from element with proper formatting."""
        texts = []
        for child in element.descendants:
            if child.name in ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'div', 'span']:
                text = child.get_text(strip=True)
                if text and len(text) > 10:
                    texts.append(text)
        return '\n\n'.join(texts)
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)
        # Remove common boilerplate
        text = re.sub(r'Cookie[s]? (policy|consent|notice).*?(\n|$)', '', text, flags=re.IGNORECASE)
        text = re.sub(r'(Subscribe|Sign up) (to|for) (our|the) newsletter.*?(\n|$)', '', text, flags=re.IGNORECASE)
        return text.strip()
    
    def _extract_internal_links(self, soup, current_url: str, base_domain: str) -> List[str]:
        """Extract internal links from the page."""
        links = []
        seen = set()
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            
            # Skip anchors, javascript, mailto
            if href.startswith(('#', 'javascript:', 'mailto:', 'tel:')):
                continue
            
            # Make absolute URL
            full_url = urljoin(current_url, href)
            
            # Parse and check domain
            parsed = urlparse(full_url)
            if parsed.netloc != base_domain:
                continue
            
            # Normalize URL (remove fragments)
            normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            if normalized.endswith('/'):
                normalized = normalized[:-1]
            
            # Skip already seen
            if normalized in seen or normalized in self.visited_urls:
                continue
            
            # Skip non-page resources
            if re.search(r'\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|mp3|mp4|ico)$', parsed.path, re.I):
                continue
            
            seen.add(normalized)
            links.append(normalized)
        
        return links[:50]  # Limit links per page
    
    def _detect_page_type(self, url: str, title: str, content: str) -> str:
        """Detect the type of page for metadata."""
        url_lower = url.lower()
        title_lower = title.lower()
        
        # Check URL patterns
        patterns = {
            'blog': ['blog', 'post', 'article', 'news'],
            'product': ['product', 'shop', 'store', 'item'],
            'pricing': ['pricing', 'plans', 'subscription'],
            'faq': ['faq', 'help', 'support', 'question'],
            'about': ['about', 'team', 'company', 'story'],
            'services': ['service', 'solutions', 'what-we-do'],
            'contact': ['contact', 'get-in-touch'],
            'legal': ['privacy', 'terms', 'policy', 'legal'],
            'career': ['career', 'jobs', 'hiring', 'work-with-us']
        }
        
        for page_type, keywords in patterns.items():
            for keyword in keywords:
                if keyword in url_lower or keyword in title_lower:
                    return page_type
        
        return 'general'


# Global instance
_crawler: Optional[WebsiteCrawlerService] = None


def get_website_crawler() -> WebsiteCrawlerService:
    """Get the global website crawler instance."""
    global _crawler
    if _crawler is None:
        _crawler = WebsiteCrawlerService()
    return _crawler
