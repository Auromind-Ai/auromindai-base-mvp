import logging
from urllib.parse import urlparse
from app.utils.confidence import compute_confidence
from app.services.agentic_rag.reinforcement import ReinforcementEngine
from app.services.agentic_rag.learning_cache import learning_cache
from app.utils.website_scraper import Webscrapper
import re
import numpy as np
from app.services.agentic_rag.llm_wrapper_layer import safe_llm_call
from app.utils.text_chunker import Schunker
from app.services.agentic_rag.reasoning_agent import run_reasoning

class Orchestratorlayer:

    def __init__(self, mcp, tools, retrieval, helpers, support, embedding_generator):
        self.mcp = mcp
        self.tools = tools
        self.retrieval = retrieval
        self.helpers = helpers
        self.support = support
        self.embedding_generator = embedding_generator


    #Reasoning Engine   
    async def agent_loop(self, db, workspace_id, query):

        website_names = []  

        small_talk = self.helpers.get_small_talk_response(query)
        if small_talk:
            response = await self.support.add_followup(query, small_talk)

            confidence = compute_confidence(tool="direct_answer")

            return self.mcp.format_response(
                response,
                query,
                query,               
                "direct_answer",     
                confidence
            )

        start_url = self.helpers.extract_url(query)

        if start_url:
            logging.info("URL detected:", start_url)

            scraper = Webscrapper(start_url)
            single_page = bool(start_url)
            scraped_data = scraper.scrapper_choose(single_page)
            print(scraped_data)

            if not scraped_data or isinstance(scraped_data, str):
                return self.mcp.format_response("Unable to read the website.", query)
            
              
            scraped_data = self.helpers.select_relevant_sections(scraped_data, query)

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
            response = await self.support.add_followup(query, formatted)
            confidence = compute_confidence(tool="web_search")

            return self.mcp.format_response(
                response,
                query,
                query,
                "web_search",
                confidence
            )
                    
        #Rewrite
        rewritten_query = await self.mcp.analyze_and_rewrite(query)
        logging.info(rewritten_query)
        
        #Decide tool
        tool =  await self.mcp.decide_tool(rewritten_query)
        
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
                return self.mcp.format_response(
                    "The requested information is not available in the current knowledge base. Please upload relevant documents to proceed.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.2  
                )
            
            #Synthesize
            synthesized_info = await self.support.synthesize_information(query, context)

            if not synthesized_info or not synthesized_info.strip():
                return self.mcp.format_response(
                    "The requested information is not available in the current knowledge base.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.3
                )

            #Generate Final Output
            final_answer = await self.support.generate_final_output(query, synthesized_info)

            if not final_answer or not final_answer.strip():
                return self.mcp.format_response(
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

            return self.mcp.format_response(
                final_answer,
                query,
                rewritten_query,
                tool,
                confidence
            )

        elif tool == "web_search":

            web_data = self.tools.web_search(rewritten_query)

            context = web_data.get("context", "")
            sources = web_data.get("sources", [])

            for s in sources:
                domain = urlparse(s).netloc.replace("www.", "")
                website_names.append(domain)

            logging.info(f"WEB SEARCH CONTEXT: {context[:500]}")

            if not context.strip():
                return self.mcp.format_response(
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

            res = await self.support.add_followup(query, final_answer)
            
            confidence = compute_confidence(
                tool="web_search",
                answer=final_answer,
                context=context
            )

            return self.mcp.format_response(
                res,
                query,
                rewritten_query,
                tool,
                confidence
            )


        elif tool == "calculator":
            result = self.tools.calculator_tool(query)

            if not result or not result.strip():
                return "Calculation error."

            confidence = compute_confidence(tool="calculator")

            return self.mcp.format_response(
                result,
                query,
                rewritten_query,
                tool,
                confidence
            )

        elif tool == "direct_answer":

            response = self.helpers.get_small_talk_response(query)
            response = await self.support.add_followup(query, response)

            if response:
                confidence = compute_confidence(tool="direct_answer")

                return self.mcp.format_response(
                    response,
                    query,
                    rewritten_query,
                    tool,
                    confidence
                )
            
            else:
                return "Hello! How can I assist you today?"
            
        elif tool == "direct_storage":

            email_data = await self.tools.email_storage_tool(db, workspace_id, query)

            if not email_data:
                return self.mcp.format_response(
                    "No email found.",
                    query,
                    rewritten_query,
                    tool
                )

            response = await self.support.add_followup(query, email_data)
            
            confidence = compute_confidence(tool="direct_storage")

            return self.mcp.format_response(
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

            res = await self.support.add_followup(query, reasoning_output)
            confidence = compute_confidence(tool="reasoning")

            return self.mcp.format_response(
                res,
                query,
                rewritten_query,
                tool,
                confidence
            )

        else:
            # Unrecognised tool — log and fall back to LLM reasoning so the
            # caller always gets a non-None answer and the UI is never blank.
            logging.warning(f"agent_loop: unrecognised tool '{tool}' for query: {query!r}")
            reasoning_output = await run_reasoning(query)
            if reasoning_output and reasoning_output.strip():
                res = await self.support.add_followup(query, reasoning_output)
                return self.mcp.format_response(
                    res, query, query, "reasoning", compute_confidence(tool="reasoning")
                )
            return self.mcp.format_response(
                "I'm not sure how to answer that. Could you rephrase your question?",
                query, query, "fallback", 0.1
            )
        
        #Iterative Retrieval Loop
    async def iterative_retrieval(self, db, workspace_id, query, max_iterations=2):

        current_query = query
        last_context = ""

        for i in range(max_iterations):

            #Retrieve
            result = self.retrieval.retrieve_context(db, workspace_id, current_query)

            context = result.get("context", "")
            docs = result.get("docs", [])

            context = self.retrieval.strict_topic_filter(query, context)

            if not context or not context.strip():
                logging.warning("No context retrieved from vector DB")
                return {
                    "context": "",
                    "docs": []
                }

            last_context = context

            is_sufficient = await self.mcp.evaluate_context(query, context)

            if is_sufficient:
                logging.info(f"Context sufficient at iteration {i+1}")
                return {
                    "context": context,
                    "docs": docs
                }

            #Refine query
            current_query = await self.mcp.refine_query(current_query, context)

            if not current_query or not current_query.strip():
                logging.warning("Query refinement failed")
                break

        logging.warning("Max iterations reached, context insufficient")
        return {
            "context": last_context,
            "docs": []
        }