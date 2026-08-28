from pydantic import BaseModel
from typing import Optional

class UploadResponse(BaseModel):
    id: str
    url: str
    file_type: str
    filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None

