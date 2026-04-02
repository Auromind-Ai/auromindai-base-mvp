from app.services.llm_router import LLMRouter
from tenacity import retry, stop_after_attempt, wait_exponential

router = LLMRouter()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
async def safe_llm_call(prompt: str):
    result = await router.generate(prompt)

    return {
        "content": result["content"],
        "model": result.get("model", "unknown")
    }