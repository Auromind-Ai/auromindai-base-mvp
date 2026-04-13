import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.media import MediaFile
from app.routers.auth import get_current_user, CurrentUser
from app.services.storage import get_storage

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_TYPES = {
    "image": ["image/jpeg", "image/png", "image/jpg"],
    "video": ["video/mp4"],
    "document": ["application/pdf"]
}


class UploadResponse(BaseModel):
    id: str
    url: str
    file_type: str
    filename: str


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

    file_type = get_file_type(file.content_type or "")
    if not file_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: JPG, PNG, MP4, PDF."
        )

    workspace_id = current_user.workspace_id
    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No workspace associated with user."
        )

    file_extension = Path(file.filename).suffix.lower() if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    relative_path = f"{workspace_id}/{file_type}/{unique_filename}"

    storage = get_storage()
    try:
        public_url = await storage.save_file(relative_path, file_content, file.content_type)
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
        mime_type=file.content_type or "application/octet-stream"
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