import re
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "small_talk.json")

with open(JSON_PATH, "r", encoding="utf-8") as f:
    SMALL_TALK = json.load(f)

class helperslayer:
    
    def __init__(self):
        pass
    
    def get_small_talk_response(self, query: str):
        q = query.lower().strip()

        # Remove punctuation
        q = re.sub(r'[^\w\s]', '', q)

        # Exact match only
        if q in SMALL_TALK:
            return SMALL_TALK[q]

        return None
    
    def extract_url(self, query):

        urls = re.findall(r'https?://\S+', query)

        if urls:
            return urls[0]

        return None  
    
    
    def select_relevant_sections(self, scraped_data, query):

        query_words = set(query.lower().split())
        scored_pages = []

        for page in scraped_data:

            headings = " ".join(page.get("headings", [])).lower()
            sub_headings = " ".join(page.get("sub_headings", [])).lower()

            combined = headings + " " + sub_headings
            heading_words = set(combined.split())

            overlap = len(query_words.intersection(heading_words))

            scored_pages.append((overlap, page))

        scored_pages.sort(key=lambda x: x[0], reverse=True)

        # return ONLY the most relevant page
        return [scored_pages[0][1]]