import asyncio
from typing import Optional
from app.core.logger import logger
from anthropic import AsyncAnthropic
from groq import Groq
from openai import AsyncOpenAI
import google.generativeai as genai
from app.database import SessionLocal
from app.services.model_config_service import ModelConfigService
from app.services.config_service import config_service
from app.core.exceptions import AIProviderError
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError
import time

def is_retryable_provider_error(exc: Exception) -> bool:
    # If it is a configuration or coding or database error, it is NOT retryable.
    # Specifically check for standard programming/data exceptions.
    if isinstance(exc, ValueError):
        return False
    if isinstance(exc, (TypeError, AttributeError, NameError, KeyError, IndexError, ValidationError, SQLAlchemyError)):
        return False
    return True

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
        key = config_service.get(db_key)
        if key and isinstance(key, str) and key.strip():
            return key
        raise Exception(f"{db_key} is not set in ConfigService")

    def _get_config(self, feature_key: str, experience_level: str):
        db = SessionLocal()
        try:
            service = ModelConfigService(db)
            config = service.get_config_for_feature(feature_key, experience_level)
            return config
        finally:
            db.close()

    async def _execute_with_config(self, prompt: str, config: dict, media_data: bytes = None, mime_type: str = None, system_prompt: Optional[str] = None, structured_output: bool = False):
        provider = config["provider"]
        try:
            if provider == "claude":
                if not config.get("api_key_env"):
                    config["api_key_env"] = "ANTHROPIC_API_KEY"
                if not config_service.get("anthropic_api_key"):
                    raise Exception("Claude key missing")
                return await self._claude_call(prompt, config, system_prompt=system_prompt, structured_output=structured_output)

            elif provider == "openai":
                if not config.get("api_key_env"):
                    config["api_key_env"] = "OPENAI_API_KEY"
                if not config_service.get("openai_api_key"):
                    raise Exception("OpenAI key missing")
                return await self._openai_call(prompt, config, media_data, mime_type, system_prompt=system_prompt, structured_output=structured_output)

            elif provider == "gemini":
                if not config.get("api_key_env"):
                    config["api_key_env"] = "GOOGLE_API_KEY"
                if not config_service.get("google_api_key"):
                    raise Exception("Gemini key missing")
                return await self._gemini_call(prompt, config, media_data, mime_type, system_prompt=system_prompt, structured_output=structured_output)

            elif provider == "groq":
                if not config.get("api_key_env"):
                    config["api_key_env"] = "GROQ_API_KEY"
                if not config_service.get("groq_api_key"):
                    raise Exception("Groq key missing")
                return await self._groq_call(prompt, config, system_prompt=system_prompt, structured_output=structured_output)
            else:
                raise ValueError(f"Unknown provider '{provider}'")
        except Exception as provider_err:
            err_msg = str(provider_err).lower()
            # Catch model not found or invalid model errors from SDKs
            if "not found" in err_msg or "model" in err_msg or "invalid" in err_msg or "bad_request" in err_msg:
                raise ValueError(f"Provider API Configuration Error: Model '{config['model']}' not recognized by provider '{provider}'. Details: {provider_err}")
            raise provider_err

    async def generate(self, prompt: str, model: str = "auto", feature_key: str = "chat", media_data: bytes = None, mime_type: str = None, config: dict = None, system_prompt: Optional[str] = None, structured_output: bool = False):
        try:
            if config is None:
                experience_level = model
                if model in ["sonnet", "gemini", "groq", "opus"]:
                    mapping = {
                        "sonnet": "smart",
                        "gemini": "flash",
                        "groq": "fast",
                        "opus": "deep"
                    }
                    experience_level = mapping.get(model, "auto")
                elif model == "gemini_flash":
                    experience_level = "flash"

                logger.info(f"LLMRouter routing feature '{feature_key}' with experience '{experience_level}'")
                config = self._get_config(feature_key, experience_level)
            
            return await self._execute_with_config(prompt, config, media_data, mime_type, system_prompt=system_prompt, structured_output=structured_output)
        except Exception as e:
            raise e
            
    async def _gemini_call(self, prompt, config, media_data=None, mime_type=None, system_prompt: Optional[str] = None, structured_output: bool = False):
        try:
            api_key_env = config.get("api_key_env", "GOOGLE_API_KEY")
            if api_key_env == "GEMINI_API_KEY":
                api_key_env = "GOOGLE_API_KEY"
            api_key = self._get_api_key(api_key_env, "gemini_api_key")
            genai.configure(api_key=api_key)

            model_kwargs = {
                "model_name": config["model"]
            }
            if system_prompt:
                model_kwargs["system_instruction"] = system_prompt

            model = genai.GenerativeModel(**model_kwargs)

            contents = [prompt]
            if media_data and mime_type:
                contents.append({
                    "mime_type": mime_type,
                    "data": media_data
                })

            gen_config = {
                "temperature": config["temperature"],
                "max_output_tokens": config["max_tokens"],
            }
            if structured_output:
                gen_config["response_mime_type"] = "application/json"

            response = await asyncio.to_thread(
                model.generate_content,
                contents,
                generation_config=gen_config
            )

            text = response.text or ""
            usage = getattr(response, "usage_metadata", None)

            if usage:
                input_tokens = usage.prompt_token_count
                output_tokens = usage.candidates_token_count
                total_tokens = usage.total_token_count
            else:
                # Provider returned no usage_metadata — signal missing usage.
                # extract_usage() will detect total_tokens=0 and refuse to bill.
                # Never estimate token counts for billing purposes.
                input_tokens = 0
                output_tokens = 0
                total_tokens = 0
            
            logger.info(f"Gemini usage metadata: {response.usage_metadata}")

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

    async def _openai_call(self, prompt, config, media_data=None, mime_type=None, system_prompt: Optional[str] = None, structured_output: bool = False):
        try:
            api_key_env = config.get("api_key_env", "OPENAI_API_KEY")
            api_key = self._get_api_key(api_key_env, "openai_api_key")
            client = AsyncOpenAI(api_key=api_key)

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})

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

            create_kwargs = {
                "model": config["model"],
                "temperature": config["temperature"],
                "max_tokens": config["max_tokens"],
                "messages": messages
            }

            if structured_output:
                create_kwargs["response_format"] = {"type": "json_object"}

            response = await client.chat.completions.create(**create_kwargs)

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

    async def _claude_call(self, prompt, config, system_prompt: Optional[str] = None, structured_output: bool = False):
        try:
            api_key_env = config.get("api_key_env", "ANTHROPIC_API_KEY")
            api_key = self._get_api_key(api_key_env, "anthropic_api_key")
            client = AsyncAnthropic(api_key=api_key)

            system_str = system_prompt or ""
            if structured_output:
                system_str += (
                    "\n\nCRITICAL: Your entire response MUST be a single valid JSON object. "
                    "No markdown fences, no preamble, raw JSON only."
                )

            create_kwargs = {
                "model": config["model"],
                "max_tokens": config["max_tokens"],
                "temperature": config["temperature"],
                "messages": [{"role": "user", "content": prompt}]
            }

            if system_str:
                create_kwargs["system"] = system_str

            response = await client.messages.create(**create_kwargs)

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
        
    async def _groq_call(self, prompt, config, system_prompt: Optional[str] = None, structured_output: bool = False):
        try:
            api_key_env = config.get("api_key_env", "GROQ_API_KEY")
            api_key = self._get_api_key(api_key_env, "groq_api_key")
            client = Groq(api_key=api_key)

            if system_prompt:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ]
            else:
                messages = [{"role": "user", "content": prompt}]

            create_kwargs = {
                "model": config["model"],
                "temperature": config["temperature"],
                "max_tokens": config["max_tokens"],
                "messages": messages
            }

            if structured_output:
                create_kwargs["response_format"] = {"type": "json_object"}

            response = await asyncio.to_thread(
                client.chat.completions.create,
                **create_kwargs
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
        experience_level = model
        if model in ["sonnet", "gemini", "groq", "opus"]:
            mapping = {
                "sonnet": "smart",
                "gemini": "flash",
                "groq": "fast",
                "opus": "deep"
            }
            experience_level = mapping.get(model, "auto")
        elif model == "gemini_flash":
            experience_level = "flash"

        try:
            config = self._get_config("chat", experience_level)
            return config["provider"]
        except Exception:
            return "groq"