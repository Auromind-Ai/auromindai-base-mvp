
from tenacity import retry, stop_after_attempt, wait_exponential
from app.services.llm_router import LLMRouter

_router = LLMRouter()

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
async def safe_llm_call(prompt: str, model: str = "auto") -> dict:
    """
    Call LLM and return response as a dict with content, model, provider, and tokens.
    
    Returns:
        {"content": str, "model": str, "provider": str, "tokens": int}
    """
    result = await _router.generate(prompt, model=model)

    return {
        "content": result["content"],
        "model": result.get("model"),
        "provider": result.get("provider"),
        "tokens": result.get("total_tokens"),
    }


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
async def safe_llm_call_text(prompt: str, model: str = "auto") -> str:
    """
    Wrapper around safe_llm_call that returns just the content text.
    
    Use this when you only need the generated text, not metadata.
    
    Args:
        prompt: The prompt to send to the LLM
        model: The model to use (default: "auto")
        
    Returns:
        str: The generated text content
    """
    result = await safe_llm_call(prompt, model=model)
    return result["content"]
