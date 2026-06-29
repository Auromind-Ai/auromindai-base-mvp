
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, UniqueConstraint
from app.database import Base

class ModelConfig(Base):
    __tablename__ = 'model_configs'
    __table_args__ = (
        UniqueConstraint('feature_key', 'experience_level', name='uq_model_configs_feature_experience'),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    feature_key = Column(String(100), nullable=True, index=True)
    experience_level = Column(String(50), nullable=True, index=True)
    display_name = Column(String(200), nullable=False)
    provider = Column(String(50), nullable=False)  
    model = Column(String(200), nullable=False)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=800)
    top_p = Column(Float, default=1.0)
    frequency_penalty = Column(Float, default=0.0)
    presence_penalty = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    api_key_env = Column(String(100), nullable=True)
    fallback_enabled = Column(Boolean, default=False, nullable=False)
    fallback_provider = Column(String(50), nullable=True)
    fallback_model = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
    
        return {
            'id': self.id,
            'name': self.name,
            'feature_key': self.feature_key,
            'experience_level': self.experience_level,
            'display_name': self.display_name,
            'provider': self.provider,
            'model': self.model,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'top_p': self.top_p,
            'frequency_penalty': self.frequency_penalty,
            'presence_penalty': self.presence_penalty,
            'is_active': self.is_active,
            'description': self.description,
            'api_key_env': self.api_key_env,
            'fallback_enabled': self.fallback_enabled,
            'fallback_provider': self.fallback_provider,
            'fallback_model': self.fallback_model,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f"<ModelConfig(name='{self.name}', provider='{self.provider}', model='{self.model}')>"