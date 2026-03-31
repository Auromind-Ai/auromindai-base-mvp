import os
import asyncio
from app.core.logger import logger
from anthropic import AsyncAnthropic
from groq import Groq
import google.generativeai as genai
from app.config.model_settings import MODEL_CONFIGS
import time


class LLMRouter:

    def __init__(self):
        self.timeout = 5
        
        # Load keys
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.gemini_key = os.getenv("GOOGLE_API_KEY")
        self.claude_key = os.getenv("ANTHROPIC_API_KEY")


    async def generate(self, prompt: str, model: str = "auto"):

        start_time = time.time()

        # AUTO MODE
        if model == "auto":
            try:
                logger.info("AUTO  SONNET")

                result = await self._claude_call(prompt, MODEL_CONFIGS["sonnet"])

            except Exception as e:
                logger.warning(f"Sonnet failed -> Groq fallback: {e}")

                result = await self._groq_call(prompt, MODEL_CONFIGS["groq"])

        else:
            config = MODEL_CONFIGS.get(model)

            if not config:
                raise Exception(f"Invalid model: {model}")

            provider = config["provider"]

            if provider == "claude":
                result = await self._claude_call(prompt, config)

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
            genai.configure(api_key=self.gemini_key)

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
            client = AsyncAnthropic(api_key=self.claude_key)

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
            client = Groq(api_key=self.groq_key)

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