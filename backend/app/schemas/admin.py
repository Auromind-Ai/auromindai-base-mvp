from pydantic import BaseModel, Field
from typing import Optional, List

class ModelConfigCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=200)
    provider: str = Field(..., min_length=1, max_length=50)
    model: str = Field(..., min_length=1, max_length=200)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=800, gt=0, le=100000)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    is_active: bool = True
    description: Optional[str] = None
    api_key_env: Optional[str] = None

class ModelConfigUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=200)
    provider: Optional[str] = Field(None, min_length=1, max_length=50)
    model: Optional[str] = Field(None, min_length=1, max_length=200)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, gt=0, le=100000)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0)
    presence_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0)
    is_active: Optional[bool] = None
    description: Optional[str] = None
    api_key_env: Optional[str] = None
