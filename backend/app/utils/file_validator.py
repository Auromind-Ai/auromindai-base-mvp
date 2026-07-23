import os
import logging
from typing import Dict, Set
from fastapi import UploadFile, HTTPException, status

logger = logging.getLogger(__name__)

# Canonical Supported File Extensions and MIME Mapping
SUPPORTED_FILE_TYPES: Dict[str, Set[str]] = {
    ".pdf": {"application/pdf"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream",
    },
    ".doc": {"application/msword", "application/octet-stream"},
    ".txt": {"text/plain", "text/x-log", "application/octet-stream"},
    ".md": {"text/markdown", "text/x-markdown", "text/plain", "application/octet-stream"},
    ".csv": {"text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"},
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/octet-stream",
    },
    ".xls": {"application/vnd.ms-excel", "application/octet-stream"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".webp": {"image/webp"},
}

ALLOWED_EXTENSIONS: Set[str] = set(SUPPORTED_FILE_TYPES.keys())


def validate_file_upload(file: UploadFile) -> str:
   
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided for upload."
        )

    filename = file.filename.strip()
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        allowed_list = ", ".join(sorted(ALLOWED_EXTENSIONS))
        logger.warning(f"[File Validation Failed] Unsupported extension '{ext}' for file '{filename}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed file types: {allowed_list}"
        )

    # Validate MIME type if content_type is provided by client
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    valid_mimes = SUPPORTED_FILE_TYPES[ext]

    if content_type and content_type != "application/octet-stream" and content_type not in valid_mimes:
        logger.warning(
            f"[File Validation Failed] MIME mismatch for file '{filename}': "
            f"extension '{ext}' expects {valid_mimes}, got '{content_type}'"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type mismatch for file extension '{ext}'. Provided MIME '{content_type}' is invalid."
        )

    return ext
