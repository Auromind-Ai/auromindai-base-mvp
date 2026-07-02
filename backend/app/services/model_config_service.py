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

# In-memory config cache
_CONFIG_CACHE: Dict[str, Dict[str, Any]] = {}


def _normalize_api_key_env(api_key_env: str | None) -> str | None:
    if api_key_env == "GEMINI_API_KEY":
        return "GOOGLE_API_KEY"
    return api_key_env


class ModelConfigService:
    
    def __init__(self, db_session: Session):
        self.db = db_session

    @classmethod
    def clear_cache(cls):
        """Clears the resolved config cache."""
        _CONFIG_CACHE.clear()
        
    def get_config_for_feature(self, feature_key: str, experience_level: str = "auto") -> Dict[str, Any]:
        """
        Looks up routing configuration explicitly by feature_key and experience_level.
        Checks the in-memory cache first to avoid DB queries.
        """
        cache_key = f"{feature_key}:{experience_level}"
        if cache_key in _CONFIG_CACHE:
            return _CONFIG_CACHE[cache_key]

        config = self.db.query(ModelConfig).filter(
            ModelConfig.feature_key == feature_key,
            ModelConfig.experience_level == experience_level,
            ModelConfig.is_active == True
        ).first()
        
        if not config:
            raise ValueError(
                f"No active configuration found for feature '{feature_key}' "
                f"and experience level '{experience_level}'"
            )
            
        config_dict = config.to_dict()
        _CONFIG_CACHE[cache_key] = config_dict
        return config_dict
    
    def get_all_configs(self, active_only: bool = False) -> List[Dict[str, Any]]:
        query = self.db.query(ModelConfig)
        if active_only:
            query = query.filter(ModelConfig.is_active == True)
        configs = query.order_by(ModelConfig.feature_key, ModelConfig.experience_level).all()
        return [config.to_dict() for config in configs]
    
    def get_config_by_id(self, config_id: int) -> Optional[Dict[str, Any]]:
        config = self.db.query(ModelConfig).filter(ModelConfig.id == config_id).first()
        return config.to_dict() if config else None
    
    def get_config_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        config = self.db.query(ModelConfig).filter(ModelConfig.name == name).first()
        return config.to_dict() if config else None
    
    def _validate_fallback(
        self,
        primary_provider: str,
        primary_model: str,
        fallback_enabled: bool,
        fallback_provider: Optional[str],
        fallback_model: Optional[str]
    ):
        if fallback_enabled:
            if not fallback_provider or not fallback_model:
                raise ValueError("fallback_provider and fallback_model must be provided if fallback_enabled is True")
            if primary_provider == fallback_provider and primary_model == fallback_model:
                raise ValueError("Fallback provider/model cannot be identical to primary provider/model")

    def create_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # Validate required fields
            required_fields = ['name', 'display_name', 'provider', 'model', 'feature_key', 'experience_level']
            for field in required_fields:
                if field not in config_data:
                    raise ValueError(f"Missing required field: {field}")

            # VALIDATE api_key_env
            api_key_env = _normalize_api_key_env(config_data.get("api_key_env"))
            if api_key_env and api_key_env not in ALLOWED_ENV_KEYS:
                raise ValueError("Invalid api_key_env")

            # VALIDATE fallback
            fallback_enabled = config_data.get('fallback_enabled', False)
            fallback_provider = config_data.get('fallback_provider')
            fallback_model = config_data.get('fallback_model')
            self._validate_fallback(
                config_data['provider'],
                config_data['model'],
                fallback_enabled,
                fallback_provider,
                fallback_model
            )

            # CREATE CONFIG
            new_config = ModelConfig(
                name=config_data['name'],
                feature_key=config_data['feature_key'],
                experience_level=config_data['experience_level'],
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
                api_key_env=api_key_env or "GROQ_API_KEY",
                fallback_enabled=fallback_enabled,
                fallback_provider=fallback_provider,
                fallback_model=fallback_model
            )

            self.db.add(new_config)
            self.db.commit()
            self.db.refresh(new_config)

            self.clear_cache()
            return new_config.to_dict()

        except IntegrityError:
            self.db.rollback()
            raise ValueError(f"Configuration for key '{config_data.get('feature_key')}' and level '{config_data.get('experience_level')}' already exists")
        except Exception as e:
            self.db.rollback()
            raise e
    
    def update_config(self, config_id: int, config_data: Dict[str, Any]) -> Dict[str, Any]:
        config = self.db.query(ModelConfig).filter(ModelConfig.id == config_id).first()
        if not config:
            raise ValueError(f"Configuration with ID {config_id} not found")

        try:
            # Merged validation for fallback fields
            merged_provider = config_data.get('provider', config.provider)
            merged_model = config_data.get('model', config.model)
            merged_fallback_enabled = config_data.get('fallback_enabled', config.fallback_enabled)
            merged_fallback_provider = config_data.get('fallback_provider', config.fallback_provider)
            merged_fallback_model = config_data.get('fallback_model', config.fallback_model)
            
            self._validate_fallback(
                merged_provider,
                merged_model,
                merged_fallback_enabled,
                merged_fallback_provider,
                merged_fallback_model
            )

            # VALIDATE api_key_env
            if "api_key_env" in config_data:
                env_key = _normalize_api_key_env(config_data["api_key_env"])
                if env_key and env_key not in ALLOWED_ENV_KEYS:
                    raise ValueError("Invalid api_key_env")
                config_data["api_key_env"] = env_key

            # Update fields
            updatable_fields = [
                'name', 'feature_key', 'experience_level', 'display_name',
                'provider', 'model', 'temperature', 'max_tokens', 'top_p',
                'frequency_penalty', 'presence_penalty', 'is_active',
                'description', 'api_key_env', 'fallback_enabled',
                'fallback_provider', 'fallback_model'
            ]

            for field in updatable_fields:
                if field in config_data:
                    setattr(config, field, config_data[field])

            self.db.commit()
            self.db.refresh(config)

            self.clear_cache()
            return config.to_dict()

        except Exception as e:
            self.db.rollback()
            raise e
    
    def delete_config(self, config_id: int) -> bool:
        config = self.db.query(ModelConfig).filter(ModelConfig.id == config_id).first()
        if not config:
            raise ValueError(f"Configuration with ID {config_id} not found")
        
        try:
            self.db.delete(config)
            self.db.commit()
            self.clear_cache()
            return True
        except Exception as e:
            self.db.rollback()
            raise e
    
    def toggle_active_status(self, config_id: int) -> Dict[str, Any]:
        config = self.db.query(ModelConfig).filter(ModelConfig.id == config_id).first()
        if not config:
            raise ValueError(f"Configuration with ID {config_id} not found")
        
        try:
            config.is_active = not config.is_active
            self.db.commit()
            self.db.refresh(config)
            self.clear_cache()
            return config.to_dict()
        except Exception as e:
            self.db.rollback()
            raise e
    
    def seed_default_configs(self):
        default_configs = [
            {
                'name': 'chat:auto',
                'feature_key': 'chat',
                'experience_level': 'auto',
                'display_name': 'Claude 3.5 Sonnet (Auto)',
                'provider': 'claude',
                'model': 'claude-3-5-sonnet-20241022',
                'temperature': 0.7,
                'max_tokens': 4096,
                'description': 'Default auto experience for chat',
                'api_key_env': 'ANTHROPIC_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'gemini',
                'fallback_model': 'gemini-1.5-flash'
            },
            {
                'name': 'chat:fast',
                'feature_key': 'chat',
                'experience_level': 'fast',
                'display_name': 'Groq Llama 3.3 (Fast)',
                'provider': 'groq',
                'model': 'llama-3.3-70b-versatile',
                'temperature': 0.2,
                'max_tokens': 1024,
                'description': 'Fast experience for chat using Groq',
                'api_key_env': 'GROQ_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'gemini',
                'fallback_model': 'gemini-1.5-flash'
            },
            {
                'name': 'chat:smart',
                'feature_key': 'chat',
                'experience_level': 'smart',
                'display_name': 'Claude 3.5 Sonnet (Smart)',
                'provider': 'claude',
                'model': 'claude-3-5-sonnet-20241022',
                'temperature': 0.7,
                'max_tokens': 4096,
                'description': 'Balanced smart experience for chat',
                'api_key_env': 'ANTHROPIC_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'gemini',
                'fallback_model': 'gemini-1.5-flash'
            },
            {
                'name': 'chat:deep',
                'feature_key': 'chat',
                'experience_level': 'deep',
                'display_name': 'Claude 3 Opus (Deep)',
                'provider': 'claude',
                'model': 'claude-3-opus-20240229',
                'temperature': 0.5,
                'max_tokens': 4096,
                'description': 'Deep reasoning experience for chat',
                'api_key_env': 'ANTHROPIC_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'gemini',
                'fallback_model': 'gemini-1.5-flash'
            },
            {
                'name': 'chat:flash',
                'feature_key': 'chat',
                'experience_level': 'flash',
                'display_name': 'Gemini Flash (Flash)',
                'provider': 'gemini',
                'model': 'gemini-1.5-flash',
                'temperature': 0.7,
                'max_tokens': 2048,
                'description': 'Flash experience for chat using Google',
                'api_key_env': 'GOOGLE_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'groq',
                'fallback_model': 'llama-3.3-70b-versatile'
            },
            {
                'name': 'inbox:auto',
                'feature_key': 'inbox',
                'experience_level': 'auto',
                'display_name': 'Inbox Agent Llama 3.3',
                'provider': 'groq',
                'model': 'llama-3.3-70b-versatile',
                'temperature': 0.2,
                'max_tokens': 1024,
                'description': 'Inbox agent message handler',
                'api_key_env': 'GROQ_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'gemini',
                'fallback_model': 'gemini-1.5-flash'
            },
            {
                'name': 'flow:auto',
                'feature_key': 'flow',
                'experience_level': 'auto',
                'display_name': 'Flow Gen Gemini Flash',
                'provider': 'gemini',
                'model': 'gemini-1.5-flash',
                'temperature': 0.15,
                'max_tokens': 2048,
                'description': 'Flow generation model',
                'api_key_env': 'GOOGLE_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'groq',
                'fallback_model': 'llama-3.3-70b-versatile'
            },
            {
                'name': 'template:auto',
                'feature_key': 'template',
                'experience_level': 'auto',
                'display_name': 'Template Draft Claude Sonnet',
                'provider': 'claude',
                'model': 'claude-3-5-sonnet-20241022',
                'temperature': 0.7,
                'max_tokens': 2048,
                'description': 'Gmail response draft generator',
                'api_key_env': 'ANTHROPIC_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'gemini',
                'fallback_model': 'gemini-1.5-flash'
            },
            {
                'name': 'rag:auto',
                'feature_key': 'rag',
                'experience_level': 'auto',
                'display_name': 'RAG Query Gemini Flash',
                'provider': 'gemini',
                'model': 'gemini-1.5-flash',
                'temperature': 0.3,
                'max_tokens': 2048,
                'description': 'Agentic RAG queries model',
                'api_key_env': 'GOOGLE_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'groq',
                'fallback_model': 'llama-3.3-70b-versatile'
            },
            {
                'name': 'knowledge:auto',
                'feature_key': 'knowledge',
                'experience_level': 'auto',
                'display_name': 'Knowledge Processor Gemini Flash',
                'provider': 'gemini',
                'model': 'gemini-1.5-flash',
                'temperature': 0.1,
                'max_tokens': 2048,
                'description': 'Knowledge base processing and indexing model',
                'api_key_env': 'GOOGLE_API_KEY',
                'fallback_enabled': True,
                'fallback_provider': 'groq',
                'fallback_model': 'llama-3.3-70b-versatile'
            }
        ]
        
        for config_data in default_configs:
            existing = self.db.query(ModelConfig).filter(
                ModelConfig.feature_key == config_data['feature_key'],
                ModelConfig.experience_level == config_data['experience_level']
            ).first()
            
            if not existing:
                try:
                    self.create_config(config_data)
                except Exception as e:
                    print(f"Error seeding config {config_data['feature_key']}:{config_data['experience_level']}: {e}")
            else:
                # Update fallback fields if they are not configured yet
                if not existing.fallback_provider:
                    try:
                        self.update_config(existing.id, {
                            'fallback_enabled': config_data.get('fallback_enabled', False),
                            'fallback_provider': config_data.get('fallback_provider'),
                            'fallback_model': config_data.get('fallback_model')
                        })
                    except Exception as e:
                        print(f"Error updating seeded fallback config {existing.feature_key}:{existing.experience_level}: {e}")