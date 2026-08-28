import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from app.schemas.upload import UploadResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.media import MediaFile
from app.routers.auth import get_current_user, CurrentUser
from app.services.storage.service import get_storage
from app.core.security import verify_workspace_access

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_TYPES = {
    "image": ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"],
    "video": ["video/mp4", "video/webm", "video/quicktime"],
    "audio": ["audio/mpeg", "audio/ogg", "audio/wav", "audio/mp4", "audio/aac", "audio/x-m4a"],
    "document": ["application/pdf"]
}


_MAGIC_SIGNATURES: dict[str, list[tuple[int, bytes]]] = {
    "image/jpeg": [(0, b"\xff\xd8\xff")],
    "image/png":  [(0, b"\x89PNG\r\n\x1a\n")],
    "image/webp": [(0, b"RIFF")],
    "image/gif":  [(0, b"GIF87a"), (0, b"GIF89a")],
    "video/mp4":  [(4, b"ftyp"), (4, b"free"), (4, b"mdat"), (4, b"moov")],
    "video/webm": [(0, b"\x1a\x45\xdf\xa3")],
    "video/quicktime": [(4, b"moov"), (4, b"mdat"), (4, b"wide"), (4, b"ftypqt  ")],
    "audio/mpeg": [(0, b"\xff\xfb"), (0, b"\xff\xf3"), (0, b"\xff\xf2"), (0, b"ID3")],
    "audio/ogg":  [(0, b"OggS")],
    "audio/wav":  [(0, b"RIFF")],
    "application/pdf": [(0, b"%PDF")],
}


def _detect_mime_from_bytes(data: bytes) -> Optional[str]:
   
    for mime, sigs in _MAGIC_SIGNATURES.items():
        for offset, prefix in sigs:
            if len(data) >= offset + len(prefix) and data[offset: offset + len(prefix)] == prefix:
                return mime
    return None


def _validate_mime(file_content: bytes, header_mime: Optional[str] = None) -> str:
    
    real_mime = _detect_mime_from_bytes(file_content)

    if real_mime is None and header_mime:
        cleaned_header = header_mime.split(";")[0].strip().lower()
        allowed_flat = [m for mimes in ALLOWED_TYPES.values() for m in mimes]
        if cleaned_header in allowed_flat:
            real_mime = cleaned_header

    if real_mime is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type could not be determined. Allowed formats: Images (JPG, PNG, WebP, GIF), Videos (MP4, WebM, MOV), Audio (MP3, WAV, OGG), and PDF.",
        )

    allowed_flat = [m for mimes in ALLOWED_TYPES.values() for m in mimes]
    if real_mime not in allowed_flat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Detected file type '{real_mime}' is not allowed.",
        )

    return real_mime


def get_file_type(mime_type: str) -> Optional[str]:
    for file_type, mime_types in ALLOWED_TYPES.items():
        if mime_type in mime_types:
            return file_type
    return None


MIME_EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/x-m4a": ".m4a",
    "application/pdf": ".pdf",
}


import os
import logging

logger = logging.getLogger(__name__)

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if not file.filename or not file.filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    clean_filename = os.path.basename(file.filename.strip())

    file_content = await file.read()
    if len(file_content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB."
        )

    real_mime = _validate_mime(file_content, file.content_type)
    file_type = get_file_type(real_mime)

    verified_workspace_id = verify_workspace_access(current_user, db, workspace_id)
    ws_uuid = uuid.UUID(verified_workspace_id) if isinstance(verified_workspace_id, str) else verified_workspace_id

    file_extension = MIME_EXTENSION_MAP.get(real_mime, "")
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    relative_path = f"{ws_uuid}/{file_type}/{unique_filename}"

    storage = get_storage()
    try:
        public_url = await storage.save_file(relative_path, file_content, real_mime)
    except Exception as exc:
        logger.error(f"File upload storage failure: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File upload storage operation failed. Please try again."
        )

    db_file = MediaFile(
        workspace_id=ws_uuid,
        file_path=relative_path,
        file_type=file_type,
        original_filename=clean_filename,
        file_size=len(file_content),
        mime_type=real_mime
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return UploadResponse(
        id=str(db_file.id),
        url=public_url,
        filename=clean_filename,
        file_size=len(file_content),
        file_type=file_type,
        mime_type=real_mime
    )