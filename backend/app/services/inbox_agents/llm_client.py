import json
from app.core.logger import logger
from groq import Groq
import time


class LLMClient:

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self.client = Groq(api_key=api_key)
        self.model = model

        # Logger
        self.logger = logger

        self.logger.info("LLMClient initialized")

    # RAW COMPLETION
    def generate(self, prompt, temperature=0.3, max_tokens=1024, retries=2):
        for attempt in range(retries + 1):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=30 
                )
                return response.choices[0].message.content.strip()

            except Exception as e:
                self.logger.warning(f"LLM retry {attempt + 1}: {e}")
                if attempt < retries:
                    time.sleep(1)

        self.logger.error("LLM failed after retries")
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
                text = self.generate(structured_prompt)

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