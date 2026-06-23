from pydantic import BaseModel

class UploadResponse(BaseModel):
    id: str
    url: str
    file_type: str
    filename: str
