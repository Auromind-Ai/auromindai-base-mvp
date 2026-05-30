import re
import os
import json
from difflib import SequenceMatcher

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "small_talk.json")

with open(JSON_PATH, "r", encoding="utf-8") as f:
    SMALL_TALK = json.load(f)

class helperslayer:
    
    def __init__(self):
        pass

    def clean_text(self, text: str):

        text = text.lower().strip()

        # remove punctuation
        text = re.sub(r"[^\w\s]", "", text)

        # remove extra spaces
        text = re.sub(r"\s+", " ", text)

        return text

    def similarity(self, a, b):

        return SequenceMatcher(None, a, b).ratio()

    
    def get_small_talk_response(self, query: str):

        q = self.clean_text(query)

        if q in SMALL_TALK:
            return SMALL_TALK[q]

        best_match = None
        best_score = 0

        for key, value in SMALL_TALK.items():

            cleaned_key = self.clean_text(key)

            q_words = set(q.split())
            k_words = set(cleaned_key.split())

            overlap = len(q_words & k_words)
            overlap_ratio = overlap / max(len(k_words), 1)

            if overlap_ratio < 0.6:
                continue

            score = self.similarity(q, cleaned_key)

            # containment boost
            if cleaned_key in q or q in cleaned_key:
                score += 0.2

            if score > best_score:
                best_score = score
                best_match = value

        if best_score >= 0.65:
            return best_match

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