import re
import unicodedata
from typing import List
import tiktoken
import hashlib
import numpy as np

class Schunker:
    
    def __init__( self, model_name: str = "gpt-4o-mini",  max_tokens: int = 500, min_tokens: int = 150, overlap_tokens: int = 50):
        self.tokenizer = tiktoken.encoding_for_model(model_name)
        self.max_tokens = max_tokens
        self.min_tokens = min_tokens
        self.overlap_tokens = overlap_tokens


    def clean_document(self, text: str) -> str:

        if not text:
            return ""
        text = unicodedata.normalize("NFKC", text)
        text = text.replace("“", '"').replace("”", '"')
        text = text.replace("‘", "'").replace("’", "'")
        text = re.sub(r"[^\x20-\x7E\n\t]", " ", text)
        text = re.sub(r"\bPage\s+\d+\b", "", text, flags=re.IGNORECASE)
        text = re.sub(r"-\n", "", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]{2,}", " ", text)
        text = re.sub(r"([.,!?]){2,}", r"\1", text)
        text = text.strip()
        
        lines = text.split("\n")
        line_counts = {}

        for line in lines:
            line_counts[line] = line_counts.get(line, 0) + 1

        filtered_lines = [
            line for line in lines
            if line_counts[line] < 5  # threshold
        ]

        text = "\n".join(filtered_lines)

        return text



    def semantic_presplit(self, text: str) -> List[str]:

        if not text:
            return []

        units = []

        heading_pattern = (
            r"(?<=\n)("
            r"#{1,6}\s+.+|"
            r"\d+(?:\.\d+)*\s+[A-Z][^\n]+|"
            r"[A-Z][A-Z\s]{4,}|"
            r"SECTION\s+\d+[A-Z]?|"
            r"ARTICLE\s+[IVXLC]+|"
            r"CHAPTER\s+\d+|"
            r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:?"
            r")(?=\n)"
        )
        parts = re.split(heading_pattern, text)

        # Merge heading
        merged_parts = []
        i = 0
        while i < len(parts):
            if i + 1 < len(parts):
                merged_parts.append(parts[i] + parts[i + 1])
                i += 2
            else:
                merged_parts.append(parts[i])
                i += 1

        for part in merged_parts:
            
            paragraphs = re.split(r"\n\s*\n", part)

            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue

                #Bullet split
                bullets = re.split(r"\n[-•*]\s+", para)

                for bullet in bullets:
                    bullet = bullet.strip()
                    if not bullet:
                        continue

                    #If too long, split by sentences
                    if len(bullet) > 800:
                        sentences = re.split(r"(?<=[.!?])\s+", bullet)
                        units.extend([s.strip() for s in sentences if s.strip()])
                    else:
                        units.append(bullet)

        return units

    def cosine_similarity(self, v1, v2):
        denom = np.linalg.norm(v1) * np.linalg.norm(v2)
        if denom == 0:
            return 0.0
        return np.dot(v1, v2) / denom
    
    def semantic_boundary_split(self, units: List[str], embed_func, threshold: float = 0.75) -> List[str]:

        if not units:
            return []

        # Compute embeddings
        embeddings = embed_func(units)

        semantic_chunks = []
        current_chunk = units[0]
        current_embedding = embeddings[0]

        for i in range(1, len(units)):
            sim = self.cosine_similarity(current_embedding, embeddings[i])

            if sim < threshold:
                # Topic change → new chunk
                semantic_chunks.append(current_chunk.strip())
                current_chunk = units[i]
                current_embedding = embeddings[i]
            else:
                # Same topic → merge
                current_chunk += " " + units[i]
                current_embedding = (current_embedding + embeddings[i]) / 2

        semantic_chunks.append(current_chunk.strip())

        return semantic_chunks
    
    def token_count(self, text: str) -> int:
        return len(self.tokenizer.encode(text))
    
    def adaptive_max_tokens(self, text: str) -> int:

        length = len(text)
        sentence_count = text.count(".") + text.count("?") + text.count("!")

        if sentence_count == 0:
            return self.max_tokens

        avg_sentence_length = length / sentence_count

        # Dense content → smaller chunk
        if avg_sentence_length > 150:
            return int(self.max_tokens * 0.7)

        # Very short sentences → allow bigger chunk
        if avg_sentence_length < 60:
            return int(self.max_tokens * 1.2)

        return self.max_tokens

    def chunk(self, units: List[str]) -> List[str]:
        chunks = []
        current_chunk = ""
        current_tokens = 0

        for unit in units:
            text = unit
            unit_tokens = self.token_count(text)
            if unit_tokens > self.max_tokens:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                    current_tokens = 0

                # Hard split by tokens
                encoded = self.tokenizer.encode(text)
                for i in range(0, len(encoded), self.max_tokens):
                    sub_tokens = encoded[i:i+self.max_tokens]
                    sub_text = self.tokenizer.decode(sub_tokens)
                    chunks.append(sub_text.strip())

                continue

            candidate = (current_chunk + " " + text).strip()
            dynamic_max = self.adaptive_max_tokens(candidate)
            if current_tokens + unit_tokens > dynamic_max:
                chunks.append(current_chunk.strip())

                # Create overlap
                if self.overlap_tokens > 0:
                    overlap_encoded = self.tokenizer.encode(current_chunk)
                    overlap = overlap_encoded[-self.overlap_tokens:]
                    current_chunk = self.tokenizer.decode(overlap)
                    current_tokens = len(overlap)
                else:
                    current_chunk = ""
                    current_tokens = 0

            # Add unit
            if current_chunk:
                current_chunk += " " + text
            else:
                current_chunk = text

            current_tokens += unit_tokens

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        # Enforce min_tokens
        merged_chunks = []

        for chunk in chunks:
            if not merged_chunks:
                merged_chunks.append(chunk)
                continue

            token_len = self.token_count(chunk)

            if token_len < self.min_tokens:
                # Merge with previous if possible
                prev_chunk = merged_chunks[-1]
                combined = prev_chunk + " " + chunk

                if self.token_count(combined) <= self.max_tokens:
                    merged_chunks[-1] = combined.strip()
                else:
                    merged_chunks.append(chunk.strip())
            else:
                merged_chunks.append(chunk.strip())


        final_chunks = []
        seen_hashes = set()

        for idx, chunk in enumerate(merged_chunks):
            normalized = re.sub(r"\s+", " ", chunk.strip().lower())
            chunk_id = hashlib.sha256(normalized.encode()).hexdigest()

            if chunk_id in seen_hashes:
                continue  # Skip duplicate

            seen_hashes.add(chunk_id)

            final_chunks.append({
                "id": chunk_id,
                "text": chunk,
                "token_count": self.token_count(chunk),
                "chunk_index": idx + 1,
            })

        return final_chunks
    
    def build_chunks(self, raw_text: str, embed_func=None) -> List[dict]:

        cleaned = self.clean_document(raw_text)
        units = self.semantic_presplit(cleaned)
        if embed_func:
            units = self.semantic_boundary_split(units, embed_func)
        chunks = self.chunk(units)
        print("chunks completed")

        return chunks
