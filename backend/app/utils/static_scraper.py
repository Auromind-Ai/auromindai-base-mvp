# import json
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin
from urllib.parse import urlparse
import time

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

            try:
                response = requests.get(current_url, timeout=10)

                if response.status_code != 200:
                    continue

                soup = BeautifulSoup(response.text, "lxml")

                title = soup.title.string if soup.title else ""

                headings = [h.get_text(strip=True) for h in soup.find_all("h1")]
                sub_headings = [h2.get_text(strip=True) for h2 in soup.find_all("h2")]
                paragraphs = [p.get_text(strip=True) for p in soup.find_all("p")]
                list_point = [li.get_text(strip = True) for li in soup.find_all("li")]

                page_content.append({
                    "url": current_url,
                    "title": title,
                    "headings": headings,
                    "sub_headings": sub_headings,
                    "paragraphs": paragraphs,
                    "list_point" : list_point,
                })

                for a in soup.find_all("a", href=True):
                    full_url = urljoin(current_url, a["href"])
                    full_url = full_url.split("#")[0]
                    full_url = full_url.split("?")[0]
                    link_domain = urlparse(full_url).netloc.lower().replace("www.", "")

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