import logging
import re
from typing import AsyncGenerator

from app.utils.evaluation import token_match_percentage
from app.services.agentic_rag.learning_cache import get_learning_profile
from app.services.ai.llm_utils import safe_llm_call


logger = logging.getLogger(__name__)

class orchestratorsupport:
    
    def __init__(self):
        pass

    #Combine multiple retrieved chunks into a structured
    async def synthesize_information(self, query, context, model="auto"):

        prompt = f"""
        You are a highly accurate Information Extraction Engine.

        ROLE:
        From the Retrieved Context, identify and extract ALL relevant information
        that explicitly relates to the User Question.

        You are performing literal extraction, but you must output it as normal readable text.

        NON-NEGOTIABLE RULES:

        1. Use ONLY text that appears in Retrieved Context.
        2. Preserve original wording as much as possible.
        3. Do NOT invent or hallucinate information.
        4. Do NOT interpret meaning beyond explicit wording.
        5. Exclude clearly unrelated sections.
        6. Do NOT use numbered lists (1., 2., 3.) unless it is strictly necessary. Present the information normally.
        7. If no relevant information exists, output EXACTLY:
        No relevant information found.

        STRICT OUTPUT RULES:

        - Output ONLY the extracted information. NO introductory text. NO concluding text.
        - Do NOT start with phrases like "Here is the information" or "Upon reviewing...".
        - Do NOT output empty lines.
        - Output the information as normal sentences or short paragraphs. DO NOT force numbered lists (e.g., 1. 2. 3.).
        - If there is no relevant information, output EXACTLY: No relevant information found.

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

        learning_profile = get_learning_profile()
        if learning_profile:
            good_queries = learning_profile.get("memory", {}).get("good_queries", [])[:3]

        extra_context = ""

        if good_queries:
            extra_context = f"\n\nGood examples:\n{good_queries}"

        prompt = f"""
        You are a highly accurate Information Extraction Engine.

        OBJECTIVE:
        Identify and extract ALL relevant information from VERIFIED INFORMATION
        that directly answers the USER QUESTION.

        ABSOLUTE RULES (NON-NEGOTIABLE):

        1. Use ONLY text that appears inside VERIFIED INFORMATION.
        2. Do NOT summarize or hallucinate.
        3. Do NOT paraphrase unnecessarily.
        4. Do NOT infer meaning beyond explicit wording.
        5. Output the extracted text naturally without forcing numbered lists (1. 2. 3.).
        6. If nothing directly answers the question, output EXACTLY:
        Information not available in provided documents.
        

        STRICT OUTPUT FORMAT:

        - Output ONLY the extracted text. NO introductory text. NO concluding text.
        - Do NOT start with phrases like "Upon reviewing the provided VERIFIED INFORMATION...".
        - Present the information normally. DO NOT use numbered lists like 1. 2. 3.
        - Just output the raw extracted text that directly answers the question.
        - If there is no relevant information, output EXACTLY: Information not available in provided documents.

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

    async def generate_final_output_stream(self, query, synthesized_info, model="auto") -> AsyncGenerator[dict, None]:
        good_queries = []
        learning_profile = get_learning_profile()
        if learning_profile:
            good_queries = learning_profile.get("memory", {}).get("good_queries", [])[:3]

        extra_context = ""
        if good_queries:
            extra_context = f"\n\nGood examples:\n{good_queries}"

        prompt = f"""
        You are a highly accurate Information Extraction Engine.

        OBJECTIVE:
        Identify and extract ALL relevant information from VERIFIED INFORMATION
        that directly answers the USER QUESTION.

        ABSOLUTE RULES (NON-NEGOTIABLE):

        1. Use ONLY text that appears inside VERIFIED INFORMATION.
        2. Do NOT summarize or hallucinate.
        3. Do NOT paraphrase unnecessarily.
        4. Do NOT infer meaning beyond explicit wording.
        5. Output the extracted text naturally without forcing numbered lists (1. 2. 3.).
        6. If nothing directly answers the question, output EXACTLY:
        Information not available in provided documents.
        

        STRICT OUTPUT FORMAT:

        - Output ONLY the extracted text. NO introductory text. NO concluding text.
        - Do NOT start with phrases like "Upon reviewing the provided VERIFIED INFORMATION...".
        - Present the information normally. DO NOT use numbered lists like 1. 2. 3.
        - Just output the raw extracted text that directly answers the question.
        - If there is no relevant information, output EXACTLY: Information not available in provided documents.

        {extra_context}

        USER QUESTION:
        {query}

        VERIFIED INFORMATION:
        {synthesized_info}

        EXTRACTED CLAUSES:
        """
        from app.services.ai.llm_utils import safe_llm_call_stream
        accumulated_answer_parts = []
        async for chunk in safe_llm_call_stream(prompt, model=model):
            text = chunk.get("content", "")
            if text:
                accumulated_answer_parts.append(text)
                yield {"content": text}
        
        cleaned_answer = self.hallucination_guard("".join(accumulated_answer_parts).strip(), synthesized_info)
        formatted_answer = self.format_for_chatgpt_style(cleaned_answer)
        
        yield {"content": "\n\nFollow-up question:\n"}
        async for chunk in self.add_followup_stream(query, formatted_answer, model=model):
            yield chunk

    async def add_followup_stream(self, query, answer, model="auto") -> AsyncGenerator[dict, None]:
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
        from app.services.ai.llm_utils import safe_llm_call_stream
        async for chunk in safe_llm_call_stream(prompt, model=model):
            text = chunk.get("content", "")
            if text:
                yield {"content": text}
