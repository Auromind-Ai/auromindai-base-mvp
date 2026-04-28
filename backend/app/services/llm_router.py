import os
import asyncio
from app.core.logger import logger
from anthropic import AsyncAnthropic
from groq import Groq
import google.generativeai as genai
from app.database import SessionLocal
from app.services.model_config_service import  ModelConfigService
import time


class LLMRouter:

    def __init__(self):
        self.timeout = 5
        self._config_cache = {}
        self._cache_time = 0
        self._cache_ttl = 10   
        
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

        start_time = time.time()

        # AUTO MODE
        print(f"Generating with model: {model}")
        if model == "auto":
            try:
                logger.info("AUTO  SONNET")

                config = self._get_config("sonnet")
                result = await self._claude_call(prompt, config)
            except Exception as e:
                logger.warning(f"Sonnet failed -> Groq fallback: {e}")

                config = self._get_config("groq")
                result = await self._groq_call(prompt, config)

        else:
            config = self._get_config(model)

            if not config:
                raise Exception(f"Invalid model: {model}")

            provider = config["provider"]
            print(f"Using provider: {provider} for model: {model}")
            if provider == "claude":
                result = await self._claude_call(prompt, config)
                print(result)

            elif provider == "groq":
                result = await self._groq_call(prompt, config)

            elif provider == "gemini":
                result = await self._gemini_call(prompt, config)

            else:
                raise Exception("Unsupported provider")

        #LOG FINAL METRICS
        latency = round(time.time() - start_time, 2)

        logger.info(
            f"[LLM] model={result.get('model')} | "
            f"provider={result.get('provider')} | "
            f"in={result.get('input_tokens')} | "
            f"out={result.get('output_tokens')} | "
            f"total={result.get('total_tokens')} | "
            f"time={latency}s"
        )

        return result

    
    async def _gemini_call(self, prompt, config):
        try:
            api_key = os.getenv(config.get("api_key_env", "GOOGLE_API_KEY"))
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
            input_tokens = len(prompt.split())
            output_tokens = len(text.split())
            total_tokens = input_tokens + output_tokens

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
            api_key = os.getenv(config.get("api_key_env", "ANTHROPIC_API_KEY"))
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
            api_key = os.getenv(config.get("api_key_env", "GROQ_API_KEY"))
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