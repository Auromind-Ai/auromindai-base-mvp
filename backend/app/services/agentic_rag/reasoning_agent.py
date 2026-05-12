from app.services.llm_utils import safe_llm_call
from app.services.agentic_rag.learning_cache import learning_cache


async def run_reasoning(query: str, model: str = "auto") -> str:

    good_queries = []

    if learning_cache:
        good_queries = learning_cache.get("memory", {}).get("good_queries", [])[:3]

    extra_context = ""

    if good_queries:
        examples = "\n".join([f"- {q}" for q in good_queries])
        extra_context = f"\n\nGood examples:\n{examples}"


    prompt = f"""
    You are an advanced AI assistant.

    {extra_context}

    Your job is to understand the user's query and respond appropriately.

    Instructions:

    1. First, understand the intent:
       - explanation
       - summarization
       - comparison
       - analysis
       - generation

    2. If the query is ambiguous:
       - choose the most logical and commonly used meaning
       - prefer technical meaning if context suggests it

    3. Then generate the correct output.

    Output Rules:
    - Be clear, structured, and professional
    - No hallucination
    - No placeholders like [Insert ...]
    - Keep output concise and useful

    Special Handling:
    - If meeting-related → generate proper meeting agenda
    - If comparison
    - If summary → short and clear
    - If analysis → structured insights

    User Query:
    {query}

    Final Answer:
    """

    result = await safe_llm_call(prompt, model=model)
    return result["content"].strip()
