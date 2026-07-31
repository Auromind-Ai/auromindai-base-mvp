import logging
from ddgs import DDGS
from bs4 import BeautifulSoup
from app.config.set import setter
import httpx
import re
import numexpr as ne
from app.models.brain import EmailMessage , MCPDecision
import json
from app.services.ai.llm_utils import safe_llm_call
from app.utils.ssrf_protection import safe_httpx_sync_get, is_safe_url

logger = logging.getLogger(__name__)

class Toolslayer:
    def __init__(self):
        pass

    def web_search(self, query):

        try:

            results = []
            sources = []
            seen_domains = set()

            with DDGS() as ddgs:
                search_results = ddgs.text(query, max_results=setter.WEB_RESULTS)

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

                
                if not is_safe_url(url):
                    continue

                try:

                    with httpx.Client(timeout=8) as client:
                        page = safe_httpx_sync_get(
                            client,
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
        
    async def parse_email_query(self, query, model="auto"):

        prompt = f"""
        You are an email query understanding engine.

        Your task is to convert a user query into structured filters
        for searching emails stored in a database.

        Available filters:
        - priority (high, medium, low)
        - category (meeting, invoice, job, business, marketing, personal, spam, other)
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

        response = await safe_llm_call(prompt, model=model)

        cleaned = ""
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
                logger.info("No JSON found in response")
                return {}

            logger.info(f"Parsed filters: {filters}")

            return filters

        except Exception as e:

            logger.info("JSON parse error: %s", e)
            logger.info("Cleaned response: %s", cleaned)

            return {}

        
    def query_emails(self, db, workspace_id, filters):

        logger.info(f"Applying filters: {filters}")

        query = db.query(EmailMessage, MCPDecision).outerjoin(
            MCPDecision,
            EmailMessage.gmail_message_id == MCPDecision.message_id
        ).filter(
            EmailMessage.workspace_id == workspace_id
        )

        priority = filters.get("priority")
        if priority and str(priority).lower() not in ("null", "none", "any", "all"):
            if isinstance(priority, list):
                query = query.filter(MCPDecision.priority.in_(priority))
            else:
                query = query.filter(MCPDecision.priority == priority)

        sender = filters.get("sender")
        if sender and str(sender).lower() not in ("null", "none", "any", "all", "receive"):
            if isinstance(sender, list):
                valid_senders = [s for s in sender if str(s).lower() not in ("any", "all", "receive", "null", "none")]
                if valid_senders:
                    from sqlalchemy import or_
                    query = query.filter(or_(*(EmailMessage.sender.ilike(f"%{s}%") for s in valid_senders)))
            else:
                query = query.filter(EmailMessage.sender.ilike(f"%{sender}%"))

        category = filters.get("category")
        if category and str(category).lower() not in ("null", "none", "any", "all"):
            if isinstance(category, list):
                valid_categories = [c for c in category if str(c).lower() not in ("any", "all", "null", "none")]
                if len(valid_categories) > 0 and len(valid_categories) < 6:
                    query = query.filter(MCPDecision.category.in_(valid_categories))
            else:
                query = query.filter(MCPDecision.category == category)

        #Intent handling
        if filters.get("intent") == "latest":
            limit = 1
            logger.info("Intent detected: latest → returning 1 email")
        else:
            limit = 2

        results = query.order_by(
            EmailMessage.stored_at.desc()
        ).limit(limit).all()

        logger.info(f"Emails found: {len(results)}")

        return results

    async def generate_email_summary(self, subject, body, model="auto"):

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

        response = await safe_llm_call(prompt, model=model)

        return response["content"].strip()
    
    async def build_email_response(self, db, results, model="auto"):
        logger.info(f"Building response for emails: {len(results)}")

        response = ""

        for email, r in results:
            if not email:
                continue

            priority = r.priority if r else "medium"
            category = r.category if r else "other"
            summary = r.summary if r else None

            if not summary or "summary not available" in summary.lower():

                summary = await self.generate_email_summary(
                    email.subject,
                    email.body,
                    model=model,
                )

                # store generated summary for future
                if r:
                    r.summary = summary
                    db.commit()

            response += f"""
            Sender: {email.sender}

            Subject: {email.subject}

            Priority: {priority}

            Category: {category}

            Summary:
            {summary}

            -------------
            """
        logger.info("Final response built")
        return response
            
    async def email_storage_tool(self, db, workspace_id, query, model="auto"):

        filters = await self.parse_email_query(query, model=model)

        results = self.query_emails(db, workspace_id, filters)

        if not results:
            return "No emails found."

        return await self.build_email_response(db, results, model=model)
