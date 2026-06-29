import asyncio
from app.core.logger import logger
from anthropic import AsyncAnthropic
from groq import Groq
from openai import AsyncOpenAI
from google import genai
from google.genai import types as genai_types
from app.database import SessionLocal
from app.services.model_config_service import ModelConfigService
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
        from app.services.config_service import config_service
        key = config_service.get(db_key)
        if key and isinstance(key, str) and key.strip():
            return key
        raise Exception(f"{db_key} is not set in ConfigService")

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

    async def generate(self, prompt: str, model: str = "auto", media_data: bytes = None, mime_type: str = None):
        try:
            resolved_model_name = MODEL_MAP.get(model, model)
            print(f"Requested model: {resolved_model_name}")

            if resolved_model_name != "auto":
                try:
                    config = self._get_config(resolved_model_name)
                    provider = config["provider"]
                    from app.services.config_service import config_service
                    if provider == "claude":
                        if not config_service.get("anthropic_api_key"):
                            raise Exception("Claude key missing")
                        return await self._claude_call(prompt, config)

                    elif provider == "openai":
                        if not config_service.get("openai_api_key"):
                            raise Exception("OpenAI key missing")
                        return await self._openai_call(prompt, config, media_data, mime_type)

                    elif provider == "gemini":
                        if not config_service.get("google_api_key"):
                            raise Exception("Gemini key missing")
                        return await self._gemini_call(prompt, config, media_data, mime_type)

                    elif provider == "groq":
                        if not config_service.get("groq_api_key"):
                            raise Exception("Groq key missing")
                        return await self._groq_call(prompt, config)

                except Exception as e:
                    logger.warning(f"{resolved_model_name} not available → fallback AUTO: {e}")

            # Fallbacks for 'auto' or when specific provider fails
            from app.services.config_service import config_service
            try:
                if config_service.get("anthropic_api_key"):
                    logger.info("AUTO → Claude Sonnet")
                    config = self._get_config("sonnet")
                    return await self._claude_call(prompt, config)
            except Exception as e:
                logger.warning(f"Claude fallback failed: {e}")

            try:
                if config_service.get("openai_api_key"):
                    logger.info("AUTO → OpenAI gpt-4o-mini")
                    config = self._get_config("gpt-4o-mini")
                    return await self._openai_call(prompt, config, media_data, mime_type)
            except Exception as e:
                logger.warning(f"OpenAI fallback failed: {e}")

            try:
                if config_service.get("google_api_key"):
                    logger.info("AUTO → Gemini")
                    config = self._get_config("gemini")
                    return await self._gemini_call(prompt, config, media_data, mime_type)
            except Exception as e:
                logger.warning(f"Gemini fallback failed: {e}")

            logger.info("AUTO -> Groq fallback")
            config = self._get_config("groq")
            return await self._groq_call(prompt, config)

        except Exception as e:
            logger.exception("AI Generation failed: %s", e)
            from app.core.exceptions import AIProviderError, get_ai_provider_error_details
            safe_msg, status_code = get_ai_provider_error_details(e, operation="general")
            raise AIProviderError(safe_msg, status_code=status_code)
            
    async def _gemini_call(self, prompt, config, media_data=None, mime_type=None):
        try:
            api_key_env = config.get("api_key_env", "GOOGLE_API_KEY")
            if api_key_env == "GEMINI_API_KEY":
                api_key_env = "GOOGLE_API_KEY"
            api_key = self._get_api_key(api_key_env, "gemini_api_key")

            client = genai.Client(api_key=api_key)

            contents = [prompt]
            if media_data and mime_type:
                contents.append(
                    genai_types.Part.from_bytes(data=media_data, mime_type=mime_type)
                )

            generation_config = genai_types.GenerateContentConfig(
                temperature=config["temperature"],
                max_output_tokens=config["max_tokens"],
            )

            response = await asyncio.to_thread(
                client.models.generate_content,
                model=config["model"],
                contents=contents,
                config=generation_config,
            )

            text = response.text or ""
            usage = getattr(response, "usage_metadata", None)

            if usage:
                input_tokens = getattr(usage, "prompt_token_count", 0) or 0
                output_tokens = getattr(usage, "candidates_token_count", 0) or 0
                total_tokens = getattr(usage, "total_token_count", 0) or 0
            else:
                # Provider returned no usage_metadata — signal missing usage.
                # extract_usage() will detect total_tokens=0 and refuse to bill.
                # Never estimate token counts for billing purposes.
                input_tokens = 0
                output_tokens = 0
                total_tokens = 0

            logger.info(f"Gemini usage metadata: {usage}")

            return {
                "text": text,
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens
                },
                "provider": "gemini",
                "model": config["model"],
                "finish_reason": None,
                "metadata": {}
            }

        except Exception as e:
            raise Exception(f"Gemini error: {e}")

    async def _openai_call(self, prompt, config, media_data=None, mime_type=None):
        try:
            api_key_env = config.get("api_key_env", "OPENAI_API_KEY")
            api_key = self._get_api_key(api_key_env, "openai_api_key")
            client = AsyncOpenAI(api_key=api_key)

            messages = []
            if media_data and mime_type:
                import base64
                base64_image = base64.b64encode(media_data).decode("utf-8")
                image_url = f"data:{mime_type};base64,{base64_image}"
                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        }
                    ]
                })
            else:
                messages.append({"role": "user", "content": prompt})

            response = await client.chat.completions.create(
                model=config["model"],
                temperature=config["temperature"],
                max_tokens=config["max_tokens"],
                messages=messages
            )

            text = response.choices[0].message.content or ""
            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0
            total_tokens = usage.total_tokens if usage else 0
            finish_reason = response.choices[0].finish_reason if response.choices else None

            return {
                "text": text,
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens
                },
                "provider": "openai",
                "model": config["model"],
                "finish_reason": finish_reason,
                "metadata": {}
            }
        except Exception as e:
            raise Exception(f"OpenAI error: {e}")

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
                "text": text,
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens
                },
                "provider": "claude",
                "model": config["model"],
                "finish_reason": getattr(response, "stop_reason", None),
                "metadata": {}
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

            content = response.choices[0].message.content or ""

            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0
            total_tokens = usage.total_tokens if usage else 0
            finish_reason = response.choices[0].finish_reason if response.choices else None

            return {
                "text": content,
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens
                },
                "provider": "groq",
                "model": config["model"],
                "finish_reason": finish_reason,
                "metadata": {}
            }

        except Exception as e:
            raise Exception(f"Groq error: {e}")

    def resolve_provider_for_model(self, model: str) -> str:
        resolved_model_name = MODEL_MAP.get(model, model)
        if resolved_model_name != "auto":
            try:
                config = self._get_config(resolved_model_name)
                provider = config["provider"]
                if provider == "claude":
                    api_key = self._get_api_key("ANTHROPIC_API_KEY", "anthropic_api_key")
                    if api_key and api_key.strip():
                        return "claude"
                elif provider == "openai":
                    api_key = self._get_api_key("OPENAI_API_KEY", "openai_api_key")
                    if api_key and api_key.strip():
                        return "openai"
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
            api_key = self._get_api_key("OPENAI_API_KEY", "openai_api_key")
            if api_key and api_key.strip():
                return "openai"
        except Exception:
            pass

        try:
            api_key = self._get_api_key("GOOGLE_API_KEY", "gemini_api_key")
            if api_key and api_key.strip():
                return "gemini"
        except Exception:
            pass

        return "groq"