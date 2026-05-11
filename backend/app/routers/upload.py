import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from app.schemas.upload import UploadResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.media import MediaFile
from app.models.workspace import WorkspaceMember
from app.routers.auth import get_current_user, CurrentUser
from app.services.storage.service import get_storage
from app.core.security import verify_workspace_access

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_TYPES = {
    "image": ["image/jpeg", "image/png", "image/jpg"],
    "video": ["video/mp4"],
    "document": ["application/pdf"]
}

# Magic-byte signatures for every permitted MIME type.
# No external dependencies — pure stdlib. Each entry maps a MIME type to a list
# of (offset, prefix) pairs; any matching pair is enough to accept the file.
_MAGIC_SIGNATURES: dict[str, list[tuple[int, bytes]]] = {
    "image/jpeg": [(0, b"\xff\xd8\xff")],
    "image/png":  [(0, b"\x89PNG\r\n\x1a\n")],
    "video/mp4":  [(4, b"ftyp"), (4, b"free"), (4, b"mdat"), (4, b"moov")],
    "application/pdf": [(0, b"%PDF")],
}


def _detect_mime_from_bytes(data: bytes) -> Optional[str]:
    """Detect MIME type from the first bytes of the file.

    Zero external dependencies — uses the built-in signature table only.
    Covers every file type currently in ALLOWED_TYPES.
    """
    for mime, sigs in _MAGIC_SIGNATURES.items():
        for offset, prefix in sigs:
            if data[offset: offset + len(prefix)] == prefix:
                return mime
    return None


def _validate_mime(file_content: bytes) -> str:
    """Raise 400 if the file's real MIME type is not in the allow-list.

    Returns the validated MIME type string detected from the file bytes —
    ignores the client-supplied Content-Type header entirely.
    """
    real_mime = _detect_mime_from_bytes(file_content)

    if real_mime is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type could not be determined. Only JPG, PNG, MP4, and PDF are allowed.",
        )

    allowed_flat = [m for mimes in ALLOWED_TYPES.values() for m in mimes]
    if real_mime not in allowed_flat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Detected file type '{real_mime}' is not allowed. "
                "Allowed types: JPG, PNG, MP4, PDF."
            ),
        )

    return real_mime


def get_file_type(mime_type: str) -> Optional[str]:
    for file_type, mime_types in ALLOWED_TYPES.items():
        if mime_type in mime_types:
            return file_type
    return None





@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 10MB."
        )

    # Validate using actual file bytes — the client-supplied Content-Type header
    # is ignored entirely to prevent MIME spoofing attacks.
    real_mime = _validate_mime(file_content)
    file_type = get_file_type(real_mime)

    workspace_id = verify_workspace_access(current_user, db)

    file_extension = Path(file.filename).suffix.lower() if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    relative_path = f"{workspace_id}/{file_type}/{unique_filename}"

    storage = get_storage()
    try:
        public_url = await storage.save_file(relative_path, file_content, real_mime)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(exc)}"
        )

    db_file = MediaFile(
        workspace_id=workspace_id,
        file_path=relative_path,
        file_type=file_type,
        original_filename=file.filename,
        file_size=len(file_content),
        mime_type=real_mime
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return UploadResponse(
        id=str(db_file.id),
        url=public_url,
        file_type=file_type,
        filename=file.filename
    )