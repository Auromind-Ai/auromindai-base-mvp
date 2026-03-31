import logging
import re
from app.utils.evaluation import token_match_percentage
from app.services.llm_router import LLMRouter
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app.services.agentic_rag.embedding_service import EmbeddingGenerator
import uuid
from typing import Dict, Any
from sqlalchemy.orm import Session 
from app.utils.text_chunker import Schunker
import json
import os
from app.models.brain import EmailMessage , MCPDecision
from ddgs import DDGS
from bs4 import BeautifulSoup
from app.utils.website_scraper import Webscrapper
import numpy as np
from urllib.parse import urlparse
from app.models.brain import BrainEntry
from app.config.settings import settings
from app.services.agentic_rag.reranker_service import RerankerService
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
import numexpr as ne
from app.services.agentic_rag.reasoning_agent import run_reasoning
from app.services.agentic_rag.reinforcement import ReinforcementEngine
from app.services.agentic_rag.learning_cache import learning_cache
from app.utils.confidence import compute_confidence


router = LLMRouter()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8))
async def safe_llm_call(prompt):
    result = await router.generate(prompt)
    return {
        "content": result["content"],
        "model": result.get("model", "unknown")
    }


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "small_talk.json")

with open(JSON_PATH, "r", encoding="utf-8") as f:
    SMALL_TALK = json.load(f)

    
# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

class AgenticRAG:

    def __init__(self, llm, vector_store, embedding_generator, reranker=None, top_k=settings.RAG_TOP_K):
        self.llm = llm
        self.vector_store = vector_store
        self.reranker = reranker
        self.top_k = top_k
        self.embedding_generator = embedding_generator 
        self.router = LLMRouter()

    
    def format_response(self, answer, query, rewritten_query=None, tool=None, confidence=None):
        return {
            "answer": answer,
            "meta": {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool,
                "model": "auto",
                "confidence_score": confidence if confidence is not None else 0.5,
                "source": tool
            }
        }


    def get_small_talk_response(self, query: str):
        q = query.lower().strip()

        # Remove punctuation
        q = re.sub(r'[^\w\s]', '', q)

        # Exact match only
        if q in SMALL_TALK:
            return SMALL_TALK[q]

        return None
    
    def extract_url(self, query):

        urls = re.findall(r'https?://\S+', query)

        if urls:
            return urls[0]

        return None  
    
    
    def select_relevant_sections(self, scraped_data, query):

        query_words = set(query.lower().split())
        scored_pages = []

        for page in scraped_data:

            headings = " ".join(page.get("headings", [])).lower()
            sub_headings = " ".join(page.get("sub_headings", [])).lower()

            combined = headings + " " + sub_headings
            heading_words = set(combined.split())

            overlap = len(query_words.intersection(heading_words))

            scored_pages.append((overlap, page))

        scored_pages.sort(key=lambda x: x[0], reverse=True)

        # return ONLY the most relevant page
        return [scored_pages[0][1]]
    
   
    #Semantic Search (Vector Similarity Search)
    def semantic_search(self, db, workspace_id, query):
        try:
            query_embedding = self.embedding_generator.generate_query_embedding(query)
            results = self.vector_store.search(
                db=db,
                workspace_id= workspace_id,
                query_embedding=query_embedding,
                top_k=self.top_k
            )
            
            if not results:
                logging.warning("No documents found in vector search")
                return []

            return results

        except Exception:
            logging.exception("Vector search failed")
            return []

     #Reranking Layer
    def rerank(self, query, documents):

        if self.reranker is None:
            return documents
        pairs = [(query, doc["text"]) for doc in documents]

        scores = self.reranker.predict(pairs)
        scored_docs = list(zip(documents, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        reranked_docs = [doc for doc, score in scored_docs]

        return reranked_docs
    
    def strict_topic_filter(self, original_query, context):
        main_terms = original_query.lower().split()

        filtered = []
        for block in context.split("\n\n"):
            score = sum(term in block.lower() for term in main_terms)

            if score >= 1:   # at least 1 direct keyword match
                filtered.append(block)

        return "\n\n".join(filtered)
    
    #Retrieve Context
    def retrieve_context(self, db, workspace_id, query):
        retrieved_docs = self.semantic_search(db, workspace_id, query)
        THRESHOLD = settings.VECTOR_THRESHOLD
        strong_docs = [doc for doc in retrieved_docs if doc["score"] >= THRESHOLD]

        reranked_docs = self.rerank(query, strong_docs)

        # top_docs = reranked_docs[:2]
        top_docs = reranked_docs[:self.top_k]
        context = "\n\n".join(
            [doc["text"] for doc in top_docs]
        )

        return {
            "context": context,
            "docs": top_docs   
        }
    
    #LLM analyzes and rewrites
    async def analyze_and_rewrite(self, query):
        prompt = f"""
        You are a STRICT Retrieval Query Optimization Agent.

        ROLE:
        Your ONLY task is to rewrite the user's query to improve semantic retrieval performance.
        You are NOT allowed to answer the question.

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

        User Query:
        {query}

        Rewritten Query:
        """
        rewritten_query = await safe_llm_call(prompt)
       
        rewritten_query = rewritten_query["content"].strip()

        #APPLY REWRITE RULES
        rules = learning_cache.get("rewrite_rules", {})

        remove_words = rules.get("remove_words", [])

        for word in remove_words:
            rewritten_query = rewritten_query.replace(word, "")

        return rewritten_query.strip()
    
    #LLM decides which tool to use
    async def decide_tool(self, query):

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

    If the source of truth is unclear:
    → select web_search

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
        
        decision = await safe_llm_call(prompt)
        return decision["content"].strip().lower()

    def web_search(self, query):

        try:

            results = []
            sources = []
            seen_domains = set()

            with DDGS() as ddgs:
                search_results = ddgs.text(query, max_results=settings.WEB_RESULTS)

            for r in search_results:

                url = r.get("href")
                title = r.get("title", "")
                snippet = r.get("body", "")

                if not url:
                    continue

                # Avoid duplicate domains
                domain = url.split("/")[2] if "://" in url else url
                if domain in seen_domains:
                    continue

                seen_domains.add(domain)

                try:

                    with httpx.Client(timeout=8) as client:
                        page = client.get(
                            url,
                            headers={"User-Agent": "Mozilla/5.0"}
                        )

                    if page.status_code != 200:
                        continue

                    soup = BeautifulSoup(page.text, "html.parser")

                    # Remove noise
                    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                        tag.decompose()

                    text = soup.get_text(separator=" ")
                    text = " ".join(text.split())

                    # If scraping fails fallback to snippet
                    if len(text) < 200:
                        text = snippet

                    if len(text) < 50:
                        continue

                    text = text[:1500]

                    results.append(
                        f"""
                        Title: {title}
                        URL: {url}
                        Content:
                        {text}
                        """
                    )

                    sources.append(url)

                    # limit context size
                    if len(results) >= 3:
                        break

                except Exception:
                    continue

            return {
                "context": "\n\n".join(results),
                "sources": sources
            }

        except Exception:
            logging.exception("Web search error")
            return {"context": "", "sources": []}


    def calculator_tool(self, query):

        if not re.match(r'^[0-9+\-*/(). ]+$', query):
            return "Invalid mathematical expression."

        try:
            result = ne.evaluate(query)
            return str(result)

        except Exception:
            return "Calculation error"
        
    async def parse_email_query(self, query):

        prompt = f"""
        You are an email query understanding engine.

        Your task is to convert a user query into structured filters
        for searching emails stored in a database.

        Available filters:
        - priority (high, medium, low)
        - category (meeting, invoice, job, business, marketing, personal, other)
        - sender
        - date
        - intent (latest, summary, details)

        Rules:
        - Return ONLY valid JSON
        - Do NOT include explanations
        - Do NOT include markdown
        - Do NOT include text before or after JSON

        Example:

        User Query: last email

        Output:
        {{
        "priority": null,
        "category": null,
        "sender": null,
        "intent": "latest"
        }}

        User Query:
        {query}
        """

        response = await safe_llm_call(prompt)

        try:

            #Remove markdown code blocks
            content = response["content"]  

            cleaned = re.sub(r"```json", "", content, flags=re.IGNORECASE)
            cleaned = re.sub(r"```", "", cleaned).strip()

            #Extract JSON block
            match = re.search(r"\{.*?\}", cleaned, re.DOTALL)

            if match:
                json_str = match.group()
                filters = json.loads(json_str)
            else:
                logging.info("No JSON found in response")
                return {}

            logging.info(f"Parsed filters: {filters}")

            return filters

        except Exception as e:

            logging.info("JSON parse error:", e)
            logging.info("Cleaned response:", cleaned)

            return {}

        
    def query_emails(self, db, workspace_id, filters):

        logging.info("Applying filters:", filters)

        query = db.query(MCPDecision).join(
            EmailMessage,
            MCPDecision.message_id == EmailMessage.gmail_message_id
        ).filter(
            MCPDecision.workspace_id == workspace_id
        )

        if filters.get("priority"):
            logging.info("Filtering by priority:", filters["priority"])
            query = query.filter(
                MCPDecision.priority == filters["priority"]
            )

        if filters.get("sender"):
            query = query.filter(
                EmailMessage.sender.ilike(f"%{filters['sender']}%")
            )

        if filters.get("category"):
            logging.info(f"Filtering by category: {filters['category']}")
            query = query.filter(
                MCPDecision.category == filters["category"]
            )

        #Intent handling
        if filters.get("intent") == "latest":
            limit = 1
            logging.info("Intent detected: latest → returning 1 email")
        else:
            limit = 2

        results = query.order_by(
            MCPDecision.created_at.desc()
        ).limit(limit).all()

        logging.info(f"Emails found: {len(results)}")

        return results

    async def generate_email_summary(self, subject, body):

        prompt = f"""
        You are an AI assistant that summarizes emails.

        Rules:
        - Maximum 3 sentences
        - Focus only on the main purpose of the email
        - Do not add greeting text
        - Return plain text summary only

        Subject:
        {subject}

        Email Body:
        {body}
        """

        response = await safe_llm_call(prompt)

        return response["content"].strip()
    
    async def build_email_response(self, db, results):
        logging.info("Building response for emails:", len(results))

        response = ""

        for r in results:
            logging.info("Processing message_id:", r.message_id)

            email = db.query(EmailMessage).filter(
                EmailMessage.gmail_message_id == r.message_id
            ).first()

            if not email:
                logging.info("Email record not found:", r.message_id)
                continue

            summary = r.summary

            if not summary or "Summary not available" in summary.lower():

                summary = await self.generate_email_summary(
                    email.subject,
                    email.body
                )

                # store generated summary for future
                r.summary = summary
                db.commit()

            response += f"""
            Sender: {email.sender}

            Subject: {email.subject}

            Priority: {r.priority}

            Summary:
            {summary}

            -------------
            """
        logging.info("Final response built")
        return response
            
    async def email_storage_tool(self, db, workspace_id, query):

        filters = await self.parse_email_query(query)

        results = self.query_emails(db, workspace_id, filters)

        if not results:
            return "No emails found."

        return await self.build_email_response(db, results)
        
    #Reasoning Engine   
    async def agent_loop(self, db, workspace_id, query):

        website_names = []  

        small_talk = self.get_small_talk_response(query)
        if small_talk:
            response = await self.add_followup(query, small_talk)

            confidence = compute_confidence(tool="direct_answer")

            return self.format_response(
                response,
                query,
                query,               
                "direct_answer",     
                confidence
            )

        start_url = self.extract_url(query)

        if start_url:
            logging.info("URL detected:", start_url)

            scraper = Webscrapper(start_url)
            single_page = bool(start_url)
            scraped_data = scraper.scrapper_choose(single_page)

            if not scraped_data or isinstance(scraped_data, str):
                return self.format_response("Unable to read the website.", query)
              
            scraped_data = self.select_relevant_sections(scraped_data, query)

            website_sections = []

            for page in scraped_data:
                heading = " ".join(page.get("headings", []))
                sub_headings = page.get("sub_headings", [])
                paragraphs = page.get("paragraphs", [])
                lists = page.get("list_point", [])

                section_text = ""

                if heading:
                    section_text += f"{heading}\n"

                for sh in sub_headings:
                    section_text += f"{sh}\n"

                for para in paragraphs:
                    if para.strip():
                        section_text += f"{para.strip()}\n"

                if lists:
                    for item in lists:
                        section_text += f"- {item.strip()}\n"

                section_text = section_text.strip()

                if section_text:
                    website_sections.append(section_text)

            if not website_sections:
                return "Website content could not be extracted."

            chunker = Schunker()

            chunks = []
            for section in website_sections:
                section_chunks = chunker.build_chunks(section)
                chunks.extend(section_chunks)

            if not chunks:
                return "Unable to process website content."

            chunk_texts = [c["text"] for c in chunks]

            embeddings = self.embedding_generator.generate_embeddings(chunk_texts)

            clean_query = re.sub(r"https?://\S+", "", query).strip()
            clean_query = clean_query.strip()
            
            if not clean_query:
                clean_query = query

            query_embedding = self.embedding_generator.generate_query_embedding(clean_query)

            scores = []

            query_words = set(clean_query.lower().split())

            for i, emb in enumerate(embeddings):

                emb = np.array(emb)
                query_vec = np.array(query_embedding)

                similarity = np.dot(query_vec, emb) / (
                    np.linalg.norm(query_vec) * np.linalg.norm(emb)
                )

                chunk_words = set(chunk_texts[i].lower().split())

                keyword_overlap = len(query_words.intersection(chunk_words))

                final_score = (similarity * 0.7) + (keyword_overlap * 0.3)

                scores.append((final_score, chunk_texts[i]))

            scores.sort(key=lambda x: x[0], reverse=True)

            top_score = scores[0][0]

            top_chunks = []
            top_chunks.append(scores[0][1])   # best chunk always

            for score, text in scores[1:]:

                similarity_ratio = score / top_score

                if similarity_ratio > 0.75:# strict filtering
                    top_chunks.append(text)

                if len(top_chunks) >= 3:
                    break

            top_chunks = top_chunks[:5]
            context = "\n\n".join(top_chunks)

            final_prompt = f"""
            You are a professional information extraction system.

            TASK:
            Extract the statements from the website content that answer the user's question.

            RULES:
            - Use ONLY the WEBSITE CONTENT.
            - Do NOT invent information.
            - Do NOT add new facts.
            - Preserve the original meaning of the text.
            - Improve readability if needed (fix grammar or missing words).
            - Keep sentences complete and clear.

            Guidelines:
            - Write a clear explanation
            - Avoid numbered lists
            - Avoid repeating the question
            - Combine information naturally
            - Answer in 4-6 sentences


            Question:
            {clean_query}

            WEBSITE CONTENT:
            {context}

            Extracted information:
            """
            response = await safe_llm_call(final_prompt)

            response = response["content"].replace("```", "").strip()

            lines = response.split("\n")

            clauses = []

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                line = re.sub(r"^\d+\.\s*", "", line)
                line = re.sub(r"\[\d+\]", "", line)   # remove citations
                
                clauses.append(line)

            formatted = "\n".join(f"{i+1}. {c}" for i, c in enumerate(clauses))
            logging.info(formatted)
            response = await self.add_followup(query, formatted)
            confidence = compute_confidence(tool="web_search")

            return self.format_response(
                response,
                query,
                query,
                "web_search",
                confidence
            )
                    
        #Rewrite
        rewritten_query = await self.analyze_and_rewrite(query)
        logging.info(rewritten_query)
        
        #Decide tool
        tool =  await self.decide_tool(rewritten_query)
        
        #RULE BASED TOOL OVERRIDE
        rules = learning_cache.get("tool_rules", [])

        for rule in rules:
            if rule.get("success_rate", 0) < 60:
                continue

            matched = False

            for keyword in rule.get("top_keywords", []):
                if keyword in rewritten_query.lower():
                    tool = rule["tool"]
                    matched = True
                    break

            if matched:
                break


        #llm learning
        memory = learning_cache.get("memory", {}) if learning_cache else {}
        good_queries = memory.get("good_queries", [])[:3]
        tool_insights = memory.get("tool_insights", {})

        if tool_insights:
            best_tool = max(tool_insights, key=lambda t: tool_insights[t]["positive"])

            current_score = tool_insights.get(tool, {}).get("positive", 0)
            best_score = tool_insights.get(best_tool, {}).get("positive", 0)

            #ADD CONTROL
            if best_score > current_score + 2:
               
                tool = best_tool

        # Reinforcement Hook
        engine = ReinforcementEngine(db)

        adjusted = engine.adjust_pipeline(
            query=query,
            rewritten_query=rewritten_query,
            tool=tool
        )

        rewritten_query = adjusted["rewritten_query"]
        tool = adjusted["tool"]


        #Tool execution
        if tool == "vector_db":

            
            result = await self.iterative_retrieval(db, workspace_id, rewritten_query)

            context = result.get("context", "")
            retrieved_docs = result.get("docs", [])

            if not context or not context.strip():
                return self.format_response(
                    "The requested information is not available in the current knowledge base. Please upload relevant documents to proceed.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.2  
                )
            
            #Synthesize
            synthesized_info = await self.synthesize_information(query, context)

            if not synthesized_info or not synthesized_info.strip():
                return self.format_response(
                    "The requested information is not available in the current knowledge base.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.3
                )

            #Generate Final Output
            final_answer = await self.generate_final_output(query, synthesized_info)

            if not final_answer or not final_answer.strip():
                return self.format_response(
                    "The requested information is not available in the current knowledge base.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.3
                )

            confidence = compute_confidence(
                tool="vector_db",
                retrieved_docs=retrieved_docs,
                answer=final_answer,
                context=context
            )

            return self.format_response(
                final_answer,
                query,
                rewritten_query,
                tool,
                confidence
            )

        elif tool == "web_search":

            web_data = self.web_search(rewritten_query)

            context = web_data.get("context", "")
            sources = web_data.get("sources", [])

            for s in sources:
                domain = urlparse(s).netloc.replace("www.", "")
                website_names.append(domain)

            logging.info(f"WEB SEARCH CONTEXT: {context[:500]}")

            if not context.strip():
                return self.format_response(
                    "Unable to retrieve relevant information from the internet.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.3
                )
            good_queries = []

            if learning_cache:
                good_queries = learning_cache.get("memory", {}).get("good_queries", [])[:3]

            extra_context = ""

            if good_queries:
                examples = "\n".join([f"- {q}" for q in good_queries])
                extra_context = f"\n\nGood examples:\n{examples}"

            improvements = learning_cache.get("prompt_improvements", {})

            extra_rules = "\n".join(
                improvements.get("answer_generation_prompt", [])
            )

            #Final Answer
            final_prompt = f"""
            You are a professional AI assistant.

            {extra_rules}

            Your task is to answer the user's question using ONLY the provided context.

            RULES:
            1. Use only the information from the context.
            2. Do NOT invent facts.
            3. If the answer is not found in the context, say:
                "No recent information found."

            OUTPUT FORMAT:
            - Provide a clear and professional explanation.
            - Write in 2–8 sentences.
            - Use simple language.
            - If helpful, include short bullet points.

            {extra_context}

            Question:
            {query}

            Context:
            {context}

            Answer:
            """
            llm_response = await safe_llm_call(final_prompt)
            final_answer = llm_response["content"]
            source_text = "\n".join(f"• {site}" for site in website_names)

            final_answer = f"""
            {final_answer}

            Sources:
            {source_text}
            """

            if not llm_response or not llm_response["content"].strip():
                return "The requested information is not available in the current knowledge base. Please upload relevant documents to proceed."

            res = await self.add_followup(query, final_answer)
            
            confidence = compute_confidence(
                tool="web_search",
                answer=final_answer,
                context=context
            )

            return self.format_response(
                res,
                query,
                rewritten_query,
                tool,
                confidence
            )


        elif tool == "calculator":
            result = self.calculator_tool(query)

            if not result or not result.strip():
                return "Calculation error."

            confidence = compute_confidence(tool="calculator")

            return self.format_response(
                result,
                query,
                rewritten_query,
                tool,
                confidence
            )

        elif tool == "direct_answer":

            response = self.get_small_talk_response(query)
            response = await self.add_followup(query, response)

            if response:
                confidence = compute_confidence(tool="direct_answer")

                return self.format_response(
                    response,
                    query,
                    rewritten_query,
                    tool,
                    confidence
                )
            
            else:
                return "Hello! How can I assist you today?"
            
        elif tool == "direct_storage":

            email_data = await self.email_storage_tool(db, workspace_id, query)

            if not email_data:
                return self.format_response(
                    "No email found.",
                    query,
                    rewritten_query,
                    tool
                )

            response = await self.add_followup(query, email_data)
            
            confidence = compute_confidence(tool="direct_storage")

            return self.format_response(
                response,
                query,
                rewritten_query,
                tool,
                confidence
            )
        
        elif tool == "reasoning":

            reasoning_output = await run_reasoning(query)

            if not reasoning_output or not reasoning_output.strip():
                return "Unable to generate reasoning-based answer."

            res = await self.add_followup(query, reasoning_output)
            confidence = compute_confidence(tool="reasoning")

            return self.format_response(
                res,
                query,
                rewritten_query,
                tool,
                confidence
            )
        

        
    
    #Context Evaluation
    async def evaluate_context(self, query, context):
        
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


        decision = await safe_llm_call(prompt)
        decision = decision["content"].strip().upper()

        logging.info(decision)

        return decision.startswith("YES")

    #Query Refinement (Self-Correction)
    async def refine_query(self, query, previous_context):

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

        refined_query = await safe_llm_call(prompt)
        logging.info(refined_query)
        return refined_query["content"].strip()
    
    #Iterative Retrieval Loop
    async def iterative_retrieval(self, db, workspace_id, query, max_iterations=2):

        current_query = query
        last_context = ""

        for i in range(max_iterations):

            #Retrieve
            result = self.retrieve_context(db, workspace_id, current_query)

            context = result.get("context", "")
            docs = result.get("docs", [])

            context = self.strict_topic_filter(query, context)

            if not context or not context.strip():
                logging.warning("No context retrieved from vector DB")
                return {
                    "context": "",
                    "docs": []
                }

            last_context = context

            is_sufficient = await self.evaluate_context(query, context)

            if is_sufficient:
                logging.info(f"Context sufficient at iteration {i+1}")
                return {
                    "context": context,
                    "docs": docs
                }

            #Refine query
            current_query = await self.refine_query(current_query, context)

            if not current_query or not current_query.strip():
                logging.warning("Query refinement failed")
                break

        logging.warning("Max iterations reached, context insufficient")
        return {
            "context": last_context,
            "docs": []
        }
    
    #Combine multiple retrieved chunks into a structured
    async def synthesize_information(self, query, context):

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
        synthesized = await safe_llm_call(prompt)

        return synthesized["content"].strip()


    def hallucination_guard(self, answer, context):

        if "not available" in answer.lower():
            return answer

        if len(answer.strip()) == 0:
            return "Information not available in provided documents."

        return answer
    
    def format_for_chatgpt_style(self, text: str) -> str:
        formatted = re.sub(r'\s(?=\d+\.\s)', '\n\n', text)

        return formatted.strip()

    async def generate_final_output(self, query, synthesized_info):

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
            result = await safe_llm_call(prompt)

            content = result["content"] if isinstance(result, dict) else result
            if not content or not content.strip():

                logging.warning("Empty LLM response")
                return "Information not available in provided documents."

            logging.info("LLM response generated successfully")
            
            cleaned_answer = self.hallucination_guard(content.strip(), synthesized_info)
            formatted_answer = self.format_for_chatgpt_style(cleaned_answer)
           

            accuracy = token_match_percentage(cleaned_answer, synthesized_info)

            logging.info("Answer Accuracy: %s %%", accuracy)
            logging.info(f"Verified Info Length: {len(synthesized_info.splitlines())}")
            logging.info("FINAL ANSWER RAW:")
            logging.info(repr(cleaned_answer))
            logging.info("FINAL ANSWER FORMATTED:")
            logging.info(formatted_answer)

            return await self.add_followup(query, formatted_answer)

        except Exception as e:
                logging.exception("Error generating final output")
                return "System error while generating answer."

    async def add_followup(self, query, answer):

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

        followup = await safe_llm_call(prompt)

        return f"{answer}\n\nFollow-up question:\n{followup['content']}"
        
    def ingest_document(
        self,
        db: Session,
        workspace_id: str,
        text: str,
        title: str,
        content_type: str,
        source: str = None,
        metadata: Dict[str, Any] = None,
        existing_entry_id: str = None  # New param for Async support
    ) -> Dict[str, Any]:
         
        if not text or len(text.strip()) < 10:
            raise ValueError("Document text is too short")
        
        # Generate parent entry ID
        parent_id = existing_entry_id if existing_entry_id else str(uuid.uuid4())

        
        # Chunk the document
        chunk_metadata = {
            "title": title,
            "content_type": content_type,
            "source": source or "",
            "parent_id": parent_id,
            **(metadata or {})
        }
        
        chunker = Schunker()
        chunks = chunker.build_chunks(text)
        
        if not chunks:
            raise ValueError("No chunks could be created from document")
        
        logging.info(f"Created {len(chunks)} chunks for document: {title}")
        
        # Generate embeddings for all chunks
        chunk_texts = [c["text"] for c in chunks]
        embedding = EmbeddingGenerator()
        embeddings = embedding.generate_embeddings(chunk_texts)
        
        # Prepare data for vector store
        metadata_json_str = json.dumps(metadata) if metadata else None

        if existing_entry_id:
            # Update existing entry
            brain_entry = db.query(BrainEntry).filter(BrainEntry.id == existing_entry_id).first()
            if brain_entry:
                brain_entry.title = title
                brain_entry.content = text[:5000]
                brain_entry.content_type = content_type
                brain_entry.metadata_json = metadata_json_str
        else:
            # Create new entry
            brain_entry = BrainEntry(
                id=parent_id,
                workspace_id=workspace_id,
                title=title,
                content=text[:5000] if text else "Pending processing...",  # Ensure non-null content
                content_type=content_type,
                embedding=None,  # Embeddings are in BrainChunk table
                version=1,
                status="completed", # Default for synchronous calls
                metadata_json=metadata_json_str
            )
            db.add(brain_entry)
        
        # Flush to ensure parent_id is valid for FK
        db.flush()
        
        # Store in vector database
        self.vector_store.add_chunks(
            db=db,
            workspace_id=workspace_id,
            chunks=chunks,   
            embeddings=embeddings,
            parent_id=parent_id
        )
        
        db.commit()
        
        logging.info(f"Ingested document '{title}' with {len(chunks)} chunks")
        
        return {
            "status": "success",
            "entry_id": parent_id,
            "title": title,
            "content_type": content_type,
            "chunks_created": len(chunks),
            "total_words": sum(len(c["text"].split()) for c in chunks)
        }

_embedding_generator = None

def get_rag_service():

    global _embedding_generator

    if _embedding_generator is None:
        _embedding_generator = EmbeddingGenerator()

   
    vector_store = VectorStoreService()

    return AgenticRAG(
        llm = None,
        vector_store=vector_store,
        embedding_generator=_embedding_generator,
        top_k=settings.RAG_TOP_K,
        reranker = RerankerService()
    )