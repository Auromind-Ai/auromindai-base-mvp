import re
import hashlib
import string
import logging
from typing import Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.brain import BrainEntry

logger = logging.getLogger(__name__)

# Pre-compiled regular expressions (compiled ONCE at module load, NOT per request)
PROMPT_INJECTION_COMPILED = [
    re.compile(pattern, re.IGNORECASE) for pattern in [
        r"ignore\s+all\s+previous\s+instructions",
        r"system\s+prompt\s+override",
        r"you\s+are\s+now\s+a",
        r"disregard\s+above\s+instructions",
        r"override\s+system\s+rules",
    ]
]
URL_REGEX = re.compile(r"https?://\S+", re.IGNORECASE)
WHITESPACE_REGEX = re.compile(r"\s+")

# Common binary file signature magic headers (if raw binary text is passed)
BINARY_MAGIC_HEADERS = [
    b"%PDF-",          # PDF
    b"PK\x03\x04",     # ZIP / DOCX / XLSX
    b"\x7fELF",        # ELF Binary
    b"\x89PNG",        # PNG
    b"GIF8",           # GIF
    b"\xff\xd8\xff",   # JPEG
    b"BM",             # BMP
    b"Rar!",           # RAR
]


def detect_binary_data(text: str) -> Tuple[bool, str]:
    
    if not text:
        return True, "Content is empty."

    # Null byte check
    if "\x00" in text:
        return True, "Binary data detected: NULL bytes present in text."

    # Binary Magic Header Check (if binary data was decoded forcibly)
    raw_bytes = text.encode("utf-8", errors="ignore")[:32]
    for magic in BINARY_MAGIC_HEADERS:
        if raw_bytes.startswith(magic):
            return True, f"Binary data detected: File signature '{magic.decode('latin-1', errors='ignore')}' found."

    # Unicode & Non-Printable Character Ratio Check
    printable = set(string.printable)
    total_chars = len(text)
    non_printable_count = sum(1 for char in text if char not in printable and ord(char) < 32)

    max_non_printable_ratio = getattr(settings, "MAX_NON_PRINTABLE_RATIO", 0.03)
    if total_chars > 0 and (non_printable_count / total_chars) > max_non_printable_ratio:
        return True, f"Binary or non-text data detected ({non_printable_count} control characters)."

    return False, ""


def detect_low_quality(text: str) -> Tuple[bool, str]:
    
    clean_text = text.strip()
    min_len = getattr(settings, "MIN_INGESTION_TEXT_LENGTH", 20)
    if len(clean_text) < min_len:
        return True, f"Content too short (minimum {min_len} characters required)."

    total_chars = len(clean_text)
    alphanumeric_count = sum(1 for c in clean_text if c.isalnum())
    min_alpha_ratio = getattr(settings, "MIN_ALPHANUMERIC_RATIO", 0.35)

    #  Check Alphanumeric Density
    if (alphanumeric_count / total_chars) < min_alpha_ratio:
        return True, "Low quality text: High symbol density or insufficient readable text."

    words = [w.strip() for w in clean_text.split() if w.strip()]
    if not words:
        return True, "Low quality text: No valid words found."

    # Check for unbroken tokens (e.g. binary/hash strings)
    max_word_len_config = getattr(settings, "MAX_UNBROKEN_WORD_LENGTH", 150)
    max_word_len = max(len(w) for w in words)
    if max_word_len > max_word_len_config:
        return True, f"Low quality text: Unbroken character sequence of length {max_word_len} detected."

    # Check Unique Word Ratio (detect repetitive spam/junk)
    min_unique_ratio = getattr(settings, "MIN_UNIQUE_WORD_RATIO", 0.12)
    if len(words) >= 20:
        unique_words = set(w.lower() for w in words)
        unique_ratio = len(unique_words) / len(words)
        if unique_ratio < min_unique_ratio:
            return True, "Low quality text: High word repetition detected."

    return False, ""


def detect_spam(text: str) -> Tuple[bool, str]:
   
    # Prompt Injection Check (pre-compiled regex)
    for compiled_regex in PROMPT_INJECTION_COMPILED:
        if compiled_regex.search(text):
            return True, "Spam / Security Risk: Potential prompt injection or system override text detected."

    # Excessive Link / URL Spam Check (pre-compiled regex)
    urls = URL_REGEX.findall(text)
    words = text.split()
    max_url_ratio = getattr(settings, "MAX_URL_DENSITY_RATIO", 0.30)
    if len(urls) > 10 and (len(urls) / max(1, len(words))) > max_url_ratio:
        return True, "Spam detected: Excessive hyperlink density."

    # Repeated Consecutive Line Spam Check
    max_repeated = getattr(settings, "MAX_REPEATED_LINES", 6)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if len(lines) > max_repeated:
        repeat_count = 1
        for i in range(1, len(lines)):
            if lines[i] == lines[i - 1]:
                repeat_count += 1
                if repeat_count >= max_repeated:
                    return True, "Spam detected: Excessive repetitive line patterns."
            else:
                repeat_count = 1

    return False, ""


def compute_content_hash(text: str) -> str:
   
    normalized = WHITESPACE_REGEX.sub(" ", text.strip().lower())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def detect_duplicate_content(
    db: Session,
    workspace_id: str,
    content_hash: str
) -> Tuple[bool, str]:
   
    duplicate = (
        db.query(BrainEntry.id, BrainEntry.title)
        .filter(
            BrainEntry.workspace_id == workspace_id,
            BrainEntry.content_hash == content_hash
        )
        .first()
    )

    if duplicate:
        doc_name = duplicate.title or str(duplicate.id)
        return True, f"Duplicate content detected: Document matches existing entry '{doc_name}'."

    return False, ""


def validate_ingestion_text(
    db: Session,
    workspace_id: str,
    text: str,
    check_duplicate: bool = True
) -> str:
    
    # Binary Check
    is_binary, err = detect_binary_data(text)
    if is_binary:
        logger.warning(f"[Ingestion Validation Failed] Binary data: {err}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    # Quality Check
    is_low_quality, err = detect_low_quality(text)
    if is_low_quality:
        logger.warning(f"[Ingestion Validation Failed] Low quality: {err}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    # Spam Check
    is_spam, err = detect_spam(text)
    if is_spam:
        logger.warning(f"[Ingestion Validation Failed] Spam: {err}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    # Compute content hash ONCE for reuse in duplicate check and database saving
    content_hash = compute_content_hash(text)

    # High Performance O(1) Duplicate Check
    if check_duplicate:
        is_duplicate, err = detect_duplicate_content(db, workspace_id, content_hash)
        if is_duplicate:
            logger.warning(f"[Ingestion Validation Failed] Duplicate: {err}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    return content_hash
