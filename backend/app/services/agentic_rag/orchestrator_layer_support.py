import logging
import re

from app.utils.evaluation import token_match_percentage
from app.services.agentic_rag.learning_cache import learning_cache
from app.services.llm_utils import safe_llm_call


logger = logging.getLogger(__name__)

class orchestratorsupport:
    
    def __init__(self):
        pass

    #Combine multiple retrieved chunks into a structured
    async def synthesize_information(self, query, context, model="auto"):

        prompt = f"""
        You are a STRICT legal clause extraction engine.

        ROLE:
        From the Retrieved Context, identify and extract ALL clauses,
        sub-clauses, numbered items, bullet points, and provisos
        that explicitly relate to the User Question.

        You are performing literal extraction only.

        NON-NEGOTIABLE RULES:

        1. Use ONLY text that appears in Retrieved Context.
        2. Extract COMPLETE clauses exactly as written.
        3. If a clause spans multiple lines, include the FULL clause.
        4. Preserve original wording, punctuation, and numbering exactly.
        5. Maintain original order of appearance.
        6. Do NOT merge separate clauses.
        7. Do NOT split a single clause.
        8. Do NOT paraphrase.
        9. Do NOT summarize.
        10. Do NOT interpret meaning beyond explicit wording.
        11. Do NOT skip similar structured clauses.
        12. Do NOT stop after the first relevant match.
        13. Exclude clearly unrelated sections.
        14. If no relevant clause exists, output EXACTLY:
        No relevant clause found.

        STRICT OUTPUT RULES:

        - If original numbering exists (1., 2., 3., etc.), preserve it exactly.
        - If bullet formatting exists, preserve it exactly.
        - Do NOT create new numbering.
        - Do NOT add headings.
        - Do NOT add commentary.
        - Output ONLY the extracted clauses.

        CRITICAL FORMATTING RULE:

        - Every numbered clause (e.g., 1., 2., 3.) MUST start on a new line.
        - Insert EXACTLY one blank line between clauses.
        - Do NOT place multiple clauses in a single paragraph.
        - Preserve all newline characters exactly.

        User Question:
        {query}

        Retrieved Context:
        {context}

        Extracted Clauses:
        """
        synthesized = await  safe_llm_call(prompt, model=model)

        return synthesized["content"].strip()
    
    async def generate_final_output(self, query, synthesized_info, model="auto"):

        good_queries = []

        if learning_cache:
            good_queries = learning_cache.get("memory", {}).get("good_queries", [])[:3]

        extra_context = ""

        if good_queries:
            extra_context = f"\n\nGood examples:\n{good_queries}"

        prompt = f"""
        You are a STRICT legal clause extraction engine.

        OBJECTIVE:
        Identify and extract ALL clauses, sub-clauses, bullet points,
        numbered items, and provisos from VERIFIED INFORMATION
        that directly answer the USER QUESTION.

        You are performing literal extraction only.

        ABSOLUTE RULES (NON-NEGOTIABLE):

        1. Use ONLY text that appears inside VERIFIED INFORMATION.
        2. Extract COMPLETE clauses exactly as written.
        3. If a clause spans multiple lines, include the FULL clause.
        4. Do NOT truncate.
        5. Do NOT summarize.
        6. Do NOT paraphrase.
        7. Do NOT merge separate clauses.
        8. Do NOT split a single clause into multiple parts.
        9. Preserve original numbering and bullet formatting exactly.
        10. If multiple relevant clauses exist, extract ALL of them.
        11. Do NOT stop after the first match.
        12. Do NOT infer meaning beyond explicit wording.
        13. If nothing directly answers the question, output EXACTLY:
        Information not available in provided documents.
        

        STRICT OUTPUT FORMAT:

        - If original text contains numbering (1., 2., 3., etc.), preserve it exactly.
        - If original text contains bullet points, preserve them exactly.
        - Maintain original order of appearance.
        - Do NOT generate new numbering.
        - Do NOT add commentary.
        - Do NOT add headings.
        - Output ONLY the extracted clauses.

        {extra_context}

        USER QUESTION:
        {query}

        VERIFIED INFORMATION:
        {synthesized_info}

        EXTRACTED CLAUSES:
        """

        try:
            result = await  safe_llm_call(prompt, model=model)

            content = result["content"] if isinstance(result, dict) else result
            if not content or not content.strip():

                logging.warning("Empty LLM response")
                return "Information not available in provided documents."

            logger.info("LLM response generated successfully")
            
            cleaned_answer = self.hallucination_guard(content.strip(), synthesized_info)
            formatted_answer = self.format_for_chatgpt_style(cleaned_answer)
           

            accuracy = token_match_percentage(cleaned_answer, synthesized_info)

            logger.info("Answer Accuracy: %s %%", accuracy)
            logger.info(f"Verified Info Length: {len(synthesized_info.splitlines())}")
            logger.info("FINAL ANSWER RAW:")
            logger.info(repr(cleaned_answer))
            logger.info("FINAL ANSWER FORMATTED:")
            logger.info(formatted_answer)

            return await self.add_followup(query, formatted_answer, model=model)

        except Exception as e:
                logging.exception("Error generating final output")
                return "System error while generating answer."
        

    async def add_followup(self, query, answer, model="auto"):

        prompt = f"""
        You are a helpful assistant.

        Based on the user's question and the answer,
        generate ONE useful follow-up question that helps
        the user continue exploring the same topic.

        Rules:
        - Maximum 15 words
        - Must relate directly to the answer
        - Must help the user learn more
        - Do not repeat the same information
        - Ask only ONE question
        - No explanation

        User Question:
        {query}

        Answer:
        {answer}

        Follow-up question:
        """

        followup = await  safe_llm_call(prompt, model=model)

        return f"{answer}\n\nFollow-up question:\n{followup['content']}"
    

    def hallucination_guard(self, answer, context):

        if "not available" in answer.lower():
            return answer

        if len(answer.strip()) == 0:
            return "Information not available in provided documents."

        return answer
    
    def format_for_chatgpt_style(self, text: str) -> str:
        formatted = re.sub(r'\s(?=\d+\.\s)', '\n\n', text)

        return formatted.strip()
