
import contextvars
import os
import inspect
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from app.services.ai.llm_router import LLMRouter

logger = logging.getLogger("auromind.token_usage")
_router = LLMRouter()

# Context variable to collect token usage logs for the current request
token_log_context = contextvars.ContextVar("token_log_context", default=None)


# ── Provider usage extraction ─────────────────────────────────────────────────

class ProviderUsageMissingError(Exception):
    """Raised when an AI provider returns no token usage and billing cannot proceed."""


def extract_usage(result: dict) -> dict:
    """
    Extract normalised provider usage from the standard LLMRouter result dict.

    Every provider adapter already returns the same shape::

        {
            "text":     "...",
            "provider": "groq" | "claude" | "gemini" | "openai" | "openrouter",
            "model":    "<model-id>",
            "usage": {
                "input_tokens":  <int>,
                "output_tokens": <int>,
                "total_tokens":  <int>,
            },
        }

    Returns a flat dict::

        {
            "provider":          "groq",
            "model":             "llama-3.3-70b-versatile",
            "prompt_tokens":     1234,
            "completion_tokens": 456,
            "total_tokens":      1690,
        }

    Raises ProviderUsageMissingError if the provider did not report any token
    usage (total_tokens == 0).  Callers must never estimate or guess — they
    must release the reservation and skip billing instead.
    """
    if not result:
        raise ProviderUsageMissingError("Provider returned no result")

    usage = result.get("usage") or {}
    prompt_tokens     = int(usage.get("input_tokens",  0))
    completion_tokens = int(usage.get("output_tokens", 0))
    total_tokens      = int(usage.get("total_tokens",  0))

    provider = result.get("provider") or "unknown"
    model    = result.get("model")    or "unknown"

    if total_tokens == 0:
        raise ProviderUsageMissingError(
            f"Provider '{provider}' returned total_tokens=0. "
            "Cannot bill without verified token usage."
        )

    return {
        "provider":          provider,
        "model":             model,
        "prompt_tokens":     prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens":      total_tokens,
    }


def split_prompt(prompt: str):
    """
    Splits the prompt into System Prompt (instructions) and User Input (context, queries, etc.)
    using common delimiters.
    """
    split_keys = [
        "User Query:",
        "Question:",
        "USER QUESTION:",
        "User Question:",
        "Subject:",
        "Original Question:",
        "WEBSITE CONTENT:"
    ]
    for key in split_keys:
        if key in prompt:
            parts = prompt.split(key, 1)
            system_prompt = parts[0].strip()
            user_input = (key + " " + parts[1]).strip()
            return system_prompt, user_input
    return prompt.strip(), ""

def get_caller_function_name():
    """
    Detects the calling function name by traversing the stack, skipping
    retry decorators and framework internals.
    """
    stack = inspect.stack()
    for frame_info in stack:
        filename = frame_info.filename
        func_name = frame_info.function
        
        # Skip tenacity and other retry/contextlib wrapper frames
        if "tenacity" in filename.lower() or "contextlib" in filename.lower():
            continue
            
        if func_name in ("safe_llm_call", "safe_llm_call_text", "get_caller_function_name", "<module>", "__call__"):
            continue
            
        basename = os.path.basename(filename)
        return f"{basename}:{func_name}"
    return "unknown"

def write_to_token_log_file(message: str):
    """
    Writes token reports and messages to dedicated files: logs/token_usage.log and logs/token_usage.txt
    """
    try:
        from app.core.logger import BASE_DIR
        log_dir = os.path.join(BASE_DIR, "logs")
        os.makedirs(log_dir, exist_ok=True)
        
        # Write to .log
        log_path = os.path.join(log_dir, "token_usage.log")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(message + "\n")
            
        # Write to .txt
        txt_path = os.path.join(log_dir, "token_usage.txt")
        with open(txt_path, "a", encoding="utf-8") as f:
            f.write(message + "\n")
            
    except Exception as e:
        logger.error(f"Failed to write to token log files: {e}")

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
async def safe_llm_call(prompt: str, model: str = "auto") -> dict:
    from app.services.ai.execution_service import AIExecutionService, current_execution_context
    
    ctx = current_execution_context.get()
    if ctx:
        result = await AIExecutionService.execute(
            db=None,
            workspace_id=ctx.workspace_id,
            user_id=ctx.user_id,
            feature_key=ctx.feature_key,
            prompt=prompt,
            model=model
        )
    else:
        logger.warning(f"safe_llm_call called without active execution context for model: {model}")
        result = await _router.generate(prompt, model=model)
    
    # Calculate tokens
    usage = result.get("usage", {})
    input_tokens = usage.get("input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)
    total_tokens = usage.get("total_tokens", 0)
    content = result.get("text", "")
    
    # Split prompt into System Prompt and Input Query
    system_prompt, user_input = split_prompt(prompt)
    
    # Proportional token estimation
    sys_words = len(system_prompt.split())
    input_words = len(user_input.split())
    total_words = sys_words + input_words
    
    if total_words > 0:
        system_tokens = int(round((sys_words / total_words) * input_tokens))
        user_input_tokens = input_tokens - system_tokens
    else:
        system_tokens = input_tokens
        user_input_tokens = 0
        
    caller = get_caller_function_name()
    
    log_entry = {
        "caller": caller,
        "model": result.get("model"),
        "provider": result.get("provider"),
        "system_prompt": system_prompt,
        "user_input": user_input,
        "system_tokens": system_tokens,
        "input_tokens": user_input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "content": content
    }
    
    # Log individual call to general logger
    logger.info(
        f"LLM Call - Caller: {caller} | Model: {log_entry['model']} | Provider: {log_entry['provider']} | "
        f"Tokens -> System: {system_tokens}, Input: {user_input_tokens}, Output: {output_tokens}, Total: {total_tokens}"
    )
    
    # Append to current session log if context variable is set
    logs_list = token_log_context.get()
    if logs_list is not None:
        logs_list.append(log_entry)
        
    return {
        "content": content,
        "model": result.get("model"),
        "provider": result.get("provider"),
        "tokens": total_tokens,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
async def safe_llm_call_text(prompt: str, model: str = "auto") -> str:
    result = await safe_llm_call(prompt, model=model)
    return result["content"]
