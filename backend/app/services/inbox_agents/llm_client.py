import json
from app.core.logger import logger
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.services.ai.llm_router import LLMRouter
from app.services.ai.llm_utils import token_log_context, get_caller_function_name

class LLMClient:

    def __init__(self, api_key: str = None, model: str = "llama-3.3-70b-versatile"):
        # Deprecated: API key is now resolved dynamically from platform_settings
        self.model = model
        self.logger = logger
        self.logger.info("LLMClient initialized (centralized)")

    # RAW COMPLETION
    def generate(self, prompt, temperature=0.2, max_tokens=1024, retries=2, response_format=None):
        

        async def _run():
            router = LLMRouter()
            # Route via feature_key = "inbox" and experience_level = "auto"
            return await router.generate(prompt, model="auto", feature_key="inbox")

        try:
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(lambda: asyncio.run(_run()))
                result = future.result()
                
            response_content = result.get("text", "")
            usage = result.get("usage", {})
            api_prompt_tokens = usage.get("input_tokens", 0)
            api_completion_tokens = usage.get("output_tokens", 0)
            api_total_tokens = usage.get("total_tokens", 0)

            self.logger.info(
                f"LLM TOKEN METRICS [inbox:auto]:\n"
                f"  - API Reported Prompt Tokens: {api_prompt_tokens}\n"
                f"  - API Reported Completion Tokens: {api_completion_tokens}\n"
                f"  - API Reported Total Tokens: {api_total_tokens}"
            )
            
            # Write to token log context if present
            try:
               
                logs_list = token_log_context.get()
                if logs_list is not None:
                    logs_list.append({
                        "caller": get_caller_function_name(),
                        "model": result.get("model", "auto"),
                        "provider": result.get("provider", "groq"),
                        "system_prompt": "You are a helpful AI assistant. You must output valid JSON when required.",
                        "user_input": prompt,
                        "system_tokens": 0,
                        "input_tokens": api_prompt_tokens,
                        "output_tokens": api_completion_tokens,
                        "total_tokens": api_total_tokens,
                        "content": response_content,
                    })
            except Exception as log_err:
                self.logger.warning(f"Failed to append to token_log_context: {log_err}")

            return response_content
        except Exception as e:
            self.logger.error(f"LLM generate error: {e}", exc_info=True)
            return ""

    # JSON GENERATION
    def generate_json(self, prompt, retries=2):
        try:
            structured_prompt = f"""
            {prompt}

            IMPORTANT:
            - Return ONLY valid JSON
            - No extra text
            """

            for attempt in range(retries + 1):
                text = self.generate(structured_prompt, response_format={"type": "json_object"})

                if not text:
                    continue

                # Clean markdown formatting if present
                cleaned_text = text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                elif cleaned_text.startswith("```"):
                    cleaned_text = cleaned_text[3:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                cleaned_text = cleaned_text.strip()

                # Extract content between the first '{' and the last '}'
                first_brace = cleaned_text.find('{')
                last_brace = cleaned_text.rfind('}')
                if first_brace != -1 and last_brace != -1 and last_brace >= first_brace:
                    cleaned_text = cleaned_text[first_brace:last_brace+1]

                try:
                    return json.loads(cleaned_text)
                except json.JSONDecodeError:
                    self.logger.warning(
                        f"JSON parse failed (attempt {attempt})",
                        extra={"output": text}
                    )

            return {}

        except Exception as e:
            self.logger.error("LLM JSON error", exc_info=True)
            return {}

    # TEXT GENERATION
    def generate_text(self, prompt):
        try:
            return self.generate(prompt)
        except Exception as e:
            self.logger.error("LLM text error", exc_info=True)
            return ""

    # STREAM 
    def generate_stream(self, prompt):
        try:
            content = self.generate(prompt)
            yield content
        except Exception as e:
            self.logger.error("LLM stream error", exc_info=True)
            yield ""