import logging
from urllib.parse import urlparse
from app.utils.confidence import compute_confidence
from app.services.agentic_rag.reinforcement import ReinforcementEngine
from app.services.agentic_rag.learning_cache import get_learning_profile
from app.utils.website_scraper import Webscrapper
import re
import numpy as np
from app.services.ai.llm_utils import safe_llm_call, token_log_context, write_to_token_log_file
from app.utils.text_chunker import Schunker
from app.services.agentic_rag.reasoning_agent import run_reasoning, run_reasoning_stream
from app.models.brain import BrainEntry
from typing import AsyncGenerator, Optional


logger = logging.getLogger("auromind")

class OrchestratorLayer:

    def __init__(self, mcp, tools, retrieval, helpers, support, embedding_generator,vector_store, ingestion):
        self.mcp = mcp
        self.tools = tools
        self.retrieval = retrieval
        self.helpers = helpers
        self.support = support
        self.embedding_generator = embedding_generator
        self.vector_store = vector_store
        self.ingestion = ingestion


    def log_aggregated_token_usage(self, query: str, token_logs: list, res=None):
        import datetime
        if not token_logs:
            return

        total_calls = len(token_logs)
        total_system_tokens = sum(log.get("system_tokens", 0) for log in token_logs)
        total_input_tokens = sum(log.get("input_tokens", 0) for log in token_logs)
        total_output_tokens = sum(log.get("output_tokens", 0) for log in token_logs)
        total_combined_tokens = sum(log.get("total_tokens", 0) for log in token_logs)

        # Get reply and calculate its tokens
        final_reply_text = ""
        if res:
            if isinstance(res, dict):
                final_reply_text = res.get("answer", "")
            elif isinstance(res, str):
                final_reply_text = res
        
        final_reply_tokens = len(final_reply_text.split()) if final_reply_text else 0

        report = []
        report.append("=========================================")
        report.append("TOKEN USAGE REPORT (Agentic RAG)")
        report.append(f"Timestamp: {datetime.datetime.utcnow().isoformat()}Z")
        report.append(f"User Query: {repr(query)}")
        report.append("-----------------------------------------")

        for idx, log in enumerate(token_logs, 1):
            report.append(f"{idx}. Function: {log.get('caller', 'unknown')}")
            report.append(f"   Provider: {log.get('provider', 'unknown')} | Model: {log.get('model', 'unknown')}")
            report.append(f"   System Prompt Tokens: {log.get('system_tokens', 0)}")
            report.append(f"   Input/Query Tokens: {log.get('input_tokens', 0)}")
            report.append(f"   Output Tokens: {log.get('output_tokens', 0)}")
            report.append(f"   Total Tokens: {log.get('total_tokens', 0)}")
            
            system_prompt = log.get("system_prompt", "")
            user_input = log.get("user_input", "")
            content = log.get("content", "")
            
            sys_snippet = system_prompt[:100].replace('\n', ' ') + "..." if len(system_prompt) > 100 else system_prompt
            user_snippet = user_input[:100].replace('\n', ' ') + "..." if len(user_input) > 100 else user_input
            out_snippet = content[:100].replace('\n', ' ') + "..." if len(content) > 100 else content
            
            report.append(f"   [Sys Prompt Snippet]: {sys_snippet}")
            report.append(f"   [User Input Snippet]: {user_snippet}")
            report.append(f"   [LLM Output Snippet]: {out_snippet}")
            report.append("")

        report.append("-----------------------------------------")
        report.append("TOTAL SUMMARY:")
        report.append(f"Total Calls: {total_calls}")
        report.append(f"Total System Tokens: {total_system_tokens}")
        report.append(f"Total Input/Query Tokens: {total_input_tokens}")
        report.append(f"Total Output Tokens: {total_output_tokens}")
        report.append(f"TOTAL TOKENS USED: {total_combined_tokens}")
        
        if final_reply_text:
            report.append("-----------------------------------------")
            report.append(f"Final Reply Text: {repr(final_reply_text)}")
            report.append(f"Final Reply Token Count (Estimate): {final_reply_tokens}")
            
        report.append("=========================================")

        report_str = "\n".join(report)
        logger.info(f"\n{report_str}")
        write_to_token_log_file(report_str)

    #Reasoning Engine   
    async def agent_loop(self, db, workspace_id, query, model="auto", source="internal_web", document_id=None, entry_ids=None, collection=None, bypass_billing: bool = False, session_id: Optional[str] = None):
        parent_logs = token_log_context.get()
        if parent_logs is not None:
            token_logs = parent_logs
            token = None
        else:
            token_logs = []
            token = token_log_context.set(token_logs)
        
        try:
            async def run_rag_internal():
                return await self._agent_loop_internal(
                    db=db,
                    workspace_id=workspace_id,
                    query=query,
                    model=model,
                    source=source,
                    document_id=document_id,
                    entry_ids=entry_ids,
                    collection=collection,
                    session_id=session_id
                )

            from app.services.ai.execution_service import AIExecutionService, AIFeatureRegistry, current_execution_context
            parent_ctx = current_execution_context.get()
            user_id = parent_ctx.user_id if parent_ctx else "system"

            res = await AIExecutionService.execute(
                db=db,
                workspace_id=workspace_id,
                user_id=user_id,
                feature_key=AIFeatureRegistry.RAG,
                prompt=query,
                model=model,
                bypass_billing=bypass_billing,
                execute_fn=run_rag_internal,
                description=f"RAG query: {query[:50]}"
            )
            self.log_aggregated_token_usage(query, token_logs, res)
            return res
        except Exception as e:
            self.log_aggregated_token_usage(query, token_logs)
            raise e
        finally:
            if token is not None:
                token_log_context.reset(token)

    async def agent_loop_stream(self, db, workspace_id, query, model="auto", source="internal_web", document_id=None, entry_ids=None, collection=None, bypass_billing: bool = False, session_id: Optional[str] = None):
        parent_logs = token_log_context.get()
        if parent_logs is not None:
            token_logs = parent_logs
            token = None
        else:
            token_logs = []
            token = token_log_context.set(token_logs)
        
        try:
            async def run_rag_stream_internal():
                async for chunk in self._agent_loop_stream_internal(
                    db=db,
                    workspace_id=workspace_id,
                    query=query,
                    model=model,
                    source=source,
                    document_id=document_id,
                    entry_ids=entry_ids,
                    collection=collection,
                    session_id=session_id
                ):
                    yield chunk

            from app.services.ai.execution_service import AIExecutionService, AIFeatureRegistry, current_execution_context
            parent_ctx = current_execution_context.get()
            user_id = parent_ctx.user_id if parent_ctx else "system"

            async for chunk in AIExecutionService.execute_stream(
                db=db,
                workspace_id=workspace_id,
                user_id=user_id,
                feature_key=AIFeatureRegistry.RAG,
                prompt=query,
                model=model,
                bypass_billing=bypass_billing,
                execute_fn=run_rag_stream_internal,
                description=f"RAG query: {query[:50]}"
            ):
                yield chunk
        finally:
            if token is not None:
                token_log_context.reset(token)

    async def _agent_loop_stream_internal(self, db, workspace_id, query, model="auto", source="internal_web", document_id=None, entry_ids=None, collection=None, session_id: Optional[str] = None) -> AsyncGenerator[dict, None]:
        website_names = []  
        web_search_enabled = (source == "web_search")
        logger.info(f"DEBUG: web_search_enabled = {web_search_enabled}")
        fallback_triggered = False

        small_talk = None
        if not web_search_enabled:
            small_talk = self.helpers.get_small_talk_response(query)

        if small_talk:
            fallback_triggered = True
            logger.info(f"DEBUG: fallback_triggered = {fallback_triggered} (small talk)")
            confidence = compute_confidence(tool="direct_answer")
            meta_payload = {
                "query": query,
                "rewritten_query": query,
                "tool": "direct_answer",
                "model": model,
                "confidence_score": confidence,
                "source": "direct_answer"
            }
            yield {"meta": meta_payload}
            yield {"content": small_talk}
            yield {"content": "\n\n"}
            async for chunk in self.support.add_followup_stream(query, small_talk, model=model):
                yield chunk
            return

        start_url = self.helpers.extract_url(query)

        if start_url:
            logger.info("URL detected:", start_url)
            scraper = Webscrapper(start_url)
            single_page = bool(start_url)
            scraped_data = scraper.scrapper_choose(single_page)
            print(scraped_data)

            if not scraped_data or isinstance(scraped_data, str):
                meta_payload = {
                    "query": query,
                    "rewritten_query": query,
                    "tool": "web_search",
                    "model": model,
                    "confidence_score": 0.1,
                    "source": "web_search"
                }
                yield {"meta": meta_payload}
                yield {"content": "Unable to read the website."}
                return
            
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
                yield {"content": "Website content could not be extracted."}
                return

            chunker = Schunker()
            chunks = []
            for section in website_sections:
                section_chunks = chunker.build_chunks(section)
                chunks.extend(section_chunks)

            if not chunks:
                yield {"content": "Unable to process website content."}
                return

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
            top_chunks = [scores[0][1]]

            for score, text in scores[1:]:
                similarity_ratio = score / top_score
                if similarity_ratio > 0.75:
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
            meta_payload = {
                "query": query,
                "rewritten_query": query,
                "tool": "web_search",
                "model": model,
                "confidence_score": compute_confidence(tool="web_search"),
                "source": "web_search"
            }
            yield {"meta": meta_payload}

            accumulated = []
            from app.services.ai.llm_utils import safe_llm_call_stream
            async for chunk in safe_llm_call_stream(final_prompt, model=model):
                t = chunk.get("content", "")
                if t:
                    accumulated.append(t)
                    yield {"content": t}

            cleaned = self.support.hallucination_guard("".join(accumulated).strip(), context)
            formatted = self.support.format_for_chatgpt_style(cleaned)

            yield {"content": "\n\nFollow-up question:\n"}
            async for chunk in self.support.add_followup_stream(query, formatted, model=model):
                yield chunk
            return

        # Fetch conversation history if session_id is provided
        history_messages = []
        if session_id:
            try:
                from app.models.conversation import ChatMessage
                import uuid
                sess_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
                history_messages = (
                    db.query(ChatMessage)
                    .filter(ChatMessage.session_id == sess_uuid)
                    .order_by(ChatMessage.created_at.desc())
                    .limit(6)
                    .all()
                )
                history_messages = list(reversed(history_messages))
            except Exception as e:
                logger.error(f"Failed to fetch conversation history for session {session_id}: {e}")

        # Rewrite
        import time
        t_start = time.perf_counter()
        yield {"status": "rewriting"}
        rewritten_query = await self.mcp.analyze_and_rewrite(query, history=history_messages, model=model)
        logger.info(rewritten_query)
        t_rewrite = time.perf_counter() - t_start
        logger.info(f"[Profiler] Rewrite Query: {t_rewrite*1000:.2f} ms")

        # Decide tool
        yield {"status": "tool_deciding"}
        t_tool_start = time.perf_counter()
        logger.info("[DEBUG A] Starting tool decision. rewritten_query: '%s', model: '%s', source: '%s'", rewritten_query, model, source)
        if source and source not in ("internal_web", "internal", ""):
            tool = source
        else:
            tool = await self.mcp.decide_tool(rewritten_query, model=model)
        t_tool = time.perf_counter() - t_tool_start
        logger.info(f"[Profiler] Tool Decision: {t_tool*1000:.2f} ms")
        logger.info("[DEBUG B] Tool decision completed. tool: '%s'", tool)
        
        learning_profile = get_learning_profile(workspace_id=str(workspace_id))
        logger.info("[DEBUG C] Fetched learning profile. profile: %s", learning_profile)

        # RULE BASED TOOL OVERRIDE
        rules = learning_profile.get("tool_rules", [])
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

        # llm learning
        memory = learning_profile.get("memory", {}) if learning_profile else {}
        tool_insights = memory.get("tool_insights", {})
        if tool_insights:
            best_tool = max(tool_insights, key=lambda t: tool_insights[t]["positive"])
            current_score = tool_insights.get(tool, {}).get("positive", 0)
            best_score = tool_insights.get(best_tool, {}).get("positive", 0)
            if best_score > current_score + 2:
                tool = best_tool

        NEVER_OVERRIDE = {"vector_db", "calculator", "direct_answer", "direct_storage"}
        if tool_insights and tool not in NEVER_OVERRIDE:
            eligible = {
                t: v for t, v in tool_insights.items() 
                if t not in NEVER_OVERRIDE
            }
            if eligible:
                best_tool = max(eligible, key=lambda t: eligible[t]["positive"])
                current_score = tool_insights.get(tool, {}).get("positive", 0)
                best_score = eligible.get(best_tool, {}).get("positive", 0)
                if best_score > current_score + 2:
                    tool = best_tool

        # Reinforcement Hook
        engine = ReinforcementEngine(db, workspace_id=workspace_id)
        adjusted = engine.adjust_pipeline(
            query=query,
            rewritten_query=rewritten_query,
            tool=tool
        )
        logger.info("[DEBUG D] ReinforcementEngine adjust_pipeline completed. adjusted: %s", adjusted)
        rewritten_query = adjusted["rewritten_query"]
        tool = adjusted["tool"]

        if source and source not in ("internal_web", "internal", ""):
            tool = source

        # Tool execution
        if tool == "vector_db":
            yield {"status": "retrieving"}
            t_retrieval_start = time.perf_counter()
            final_entry_ids = entry_ids if entry_ids is not None else ([document_id] if document_id else None)
            result = await self.iterative_retrieval(db, workspace_id, rewritten_query, model=model, entry_ids=final_entry_ids, collection=collection)
            context = result.get("context", "")
            retrieved_docs = result.get("docs", [])
            t_retrieval = time.perf_counter() - t_retrieval_start
            logger.info(f"[Profiler] Vector DB Retrieval: {t_retrieval*1000:.2f} ms")

            if not context or not context.strip():
                meta_payload = {
                    "query": query,
                    "rewritten_query": rewritten_query,
                    "tool": tool,
                    "model": model,
                    "confidence_score": 0.2,
                    "source": tool
                }
                yield {"meta": meta_payload}
                yield {"content": "The requested information is not available in the current knowledge base. Please upload relevant documents to proceed."}
                return

            yield {"status": "synthesizing"}
            t_synthesis_start = time.perf_counter()
            synthesized_info = await self.support.synthesize_information(query, context, model=model)
            t_synthesis = time.perf_counter() - t_synthesis_start
            logger.info(f"[Profiler] Context Synthesis: {t_synthesis*1000:.2f} ms")
            if not synthesized_info or not synthesized_info.strip():
                meta_payload = {
                    "query": query,
                    "rewritten_query": rewritten_query,
                    "tool": tool,
                    "model": model,
                    "confidence_score": 0.3,
                    "source": tool
                }
                yield {"meta": meta_payload}
                yield {"content": "The requested information is not available in the current knowledge base."}
                return

            confidence = compute_confidence(
                tool="vector_db",
                retrieved_docs=retrieved_docs,
                answer="Verification answer placeholder",
                context=context
            )
            meta_payload = {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool,
                "model": model,
                "confidence_score": confidence,
                "source": tool
            }
            yield {"meta": meta_payload}

            async for chunk in self.support.generate_final_output_stream(query, synthesized_info, model=model):
                yield chunk
            return

        elif tool == "web_search":
            yield {"status": "searching"}
            t_search_start = time.perf_counter()
            web_data = self.tools.web_search(rewritten_query)
            context = web_data.get("context", "")
            sources = web_data.get("sources", [])
            for s in sources:
                domain = urlparse(s).netloc.replace("www.", "")
                website_names.append(domain)
            t_search = time.perf_counter() - t_search_start
            logger.info(f"[Profiler] Web Search Execution: {t_search*1000:.2f} ms")

            if not context.strip():
                meta_payload = {
                    "query": query,
                    "rewritten_query": rewritten_query,
                    "tool": tool,
                    "model": model,
                    "confidence_score": 0.3,
                    "source": tool
                }
                yield {"meta": meta_payload}
                yield {"content": "Unable to retrieve relevant information from the internet."}
                return

            good_queries = []
            if learning_profile:
                good_queries = learning_profile.get("memory", {}).get("good_queries", [])[:3]

            extra_context = ""
            if good_queries:
                examples = "\n".join([f"- {q}" for q in good_queries])
                extra_context = f"\n\nGood examples:\n{examples}"

            improvements = learning_profile.get("prompt_improvements", {})
            extra_rules = "\n".join(improvements.get("answer_generation_prompt", []))

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
            confidence = compute_confidence(
                tool="web_search",
                answer="Verification web search answer",
                context=context
            )
            meta_payload = {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool,
                "model": model,
                "confidence_score": confidence,
                "source": tool
            }
            yield {"status": "synthesizing"}
            yield {"meta": meta_payload}

            accumulated = []
            from app.services.ai.llm_utils import safe_llm_call_stream
            async for chunk in safe_llm_call_stream(final_prompt, model=model):
                t = chunk.get("content", "")
                if t:
                    accumulated.append(t)
                    yield {"content": t}

            final_answer = "".join(accumulated)
            source_text = "\n".join(f"• {site}" for site in website_names)
            final_answer_with_sources = f"{final_answer}\n\nSources:\n{source_text}"

            yield {"content": "\n\nFollow-up question:\n"}
            async for chunk in self.support.add_followup_stream(query, final_answer_with_sources, model=model):
                yield chunk
            return

        elif tool == "calculator":
            result = self.tools.calculator_tool(query)
            if not result or not result.strip():
                result = "Calculation error."
            confidence = compute_confidence(tool="calculator")
            meta_payload = {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool,
                "model": model,
                "confidence_score": confidence,
                "source": tool
            }
            yield {"meta": meta_payload}
            yield {"content": result}
            return

        elif tool == "direct_answer":
            response = (
                self.helpers.get_small_talk_response(rewritten_query)
                or self.helpers.get_small_talk_response(query)
                or "Hello! How can I help you today?"
            )
            confidence = compute_confidence(tool="direct_answer")
            meta_payload = {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool,
                "model": model,
                "confidence_score": confidence,
                "source": tool
            }
            yield {"meta": meta_payload}
            yield {"content": response}
            yield {"content": "\n\n"}
            async for chunk in self.support.add_followup_stream(query, response, model=model):
                yield chunk
            return

        elif tool == "direct_storage":
            email_data = await self.tools.email_storage_tool(db, workspace_id, query, model=model)
            if not email_data:
                email_data = "No email found."
            confidence = compute_confidence(tool="direct_storage")
            meta_payload = {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool,
                "model": model,
                "confidence_score": confidence,
                "source": tool
            }
            yield {"meta": meta_payload}
            yield {"content": email_data}
            yield {"content": "\n\n"}
            async for chunk in self.support.add_followup_stream(query, email_data, model=model):
                yield chunk
            return

        elif tool == "reasoning":
            confidence = compute_confidence(tool="reasoning")
            meta_payload = {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool,
                "model": model,
                "confidence_score": confidence,
                "source": tool
            }
            yield {"meta": meta_payload}

            yield {"status": "synthesizing"}
            accumulated = []
            async for chunk in run_reasoning_stream(query, model=model):
                t = chunk.get("content", "")
                if t:
                    accumulated.append(t)
                    yield {"content": t}

            yield {"content": "\n\n"}
            async for chunk in self.support.add_followup_stream(query, "".join(accumulated), model=model):
                yield chunk
            return

        else:
            meta_payload = {
                "query": query,
                "rewritten_query": query,
                "tool": "reasoning",
                "model": model,
                "confidence_score": 0.1,
                "source": "fallback"
            }
            yield {"meta": meta_payload}

            yield {"status": "synthesizing"}
            accumulated = []
            async for chunk in run_reasoning_stream(query, model=model):
                t = chunk.get("content", "")
                if t:
                    accumulated.append(t)
                    yield {"content": t}

            yield {"content": "\n\n"}
            async for chunk in self.support.add_followup_stream(query, "".join(accumulated), model=model):
                yield chunk
            return

    async def _agent_loop_internal(self, db, workspace_id, query, model="auto", source="internal_web", document_id=None, entry_ids=None, collection=None, session_id: Optional[str] = None):

        website_names = []  

        web_search_enabled = (source == "web_search")
        logger.info(f"DEBUG: web_search_enabled = {web_search_enabled}")

        fallback_triggered = False

        small_talk = None
        if not web_search_enabled:
            small_talk = self.helpers.get_small_talk_response(query)

        if small_talk:
            fallback_triggered = True
            logger.info(f"DEBUG: fallback_triggered = {fallback_triggered} (small talk)")
            confidence = compute_confidence(tool="direct_answer")
            response_with_followup = await self.support.add_followup(query, small_talk, model=model)
            return self.mcp.format_response(
                response_with_followup,
                query,
                query,               
                "direct_answer",     
                confidence,
                model=model,
            )

        start_url = self.helpers.extract_url(query)

        if start_url:
            logger.info("URL detected:", start_url)

            scraper = Webscrapper(start_url)
            single_page = bool(start_url)
            scraped_data = scraper.scrapper_choose(single_page)
            print(scraped_data)

            if not scraped_data or isinstance(scraped_data, str):
                return self.mcp.format_response("Unable to read the website.", query, model=model)
            
              
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
            response = await  safe_llm_call(final_prompt, model=model)

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
            logger.info(formatted)
            response = await self.support.add_followup(query, formatted, model=model)
            confidence = compute_confidence(tool="web_search")

            return self.mcp.format_response(
                response,
                query,
                query,
                "web_search",
                confidence,
                model=model,
            )
                    
        # Fetch conversation history if session_id is provided
        history_messages = []
        if session_id:
            try:
                from app.models.conversation import ChatMessage
                import uuid
                sess_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
                history_messages = (
                    db.query(ChatMessage)
                    .filter(ChatMessage.session_id == sess_uuid)
                    .order_by(ChatMessage.created_at.desc())
                    .limit(6)
                    .all()
                )
                history_messages = list(reversed(history_messages))
            except Exception as e:
                logger.error(f"Failed to fetch conversation history for session {session_id}: {e}")

        #Rewrite
        rewritten_query = await self.mcp.analyze_and_rewrite(query, history=history_messages, model=model)
        logger.info(rewritten_query)
        
        #Decide tool
        logger.info("[DEBUG A] Starting tool decision. rewritten_query: '%s', model: '%s', source: '%s'", rewritten_query, model, source)
        if source and source not in ("internal_web", "internal", ""):
            tool = source
        else:
            tool =  await self.mcp.decide_tool(rewritten_query, model=model)
        logger.info("[DEBUG B] Tool decision completed. tool: '%s'", tool)
        learning_profile = get_learning_profile(workspace_id=str(workspace_id))
        logger.info("[DEBUG C] Fetched learning profile. profile: %s", learning_profile)
        
        #RULE BASED TOOL OVERRIDE
        rules = learning_profile.get("tool_rules", [])

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
        memory = learning_profile.get("memory", {}) if learning_profile else {}
        good_queries = memory.get("good_queries", [])[:3]
        tool_insights = memory.get("tool_insights", {})

        if tool_insights:
            best_tool = max(tool_insights, key=lambda t: tool_insights[t]["positive"])

            current_score = tool_insights.get(tool, {}).get("positive", 0)
            best_score = tool_insights.get(best_tool, {}).get("positive", 0)

            #ADD CONTROL
            if best_score > current_score + 2:
               
                tool = best_tool
        NEVER_OVERRIDE = {"vector_db", "calculator", "direct_answer", "direct_storage"}
        if tool_insights and tool not in NEVER_OVERRIDE:
            eligible = {
                t: v for t, v in tool_insights.items() 
                if t not in NEVER_OVERRIDE
            }
            if eligible:
                best_tool = max(eligible, key=lambda t: eligible[t]["positive"])
                current_score = tool_insights.get(tool, {}).get("positive", 0)
                best_score = eligible.get(best_tool, {}).get("positive", 0)
                if best_score > current_score + 2:
                    tool = best_tool
        # Reinforcement Hook
        engine = ReinforcementEngine(db, workspace_id=workspace_id)

        adjusted = engine.adjust_pipeline(
            query=query,
            rewritten_query=rewritten_query,
            tool=tool
        )
        logger.info("[DEBUG D] ReinforcementEngine adjust_pipeline completed. adjusted: %s", adjusted)

        rewritten_query = adjusted["rewritten_query"]
        tool = adjusted["tool"]

        # Override tool if user explicitly selected a source
        if source and source not in ("internal_web", "internal", ""):
            tool = source


        #Tool execution
        if tool == "vector_db":

            
            final_entry_ids = entry_ids if entry_ids is not None else ([document_id] if document_id else None)
            result = await self.iterative_retrieval(db, workspace_id, rewritten_query, model=model, entry_ids=final_entry_ids, collection=collection)

            context = result.get("context", "")
            retrieved_docs = result.get("docs", [])

            if not context or not context.strip():
                return self.mcp.format_response(
                    "The requested information is not available in the current knowledge base. Please upload relevant documents to proceed.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.2,
                    model=model,
                )
            
            #Synthesize
            synthesized_info = await self.support.synthesize_information(query, context, model=model)

            if not synthesized_info or not synthesized_info.strip():
                return self.mcp.format_response(
                    "The requested information is not available in the current knowledge base.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.3,
                    model=model,
                )

            #Generate Final Output
            final_answer = await self.support.generate_final_output(query, synthesized_info, model=model)

            if not final_answer or not final_answer.strip():
                return self.mcp.format_response(
                    "The requested information is not available in the current knowledge base.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.3,
                    model=model,
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
                confidence,
                model=model,
            )

        elif tool == "web_search":

            web_data = self.tools.web_search(rewritten_query)

            context = web_data.get("context", "")
            sources = web_data.get("sources", [])
            search_results_count = len(sources)
            logger.info(f"DEBUG: search_results_count = {search_results_count}")

            for s in sources:
                domain = urlparse(s).netloc.replace("www.", "")
                website_names.append(domain)

            logger.info(f"WEB SEARCH CONTEXT: {context[:500]}")

            if not context.strip():
                fallback_triggered = True
                logger.info(f"DEBUG: fallback_triggered = {fallback_triggered} (web search returned empty context)")
                return self.mcp.format_response(
                    "Unable to retrieve relevant information from the internet.",
                    query,
                    rewritten_query,
                    tool,
                    confidence=0.3,
                    model=model,
                )
            good_queries = []

            if learning_profile:
                good_queries = learning_profile.get("memory", {}).get("good_queries", [])[:3]

            extra_context = ""

            if good_queries:
                examples = "\n".join([f"- {q}" for q in good_queries])
                extra_context = f"\n\nGood examples:\n{examples}"

            improvements = learning_profile.get("prompt_improvements", {})

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
            logger.info(f"DEBUG: final_context = {context}")
            logger.info(f"DEBUG: final_prompt = {final_prompt}")

            llm_response = await  safe_llm_call(final_prompt, model=model)
            final_answer = llm_response["content"]
            source_text = "\n".join(f"• {site}" for site in website_names)

            final_answer = f"""
            {final_answer}

            Sources:
            {source_text}
            """

            if not llm_response or not llm_response["content"].strip():
                return "The requested information is not available in the current knowledge base. Please upload relevant documents to proceed."

            res = await self.support.add_followup(query, final_answer, model=model)
            
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
                confidence,
                model=model,
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
                confidence,
                model=model,
            )

        elif tool == "direct_answer":
            fallback_triggered = True
            logger.info(f"DEBUG: fallback_triggered = {fallback_triggered} (direct_answer tool)")
            response = (
                self.helpers.get_small_talk_response(rewritten_query)
                or self.helpers.get_small_talk_response(query)
                or "Hello! How can I help you today?"
            )
            confidence = compute_confidence(tool="direct_answer")
            response_with_followup = await self.support.add_followup(query, response, model=model)
            return self.mcp.format_response(
                response_with_followup,
                query,
                rewritten_query,
                tool,
                confidence,
                model=model,
            )
            
        elif tool == "direct_storage":

            email_data = await self.tools.email_storage_tool(db, workspace_id, query, model=model)

            if not email_data:
                return self.mcp.format_response(
                    "No email found.",
                    query,
                    rewritten_query,
                    tool,
                    model=model,
                )

            response = await self.support.add_followup(query, email_data, model=model)
            
            confidence = compute_confidence(tool="direct_storage")

            return self.mcp.format_response(
                response,
                query,
                rewritten_query,
                tool,
                confidence,
                model=model,
            )
        
        elif tool == "reasoning":

            reasoning_output = await run_reasoning(query, model=model)

            if not reasoning_output or not reasoning_output.strip():
                return "Unable to generate reasoning-based answer."

            res = await self.support.add_followup(query, reasoning_output, model=model)
            confidence = compute_confidence(tool="reasoning")

            return self.mcp.format_response(
                res,
                query,
                rewritten_query,
                tool,
                confidence,
                model=model,
            )

        else:
            fallback_triggered = True
            logger.info(f"DEBUG: fallback_triggered = {fallback_triggered} (unrecognized tool fallback)")
            # Unrecognised tool — log and fall back to LLM reasoning so the
            # caller always gets a non-None answer and the UI is never blank.
            logger.warning(f"agent_loop: unrecognised tool '{tool}' for query: {query!r}")
            reasoning_output = await run_reasoning(query, model=model)
            if reasoning_output and reasoning_output.strip():
                res = await self.support.add_followup(query, reasoning_output, model=model)
                return self.mcp.format_response(
                    res, query, query, "reasoning", compute_confidence(tool="reasoning"), model=model
                )
            return self.mcp.format_response(
                "I'm not sure how to answer that. Could you rephrase your question?",
                query, query, "fallback", 0.1, model=model
            )
    async def delete_entry(
        self,
        db,
        workspace_id,
        entry_id
    ):

        try:

            self.vector_store.delete_by_parent(
                db=db,
                workspace_id=workspace_id,
                parent_id=entry_id
            )

            entry = db.query(BrainEntry).filter(
                BrainEntry.id == entry_id,
                BrainEntry.workspace_id == workspace_id
            ).first()

            if not entry:
                return False

            db.delete(entry)
            db.commit()

            return True

        except Exception as e:
            logging.error(f"Delete entry failed: {e}")
            db.rollback()
            return False
    def ingest_document(
        self,
        db,
        workspace_id,
        text,
        title,
        content_type,
        source=None,
        metadata=None,
        existing_entry_id=None,
        file_name=None,
        file_size=None,
        credits_charged=None,
        embedding_status=None
    ):

        return self.ingestion.ingest_document(
            db=db,
            workspace_id=workspace_id,
            text=text,
            title=title,
            content_type=content_type,
            source=source,
            metadata=metadata,
            existing_entry_id=existing_entry_id,
            file_name=file_name,
            file_size=file_size,
            credits_charged=credits_charged,
            embedding_status=embedding_status
        )
    



        #Iterative Retrieval Loop
    async def iterative_retrieval(self, db, workspace_id, query, max_iterations=2, model="auto", collection=None, entry_ids=None):

        current_query = query
        last_context = ""

        for i in range(max_iterations):

            #Retrieve
            result = await self.retrieval.retrieve_context_async(db, workspace_id, current_query, entry_ids=entry_ids, collection=collection)

            context = result.get("context", "")
            docs = result.get("docs", [])

            context = self.retrieval.strict_topic_filter(query, context)

            if not context or not context.strip():
                logger.warning("No context retrieved from vector DB")
                return {
                    "context": "",
                    "docs": []
                }

            last_context = context

            is_sufficient = await self.mcp.evaluate_context(query, context, model=model)

            if is_sufficient:
                logger.info(f"Context sufficient at iteration {i+1}")
                return {
                    "context": context,
                    "docs": docs
                }

            #Refine query
            current_query = await self.mcp.refine_query(current_query, context, model=model)

            if not current_query or not current_query.strip():
                logger.warning("Query refinement failed")
                break

        logger.warning("Max iterations reached, context insufficient")
        return {
            "context": last_context,
            "docs": []
        }
