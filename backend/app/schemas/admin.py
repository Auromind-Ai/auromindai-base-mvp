from pydantic import BaseModel, Field, model_validator
from typing import Optional

class ModelConfigCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    feature_key: str = Field(..., min_length=1, max_length=100)
    experience_level: str = Field(..., min_length=1, max_length=50)
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
    fallback_enabled: bool = False
    fallback_provider: Optional[str] = Field(None, max_length=50)
    fallback_model: Optional[str] = Field(None, max_length=200)

    @model_validator(mode="after")
    def validate_fallback_config(self) -> "ModelConfigCreate":
        fallback_enabled = self.fallback_enabled
        fallback_provider = self.fallback_provider
        fallback_model = self.fallback_model
        provider = self.provider
        model = self.model

        if fallback_enabled:
            if not fallback_provider or not fallback_model:
                raise ValueError("fallback_provider and fallback_model must be provided if fallback_enabled is True")
            if provider == fallback_provider and model == fallback_model:
                raise ValueError("Fallback provider/model cannot be identical to primary provider/model")
        return self

class ModelConfigUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    feature_key: Optional[str] = Field(None, min_length=1, max_length=100)
    experience_level: Optional[str] = Field(None, min_length=1, max_length=50)
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
    fallback_enabled: Optional[bool] = None
    fallback_provider: Optional[str] = Field(None, max_length=50)
    fallback_model: Optional[str] = Field(None, max_length=200)

    @model_validator(mode="after")
    def validate_fallback_config(self) -> "ModelConfigUpdate":
        fallback_enabled = self.fallback_enabled
        fallback_provider = self.fallback_provider
        fallback_model = self.fallback_model
        provider = self.provider
        model = self.model

        if fallback_enabled is True:
            if 'fallback_provider' in self.model_fields_set and not fallback_provider:
                raise ValueError("fallback_provider cannot be empty if fallback_enabled is True")
            if 'fallback_model' in self.model_fields_set and not fallback_model:
                raise ValueError("fallback_model cannot be empty if fallback_enabled is True")
            
        if provider and fallback_provider and model and fallback_model:
            if provider == fallback_provider and model == fallback_model:
                raise ValueError("Fallback provider/model cannot be identical to primary provider/model")
        return self


class AdminAuthRequest(BaseModel):
    password: str
