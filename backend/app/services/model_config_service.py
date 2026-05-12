

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.model_configs import ModelConfig
ALLOWED_ENV_KEYS = [
    "GROQ_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "OPENAI_API_KEY"
]


def _normalize_api_key_env(api_key_env: str | None) -> str | None:
    if api_key_env == "GEMINI_API_KEY":
        return "GOOGLE_API_KEY"
    return api_key_env


class ModelConfigService:
    """Service for managing model configurations"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
   
    def get_all_configs(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """Get all model configurations"""
        query = self.db.query(ModelConfig)
        if active_only:
            query = query.filter(ModelConfig.is_active == True)
        configs = query.order_by(ModelConfig.name).all()
        return [config.to_dict() for config in configs]
    
    def get_config_by_id(self, config_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific model configuration by ID"""
        config = self.db.query(ModelConfig).filter(ModelConfig.id == config_id).first()
        return config.to_dict() if config else None
    
    def get_config_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific model configuration by name"""
        config = self.db.query(ModelConfig).filter(ModelConfig.name == name).first()
        return config.to_dict() if config else None
    
    def create_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new model configuration"""
        try:
            # Validate required fields
            required_fields = ['name', 'display_name', 'provider', 'model']
            for field in required_fields:
                if field not in config_data:
                    raise ValueError(f"Missing required field: {field}")

            #  VALIDATE api_key_env
            api_key_env = _normalize_api_key_env(config_data.get("api_key_env"))

            if api_key_env and api_key_env not in ALLOWED_ENV_KEYS:
                raise ValueError("Invalid api_key_env")

            #  CREATE CONFIG
            new_config = ModelConfig(
                name=config_data['name'],
                display_name=config_data['display_name'],
                provider=config_data['provider'],
                model=config_data['model'],
                temperature=config_data.get('temperature', 0.7),
                max_tokens=config_data.get('max_tokens', 800),
                top_p=config_data.get('top_p', 1.0),
                frequency_penalty=config_data.get('frequency_penalty', 0.0),
                presence_penalty=config_data.get('presence_penalty', 0.0),
                is_active=config_data.get('is_active', True),
                description=config_data.get('description'),
                api_key_env=api_key_env or "GROQ_API_KEY"   #
            )

            self.db.add(new_config)
            self.db.commit()
            self.db.refresh(new_config)

            return new_config.to_dict()

        except IntegrityError:
            self.db.rollback()
            raise ValueError(f"Configuration with name '{config_data.get('name')}' already exists")
        except Exception as e:
            self.db.rollback()
            raise e
    
    def update_config(self, config_id: int, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing model configuration"""
        config = self.db.query(ModelConfig).filter(ModelConfig.id == config_id).first()

        if not config:
            raise ValueError(f"Configuration with ID {config_id} not found")

        try:
            #  VALIDATE api_key_env
            if "api_key_env" in config_data:
                env_key = _normalize_api_key_env(config_data["api_key_env"])
                if env_key and env_key not in ALLOWED_ENV_KEYS:
                    raise ValueError("Invalid api_key_env")
                config_data["api_key_env"] = env_key

            # Update fields
            updatable_fields = [
                'display_name', 'provider', 'model', 'temperature',
                'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty',
                'is_active', 'description', 'api_key_env'
            ]

            for field in updatable_fields:
                if field in config_data:
                    setattr(config, field, config_data[field])

            self.db.commit()
            self.db.refresh(config)

            return config.to_dict()

        except Exception as e:
            self.db.rollback()
            raise e
    
    def delete_config(self, config_id: int) -> bool:
        """Delete a model configuration"""
        config = self.db.query(ModelConfig).filter(ModelConfig.id == config_id).first()
        
        if not config:
            raise ValueError(f"Configuration with ID {config_id} not found")
        
        try:
            self.db.delete(config)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise e
    
    def toggle_active_status(self, config_id: int) -> Dict[str, Any]:
        """Toggle the active status of a model configuration"""
        config = self.db.query(ModelConfig).filter(ModelConfig.id == config_id).first()
        
        if not config:
            raise ValueError(f"Configuration with ID {config_id} not found")
        
        try:
            config.is_active = not config.is_active
            self.db.commit()
            self.db.refresh(config)
            
            return config.to_dict()
        except Exception as e:
            self.db.rollback()
            raise e
    
    def seed_default_configs(self):
        """Seed database with default model configurations"""
        default_configs = [
            {
                'name': 'sonnet',
                'display_name': 'Claude 3 Sonnet',
                'provider': 'claude',
                'model': 'claude-3-sonnet-20240229',
                'temperature': 0.7,
                'max_tokens': 800,
                'description': 'Balanced model for most tasks',
                'api_key_env': 'ANTHROPIC_API_KEY'
            },
            {
                'name': 'opus',
                'display_name': 'Claude 3 Opus',
                'provider': 'claude',
                'model': 'claude-3-opus-20240229',
                'temperature': 0.6,
                'max_tokens': 1200,
                'description': 'Most capable model for complex tasks',
                'api_key_env': 'ANTHROPIC_API_KEY'
            },
            {
                'name': 'groq',
                'display_name': 'Groq Llama 3.1',
                'provider': 'groq',
                'model': 'llama-3.1-8b-instant',
                'temperature': 0.8,
                'max_tokens': 500,
                'description': 'Fast inference with Groq',
                'api_key_env': 'GROQ_API_KEY'
            },
            {
                'name': 'gemini_flash',
                'display_name': 'Gemini 1.5 Flash',
                'provider': 'gemini',
                'model': 'gemini-1.5-flash',
                'temperature': 0.7,
                'max_tokens': 600,
                'description': 'Fast and efficient Google model',
                'api_key_env': 'GOOGLE_API_KEY'
            }
        ]
        
        for config_data in default_configs:
            existing = self.db.query(ModelConfig).filter(
                ModelConfig.name == config_data['name']
            ).first()
            
            if not existing:
                try:
                    self.create_config(config_data)
                except Exception as e:
                    print(f"Error seeding config {config_data['name']}: {e}")
