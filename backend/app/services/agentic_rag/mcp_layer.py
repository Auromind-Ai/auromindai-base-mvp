import logging
from typing import Optional

from app.services.ai.llm_utils import safe_llm_call
from app.services.agentic_rag.learning_cache import get_learning_profile

logger = logging.getLogger(__name__)

class MCPLayer:
    
    def __init__(self):
        pass

    #LLM analyzes and rewrites
    async def analyze_and_rewrite(self, query: str, history: Optional[list] = None, model: str | None = None):
        history_str = ""
        if history:
            history_str = "\n".join([f"{msg.role.upper()}: {msg.content}" for msg in history])
            history_str = f"\nCONVERSATION HISTORY:\n{history_str}\n"

        prompt = f"""
        You are a STRICT Retrieval Query Optimization Agent.

        ROLE:
        Your ONLY task is to rewrite the user's latest query to improve semantic retrieval performance.
        You are NOT allowed to answer the question.
        Use the provided CONVERSATION HISTORY (if any) to resolve pronouns, references, and conversational context.

        MANDATORY RULES:

        1. If the input is a greeting (hi, hello, hey), return it EXACTLY unchanged.
        2. If the input is purely mathematical, return it EXACTLY unchanged.
        3. Preserve all numbers, equations, and symbols exactly as written.
        4. Do NOT answer the question.
        5. Do NOT add explanations.
        6. Do NOT add commentary.
        7. Do NOT change the user's intent.
        8. Output ONLY the rewritten query text.
        9. If no improvement is possible, return the original query exactly.
        10. Only remove filler words
        11. Do not replace domain terms

        REWRITE STRATEGY:

        - If the query is short, keep it unchanged.
            Only rewrite if wording is ambiguous.
            Do NOT expand terminology.
            Do NOT introduce new words.
            
        - Replace vague references with explicit entities.
        - Add missing contextual keywords if clearly implied.
        - Expand single-word topic queries into section-specific queries.
        - Improve semantic clarity for document retrieval.
        - Keep the meaning strictly identical.

        STRICT OUTPUT FORMAT:
        Return a single line of plain text.
        No quotes.
        No prefixes.
        No suffixes.
        No extra whitespace.
        {history_str}
        User Query:
        {query}

        Rewritten Query:
        """
        rewritten_query = await safe_llm_call(prompt, model=model)
        raw_content = rewritten_query["content"].strip()

        # Robust cleanup to extract actual query from potential LLM conversational garbage
        prefixes = ["rewritten query:", "rewritten:", "query:", "rewritten query is:"]
        lines = [line.strip() for line in raw_content.split("\n") if line.strip()]
        
        extracted_query = raw_content
        found = False
        for line in reversed(lines):
            for prefix in prefixes:
                if line.lower().startswith(prefix):
                    extracted_query = line[len(prefix):].strip()
                    found = True
                    break
            if found:
                break
        
        if not found and len(lines) > 1:
            # If the LLM returned multiple lines of explanation, fallback to the last line
            extracted_query = lines[-1]

        # Strip quotes if present
        if (extracted_query.startswith('"') and extracted_query.endswith('"')) or (extracted_query.startswith("'") and extracted_query.endswith("'")):
            extracted_query = extracted_query[1:-1].strip()

        rewritten_query = extracted_query.strip()

        #APPLY REWRITE RULES
        rules = get_learning_profile().get("rewrite_rules", {})

        remove_words = rules.get("remove_words", [])

        for word in remove_words:
            rewritten_query = rewritten_query.replace(word, "")

        return rewritten_query.strip()
    
    #LLM decides which tool to use
    async def decide_tool(self, query: str, model: str | None = None):

        prompt = f"""
        You are a deterministic AI Tool Router for a production SaaS system.

        Your task is to select EXACTLY ONE tool.

        Return ONLY the tool name.
        Do NOT explain.
        Do NOT answer.

        --------------------------------------------------
        AVAILABLE TOOLS

        vector_db → internal knowledge (documents, policies, PDFs, company data)
        web_search → external/public information (internet, real-time data)
        calculator → pure math expressions only
        direct_answer → greetings or casual chat
        direct_storage → database records (emails, messages, structured data)
        reasoning → content generation (analysis, explanation, summarization)

        --------------------------------------------------
        CORE PRINCIPLE

        Select the tool based on where the answer is most likely to be retrieved from.

        --------------------------------------------------
        DECISION LOGIC

        1. INTERNAL KNOWLEDGE (vector_db)
        Select this when the query depends on:
        - private, company-specific, or uploaded data
        - structured documents or stored knowledge
        - exact retrieval from a controlled knowledge base

        2. EXTERNAL KNOWLEDGE (web_search)
        Select this when the query depends on:
        - publicly available information
        - general world knowledge
        - current, dynamic, or real-time data
        --------------------------------------------------
        BUSINESS CONTEXT OVERRIDE (CRITICAL)

        If the query refers to:
        - product features
        - pricing plans
        - subscription details
        - service offerings

        → ALWAYS select vector_db

        Even if the query asks for:
        - comparison
        - explanation
        - details

        Because this information exists in internal product data.
        3. GENERATED RESPONSE (reasoning)
        Select this when:
        - the answer must be created or inferred
        - no direct source is required
        - the task involves explanation, comparison, or ideation

        4. SPECIAL CASES (STRICT)

        - If the query is a pure mathematical expression → calculator
        - If the query is a greeting or casual message → direct_answer
        - If the query involves retrieving structured records (emails/messages) → direct_storage

        --------------------------------------------------
        DISAMBIGUATION RULE

        When multiple tools seem possible:
        - Prefer external sources for general knowledge
        - Prefer internal sources only when clearly required
        - Do not assume internal data unless explicitly implied

        --------------------------------------------------
        FALLBACK RULE

        If the source of truth is unclear AND the query is about 
        real-time or public internet data:
        → select web_search
        Otherwise:
        → select vector_db
        --------------------------------------------------

        OUTPUT FORMAT

        Return ONLY one of the following:

        vector_db
        web_search
        calculator
        direct_answer
        direct_storage
        reasoning

        --------------------------------------------------

        User Query:
        {query}

        Selected Tool:
        """
        
        decision = await safe_llm_call(prompt, model=model)
        logger.info(f"[2] LLM DECIDED: {decision['content'].strip().lower()}")
        return decision["content"].strip().lower()

    #Context Evaluation
    async def evaluate_context(self, query: str, context: str, model: str | None = None):
        
        if not context.strip():
            return False

        prompt = f"""
        You are a retrieval validation agent.

        Your task is to determine whether the provided Context contains
        enough information to answer the Question.

        You must NOT answer the question.
        You must NOT explain your reasoning.
        You must output ONLY YES or NO.

        VALIDATION RULES:

        1. Answer YES if the Context contains explicit statements
        that directly address the main intent of the Question.

        2. The Context does NOT need to contain every possible detail,
        but it must contain enough relevant information
        to reasonably generate an answer.

        3. Do NOT use outside knowledge.
        4. Do NOT assume facts not present in the Context.
        5. If the Context is clearly unrelated or lacks key information,
        answer NO.

        OUTPUT FORMAT:
        Return exactly one word:
        YES
        or
        NO

        Question:
        {query}

        Context:
        {context}

        Validation Result:
        """


        decision = await safe_llm_call(prompt, model=model)
        decision = decision["content"].strip().upper()

        logger.info(decision)

        return decision.startswith("YES")
    
    #Query Refinement (Self-Correction)
    async def refine_query(self, query: str, previous_context: str, model: str | None = None):

        prompt = f"""
        You are a STRICT Retrieval Recovery Agent.

        The previous retrieval attempt did NOT fully answer the question.

        Your task is to rewrite the Original Question to improve document retrieval quality.

        You must NOT answer the question.
        You must NOT explain anything.
        You must output ONLY the rewritten query text.

        MANDATORY RULES:

        1. Preserve the original intent exactly.
        2. Make the query more specific and retrieval-friendly.
        3. Replace vague words with explicit terms.
        4. Expand implicit references if clearly identifiable.
        5. Add only keywords explicitly present in Previous Context.
        6. Do NOT introduce new assumptions.
        7. Do NOT invent new facts.
        8. Do NOT change meaning.
        9. If the question is already optimal, return it unchanged.
        10.Do NOT introduce new entities, conditions, or concepts.

        OUTPUT FORMAT:
        - Single line of plain text
        - No quotes
        - No prefixes or suffixes
        - No commentary
        - No extra whitespace

        Original Question:
        {query}

        Previous Context:
        {previous_context}

        Rewritten Query:
        """

        refined_query = await safe_llm_call(prompt, model=model)
        logger.info(refined_query)
        return refined_query["content"].strip()
    

    def format_response(
        self,
        answer,
        query,
        rewritten_query=None,
        tool=None,
        confidence=None,
        model="auto",
    ):
        return {
            "answer": answer,
            "meta": {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool,
                "model": model,
                "confidence_score": confidence if confidence is not None else 0.5,
                "source": tool
            }
        }
