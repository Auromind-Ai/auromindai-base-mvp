import json
from app.core.logger import logger
from groq import Groq
import time
import tiktoken


class LLMClient:

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self.client = Groq(api_key=api_key)
        self.model = model

        # Logger
        self.logger = logger

        self.logger.info("LLMClient initialized")

    # RAW COMPLETION
    def generate(self, prompt, temperature=0.2, max_tokens=1024, retries=2, response_format=None):
        models_to_try = [self.model]
        if self.model == "llama-3.3-70b-versatile":
            models_to_try.append("llama-3.1-8b-instant")

        for model in models_to_try:
            for attempt in range(retries + 1):
                try:
                    kwargs = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": "You are a helpful AI assistant. You must output valid JSON when required."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                        "timeout": 30
                    }
                    if response_format:
                        kwargs["response_format"] = response_format

                    response = self.client.chat.completions.create(**kwargs)
                    response_content = response.choices[0].message.content.strip()

                    # Calculate local tokens using tiktoken (Llama 3 encoding)
                    try:
                        if not hasattr(self, "_encoder"):
                            self._encoder = tiktoken.get_encoding("o200k_base")
                        
                        system_msg = "You are a helpful AI assistant. You must output valid JSON when required."
                        sys_tokens = len(self._encoder.encode(system_msg))
                        user_tokens = len(self._encoder.encode(prompt))
                        out_tokens = len(self._encoder.encode(response_content))
                        overall_local_tokens = sys_tokens + user_tokens + out_tokens
                    except Exception as tk_err:
                        self.logger.warning(f"Local token calculation failed: {tk_err}")
                        sys_tokens = len(system_msg) // 4
                        user_tokens = len(prompt) // 4
                        out_tokens = len(response_content) // 4
                        overall_local_tokens = sys_tokens + user_tokens + out_tokens

                    # Get official API usage reported by Groq
                    api_prompt_tokens = 0
                    api_completion_tokens = 0
                    api_total_tokens = 0
                    if hasattr(response, "usage") and response.usage:
                        api_prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
                        api_completion_tokens = getattr(response.usage, "completion_tokens", 0)
                        api_total_tokens = getattr(response.usage, "total_tokens", 0)

                    # Log the metrics clearly
                    self.logger.info(
                        f"LLM TOKEN METRICS [{model}]:\n"
                        f"  - System Prompt Tokens: {sys_tokens}\n"
                        f"  - User Input Tokens (RAG/History/etc.): {user_tokens}\n"
                        f"  - Response Output Tokens: {out_tokens}\n"
                        f"  - Overall Local Tokens: {overall_local_tokens}\n"
                        f"  - API Reported Prompt Tokens: {api_prompt_tokens}\n"
                        f"  - API Reported Completion Tokens: {api_completion_tokens}\n"
                        f"  - API Reported Total Tokens: {api_total_tokens}"
                    )

                    return response_content

                except Exception as e:
                    err_msg = str(e).lower()
                    self.logger.warning(f"LLM model {model} attempt {attempt + 1} failed: {e}")

                    # If it's a rate limit error (429), don't keep retrying this model
                    if "rate_limit" in err_msg or "429" in err_msg:
                        self.logger.warning(f"Rate limit hit for {model}. Skipping remaining retries for this model.")
                        break

                    if attempt < retries:
                        time.sleep(1)

        self.logger.error("LLM failed after all models and retries")
        return None

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

    #TEXT GENERATION
    def generate_text(self, prompt):
        try:
            return self.generate(prompt)
        except Exception as e:
            self.logger.error("LLM text error", exc_info=True)
            return ""

    # STREAM 
    def generate_stream(self, prompt):
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in stream:
                yield chunk.choices[0].delta.content or ""

        except Exception as e:
            self.logger.error("LLM stream error", exc_info=True)
            yield ""