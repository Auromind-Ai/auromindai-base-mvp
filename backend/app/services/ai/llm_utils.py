
from tenacity import retry, stop_after_attempt, wait_exponential
from app.services.ai.llm_router import LLMRouter

_router = LLMRouter()

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
async def safe_llm_call(prompt: str, model: str = "auto") -> dict:
   
    result = await _router.generate(prompt, model=model)

    return {
        "content": result["content"],
        "model": result.get("model"),
        "provider": result.get("provider"),
        "tokens": result.get("total_tokens"),
    }


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
async def safe_llm_call_text(prompt: str, model: str = "auto") -> str:

    result = await safe_llm_call(prompt, model=model)
    return result["content"]
