from app.core.config import settings
import asyncio
from app.core.logger import logger
from anthropic import AsyncAnthropic
from groq import Groq
import google.generativeai as genai
from app.database import SessionLocal
from app.services.model_config_service import  ModelConfigService
import time

MODEL_MAP = {
    "auto": "auto",
    "groq": "groq",
    "sonnet": "sonnet",
    "opus": "opus",
    "gemini_flash": "gemini",
        }

class LLMRouter:

    def __init__(self):
        self.timeout = 5
        self._config_cache = {}
        self._cache_time = 0
        self._cache_ttl = 10   

    
    def _get_api_key(self, env_name: str, db_key: str) -> str:
        from app.services.platform_settings_service import get_setting
        db = SessionLocal()
        try:
            key = get_setting(db, db_key)
            if key and isinstance(key, str) and key.strip():
                return key
            
            key = getattr(settings, env_name, None)
            if key and isinstance(key, str) and key.strip():
                return key
                
            raise Exception(f"{env_name} is not set in DB or .env")
        finally:
            db.close()

    def _get_config(self, model_name: str):
        current_time = time.time()  

        if (
            model_name in self._config_cache and
            current_time - self._cache_time < self._cache_ttl
        ):
            return self._config_cache[model_name]

        db = SessionLocal()
        try:
            service = ModelConfigService(db)
            config = service.get_config_by_name(model_name)

            if not config:
                raise Exception(f"Model config '{model_name}' not found")

            if not config["is_active"]:
                raise Exception(f"Model '{model_name}' is disabled")

            
            self._config_cache[model_name] = config
            self._cache_time = current_time

            return config

        finally:
            db.close()

  
    async def generate(self, prompt: str, model: str = "auto"):
        try:
            start_time = time.time()

            model = MODEL_MAP.get(model, "auto")
            print(f"Requested model: {model}")

            if model != "auto":
                try:
                    config = self._get_config(model)
                    provider = config["provider"]

                    if provider == "claude":
                        if not settings.ANTHROPIC_API_KEY:
                            raise Exception("Claude key missing")
                        return await self._claude_call(prompt, config)

                    elif provider == "gemini":
                        if not settings.GOOGLE_API_KEY:
                            raise Exception("Gemini key missing")
                        return await self._gemini_call(prompt, config)


                    elif provider == "groq":
                        if not settings.GROQ_API_KEY:
                            raise Exception("Groq key missing")
                        return await self._groq_call(prompt, config)

                except Exception as e:
                    logger.warning(f"{model} not available → fallback AUTO: {e}")

            try:
                if settings.ANTHROPIC_API_KEY:
                    logger.info("AUTO → Claude Sonnet")
                    config = self._get_config("sonnet")
                    return await self._claude_call(prompt, config)

            except Exception as e:
                logger.warning(f"Claude failed: {e}")

            try:
                if settings.GOOGLE_API_KEY:
                    logger.info("AUTO → Gemini")
                    config = self._get_config("gemini")
                    return await self._gemini_call(prompt, config)

            except Exception as e:
                logger.warning(f"Gemini failed: {e}")

            logger.info("AUTO -> Groq fallback")
            config = self._get_config("groq")
            return await self._groq_call(prompt, config)
        except Exception as e:
            logger.exception("AI Generation failed: %s", e)
            from app.core.exceptions import AIProviderError, get_ai_provider_error_details
            safe_msg, status_code = get_ai_provider_error_details(e, operation="general")
            raise AIProviderError(safe_msg, status_code=status_code)
            
    async def _gemini_call(self, prompt, config):
        try:
            api_key_env = config.get("api_key_env", "GOOGLE_API_KEY")
            if api_key_env == "GEMINI_API_KEY":
                api_key_env = "GOOGLE_API_KEY"
            api_key = self._get_api_key(api_key_env, "gemini_api_key")
            genai.configure(api_key=api_key)

            model = genai.GenerativeModel(config["model"])

            response = await asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config={
                    "temperature": config["temperature"],
                    "max_output_tokens": config["max_tokens"],
                }
            )

            text = response.text or ""

            usage = getattr(response, "usage_metadata", None)

            if usage:
                input_tokens = usage.prompt_token_count
                output_tokens = usage.candidates_token_count
                total_tokens = usage.total_token_count
            else:
                # fallback only if usage metadata unavailable
                input_tokens = len(prompt.split())
                output_tokens = len(text.split())
                total_tokens = input_tokens + output_tokens
            
            logger.info(f"Gemini usage metadata: {response.usage_metadata}")

            return {
                "content": text,
                "provider": "gemini",
                "model": config["model"],
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            }
        
        except Exception as e:
            raise Exception(f"Gemini error: {e}")

    async def _claude_call(self, prompt, config):
        try:
            api_key_env = config.get("api_key_env", "ANTHROPIC_API_KEY")
            api_key = self._get_api_key(api_key_env, "anthropic_api_key")
            client = AsyncAnthropic(api_key=api_key)

            response = await client.messages.create(
                model=config["model"],
                max_tokens=config["max_tokens"],
                temperature=config["temperature"],
                messages=[{"role": "user", "content": prompt}]
            )

            text = response.content[0].text

            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            total_tokens = input_tokens + output_tokens

            return {
                "content": text,
                "provider": "claude",
                "model": config["model"],
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            }

        except Exception as e:
            raise Exception(f"Claude error: {e}")
        
    async def _groq_call(self, prompt, config):
        try:
            api_key_env = config.get("api_key_env", "GROQ_API_KEY")
            api_key = self._get_api_key(api_key_env, "groq_api_key")
            client = Groq(api_key=api_key)

            response = await asyncio.to_thread(
                client.chat.completions.create,
                model=config["model"],
                temperature=config["temperature"],
                max_tokens=config["max_tokens"],
                messages=[{"role": "user", "content": prompt}]
            )
            

            content = response.choices[0].message.content

            usage = response.usage
            input_tokens = usage.prompt_tokens
            output_tokens = usage.completion_tokens
            total_tokens = usage.total_tokens

            return {
                "content": content,
                "provider": "groq",
                "model": config["model"],
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            }

        except Exception as e:
            raise Exception(f"Groq error: {e}")

    def resolve_provider_for_model(self, model: str) -> str:
        model = MODEL_MAP.get(model, "auto")
        if model != "auto":
            try:
                config = self._get_config(model)
                provider = config["provider"]
                if provider == "claude":
                    api_key = self._get_api_key("ANTHROPIC_API_KEY", "anthropic_api_key")
                    if api_key and api_key.strip():
                        return "claude"
                elif provider == "gemini":
                    api_key = self._get_api_key("GOOGLE_API_KEY", "gemini_api_key")
                    if api_key and api_key.strip():
                        return "gemini"
                elif provider == "groq":
                    api_key = self._get_api_key("GROQ_API_KEY", "groq_api_key")
                    if api_key and api_key.strip():
                        return "groq"
            except Exception:
                pass
        
        # Fallback logic for 'auto'
        try:
            api_key = self._get_api_key("ANTHROPIC_API_KEY", "anthropic_api_key")
            if api_key and api_key.strip():
                return "claude"
        except Exception:
            pass

        try:
            api_key = self._get_api_key("GOOGLE_API_KEY", "gemini_api_key")
            if api_key and api_key.strip():
                return "gemini"
        except Exception:
            pass

        return "groq"