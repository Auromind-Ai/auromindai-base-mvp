from app.config.llm_config import GroqLLM
from tenacity import retry, stop_after_attempt, wait_exponential

llm = GroqLLM()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
def safe_llm_call(prompt):
    return llm.invoke(prompt)


def run_reasoning(query: str) -> str:

    prompt = f"""
    You are an advanced AI assistant.

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
    - If comparison → table format
    - If summary → short and clear
    - If analysis → structured insights

    User Query:
    {query}

    Final Answer:
    """

    return safe_llm_call(prompt).strip()