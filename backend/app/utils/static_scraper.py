from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin
from urllib.parse import urlparse
import time
import re

blocked_keywords = [
    "login", "signin", "signup",
    "register", "search",
    "account", "cart", "checkout"
    ]

class Staticscraper():
    def __init__(self, url):
        self.url = url
        self.max_depth = 3
        self.base_domain = urlparse(url).netloc.lower().replace("www.", "")

    

    def clean_text(self, text):
        text = re.sub(r"http\S+", "", text)        # remove links
        text = re.sub(r"\s+", " ", text)           # normalize spaces
        text = re.sub(r"[^\x00-\x7F]+", "", text)  # remove emojis/unicode
        text = text.strip()

        if len(text) < 30:
            return None

        return text

    def static_scrap (self):
        print("web scrapping started")
        visited = set()
        to_visit = [(self.url, 0)]
        page_content = []

        while to_visit:

            current_url, depth = to_visit.pop(0)

            if current_url in visited:
                continue

            print(f"Scraping: {current_url}")
            visited.add(current_url)

            from app.utils.ssrf_protection import safe_requests_get, is_safe_url
            if not is_safe_url(current_url):
                continue

            try:
                response = safe_requests_get(
                    current_url,
                    timeout=10,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
                )

                if response.status_code != 200:
                    continue

                soup = BeautifulSoup(response.text, "lxml")
                
                for tag in soup([
                    "script","style","noscript",
                    "nav","header","footer","aside",
                    "form","button","input"
                ]):
                    tag.decompose()

                title = soup.title.string if soup.title else ""

                main_content = (
                    soup.find("main")
                    or soup.find("article")
                    or soup.find("div", {"role": "main"})
                    or soup.find("div", {"id": "content"})
                    or soup
                )

                headings = [
                    self.clean_text(h.get_text())
                    for h in main_content.find_all("h1")
                    if self.clean_text(h.get_text())
                ]

                sub_headings = [
                    self.clean_text(h.get_text())
                    for h in main_content.find_all("h2")
                    if self.clean_text(h.get_text())
                ]

                paragraphs = [
                    self.clean_text(p.get_text())
                    for p in main_content.find_all("p")
                    if self.clean_text(p.get_text())
                ]

                list_point = [
                    self.clean_text(li.get_text())
                    for li in main_content.find_all("li")
                    if self.clean_text(li.get_text())
                ]

                page_content.append({
                    "url": current_url,
                    "title": title,
                    "headings": headings,
                    "paragraphs": paragraphs,
                    "list_point" : list_point,
                })

                for a in soup.find_all("a", href=True):

                    full_url = urljoin(current_url, a["href"])
                    full_url = full_url.split("#")[0]
                    full_url = full_url.split("?")[0]
                    link_domain = urlparse(full_url).netloc.lower().replace("www.", "")

                    if any(full_url.lower().endswith(ext) for ext in [
                        ".jpg",".jpeg",".png",".gif",".svg",
                        ".pdf",".zip",".doc",".docx",".xls",".xlsx"
                    ]):
                        continue

                    if link_domain != self.base_domain:
                        continue

                    if full_url in visited:
                        continue
                    
                    if any(word in full_url.lower() for word in blocked_keywords):
                        continue

                    if depth + 1 > self.max_depth:
                        continue

                    to_visit.append((full_url, depth + 1))

                time.sleep(1)

            except requests.RequestException:
                continue

        # with open("static_output.json", "w", encoding="utf-8") as f:
        #     json.dump(page_content, f, indent=4, ensure_ascii=False)
        #     print(page_content)

        return page_content