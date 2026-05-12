from groq import Groq
from app.core.config import settings


class GroqLLM:

    def __init__(self, model_name="llama-3.1-8b-instant"):
        self.client = Groq(
            api_key=settings.GROQ_API_KEY
        )
        self.model = model_name

    def invoke(
        self,
        prompt: str = None,
        system_prompt: str = None,
        user_prompt: str = None,
        temperature: float = 0.0
    ):

        messages = []

        #NEW MCP STYLE (system + user)
        if system_prompt is not None and user_prompt is not None:
            messages.append({
                "role": "system",
                "content": system_prompt
            })
            messages.append({
                "role": "user",
                "content": user_prompt
            })

        #RAG STYLE (single prompt)
        elif prompt is not None:
            messages.append({
                "role": "user",
                "content": prompt
            })

        else:
            raise ValueError("Either provide (prompt) OR (system_prompt + user_prompt)")

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            top_p=1.0,
            max_tokens=1024,
            frequency_penalty=0.0,
            presence_penalty=0.0
        )

        return response.choices[0].message.content.strip()