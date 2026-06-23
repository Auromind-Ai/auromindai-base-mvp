import logging
import re
import asyncio
import threading

class GuardrailsService:
    _sync_loop = None
    _sync_loop_thread = None
    _sync_loop_lock = threading.Lock()

    def __init__(self, llm=None, nemo_guard=None):
       
        self.logger = logging.getLogger("guardrails_service")

        self.nemo_guard = nemo_guard
        if self.nemo_guard:
            self.logger.info("NeMo guardrails enabled")
        else:
            self.logger.warning("NeMo guardrails not configured")

        self.initialized = True

        self.logger.info("GuardrailsService ready")

    @classmethod
    def _ensure_sync_loop(cls):
        with cls._sync_loop_lock:
            if cls._sync_loop and cls._sync_loop.is_running():
                return cls._sync_loop

            loop = asyncio.new_event_loop()

            def _run_loop():
                asyncio.set_event_loop(loop)
                loop.run_forever()

            thread = threading.Thread(target=_run_loop, name="guardrails-sync-loop", daemon=True)
            thread.start()
            cls._sync_loop = loop
            cls._sync_loop_thread = thread
            return cls._sync_loop

    def _run_sync(self, coroutine):
        loop = self._ensure_sync_loop()
        future = asyncio.run_coroutine_threadsafe(coroutine, loop)
        return future.result()

    # def secure_pipeline_sync(self, query: str, user_role: str = "user") -> dict:
    #     return self._run_sync(self.secure_pipeline(query, user_role=user_role))

    # def secure_response_sync(self, response: str) -> str:
    #     return self._run_sync(self.secure_response(response))


    # INPUT GUARD LAYER
    def sanitize_input(self, query: str) -> str:

        if not query:
            self.logger.warning("Empty query received")
            return ""

        cleaned = query.strip()
        cleaned = " ".join(cleaned.split())

        self.logger.debug(f"Sanitized query: {cleaned}")

        return cleaned


    def validate_input(self, query: str) -> bool:
        #Validate user input against basic safety and sanity checks

        if not query or not query.strip():
            self.logger.warning("Validation failed: empty query")
            return False

        if len(query) > 2000:
            self.logger.warning("Validation failed: query too long")
            return False

        # Detect repeated spam patterns (e.g., "aaaaaa", "!!!!!")
        if len(set(query)) <= 3 and len(query) > 20:
            self.logger.warning("Validation failed: low-entropy / spam query")
            return False

        self.logger.debug("Input validation passed")
        return True


    def detect_prompt_injection(self, query: str) -> bool:
        #Detect common prompt injection patterns.

        if not query:
            return False

        patterns = [
            r"ignore\s+(all\s+)?previous\s+instructions",
            r"disregard\s+(all\s+)?rules",
            r"reveal\s+(the\s+)?(system\s+)?prompt",
            r"show\s+(hidden|internal)\s+instructions",
            r"act\s+as\s+(an?\s+)?(admin|developer|system)",
            r"bypass\s+(security|safety|filters)",
            r"jailbreak",
            r"simulate\s+(developer|root|system)\s+mode",
            r"you\s+are\s+no\s+longer\s+bound\s+by",
        ]

        q = query.lower()

        for pattern in patterns:
            if re.search(pattern, q):
                self.logger.warning(f"Prompt injection detected: pattern='{pattern}'")
                return True

        self.logger.debug("No prompt injection detected")
        return False


    def check_illegal_or_harmful(self, query: str) -> bool:
        #Detect harmful or illegal intent in user input.

        if not query:
            return False

        q = query.lower()

        keywords = [
            "hack", "hacking", "exploit", "bypass security", "sql injection",
            "ddos", "malware", "ransomware", "phishing",
            "steal data", "password cracking", "brute force",
            "make bomb", "build weapon", "illegal activity",
            "drugs", "buy drugs", "sell drugs",
            "how to kill", "harm someone", "illegal"
        ]

        for word in keywords:
            if re.search(rf"\b{re.escape(word)}\b", q):
                self.logger.warning(f"Harmful content detected: keyword='{word}'")
                return True

        self.logger.debug("No harmful content detected")
        return False


    def input_guard(self, query: str) -> str:
        #Run full input guard pipeline and return safe query or raise exception.

        self.logger.info("Input guard started")

        cleaned_query = self.sanitize_input(query)
        if self.detect_code_injection(cleaned_query):
            raise PermissionError("Code injection detected")

        if not self.validate_input(cleaned_query):
            self.logger.error("Input validation failed")
            raise ValueError("Invalid input")

        if self.detect_prompt_injection(cleaned_query):
            self.logger.warning("Prompt injection detected")
            raise PermissionError("Suspicious query detected")

        if self.check_illegal_or_harmful(cleaned_query):
            self.logger.warning("Harmful content detected")
            raise PermissionError("Unsafe query detected")

        self.logger.info("Input guard passed")

        return cleaned_query

    # RAG CONTEXT SECURITY
    def filter_sensitive_context(self, context: str) -> str:
        #Remove sensitive patterns from retrieved context

        if not context:
            self.logger.warning("Empty context received for filtering")
            return ""

        filtered = context

        patterns = [
            r"sk-[a-zA-Z0-9]{20,}",                    # API keys
            r"api[_-]?key\s*[:=]\s*\S+",               # api_key patterns
            r"password\s*[:=]\s*\S+",                  # password fields
            r"secret\s*[:=]\s*\S+",                    # secrets
            r"token\s*[:=]\s*\S+",                     # tokens
            r"Bearer\s+[a-zA-Z0-9\-_\.]+",             # auth headers
            r"-----BEGIN.*PRIVATE KEY-----.*?-----END.*PRIVATE KEY-----",  # private keys
        ]

        for pattern in patterns:
            filtered = re.sub(pattern, "[REDACTED]", filtered, flags=re.IGNORECASE | re.DOTALL)

        if filtered != context:
            self.logger.warning("Sensitive data detected and redacted from context")
        else:
            self.logger.debug("No sensitive data found in context")

        return filtered
    
    def detect_code_injection(self, query: str) -> bool:
        patterns = [
            r"os\.(remove|system)",
            r"rm\s+-rf",
            r"__import__\(",
            r"\beval\(",
            r"\bexec\(",  
            r"subprocess\.",
            r"open\(",
            r"\.\./",
            r"\.\.\\",
            r"drop\s+table",
            r"select\s+\*",
        ]

        q = query.lower()

        for pattern in patterns:
            if re.search(pattern, q):
                self.logger.warning(f"Code injection detected: {pattern}")
                return True

        return False

    def validate_context_relevance(self, query: str, context: str) -> bool:
        """Check if retrieved context is relevant to the user query."""

        if not query or not context:
            self.logger.warning("Relevance check failed: empty query or context")
            return False

        query_terms = set(query.lower().split())
        context_lower = context.lower()

        match_count = sum(1 for term in query_terms if term in context_lower)

        relevance_score = match_count / max(len(query_terms), 1)

        self.logger.debug(f"Context relevance score: {relevance_score:.2f}")

        if relevance_score < 0.2:
            self.logger.warning("Context deemed not relevant to query")
            return False

        self.logger.debug("Context relevance validated")
        return True

    # TOOL ACCESS CONTROL
    def authorize_tool_access(self, query: str, tool_name: str, user_role: str) -> bool:
        """Authorize access to tools based on role and query intent."""

        if not tool_name:
            self.logger.warning("Tool authorization failed: missing tool name")
            return False

        role = (user_role or "user").lower()
        q = (query or "").lower()

        restricted_tools = {"database"}
        sensitive_patterns = [ "dump", "full database", "all records"]

        if tool_name in restricted_tools and role != "admin":
            self.logger.warning(f"Unauthorized access attempt: tool='{tool_name}', role='{role}'")
            return False

        for pattern in sensitive_patterns:
            if pattern in q and role != "admin":
                self.logger.warning(f"Sensitive query blocked: pattern='{pattern}', role='{role}'")
                return False

        self.logger.debug(f"Tool access granted: tool='{tool_name}', role='{role}'")
        return True


    def detect_sensitive_queries(self, query: str) -> bool:
        """Detect attempts to extract sensitive or restricted data."""

        if not query:
            return False

        q = query.lower()

        patterns = [
            "Show all data from database",
            "dump database",
            "full database",
            "all records",
            "export data",
            "give api key",
            "api keys",
            "access token",
            "password list",
            "user credentials",
            "private data",
            "internal data",
            "system prompt",
            "hidden instructions"
        ]

        for pattern in patterns:
            if pattern in q:
                self.logger.warning(f"Sensitive query detected: pattern='{pattern}'")
                return True

        self.logger.debug("No sensitive query detected")
        return False

    # OUTPUT GUARD LAYER
    def sanitize_output(self, response: str) -> str:

        if not response:
            return ""

        cleaned = response.strip()

        # Remove only unsafe hidden tokens
        patterns = [
            r"<\|.*?\|>",
        ]

        for pattern in patterns:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE | re.DOTALL)

        return cleaned


    def detect_sensitive_output(self, response: str) -> bool:
        """Detect presence of sensitive data patterns in output."""

        if not response:
            return False

        patterns = [
            r"sk-[a-zA-Z0-9]{20,}",                         # API keys (OpenAI style)
            r"api[_-]?key\s*[:=]\s*\S+",                    # api_key fields
            r"password\s*[:=]\s*\S+",                       # passwords
            r"secret\s*[:=]\s*\S+",                         # secrets
            r"token\s*[:=]\s*\S+",                          # tokens
            r"Bearer\s+[a-zA-Z0-9\-_\.]+",                  # auth headers
            r"-----BEGIN.*PRIVATE KEY-----.*?-----END.*PRIVATE KEY-----",  # private keys
        ]

        for pattern in patterns:
            if re.search(pattern, response, flags=re.IGNORECASE | re.DOTALL):
                self.logger.warning(f"Sensitive output detected: pattern='{pattern}'")
                return True

        self.logger.debug("No sensitive data detected in output")
        return False


    def output_guard(self, response: str) -> str:
       
        self.logger.info("Output guard started")

        cleaned = self.sanitize_output(response)

        if self.detect_sensitive_output(cleaned):
            self.logger.warning("Sensitive content detected in output")
            return "Response blocked due to sensitive content"

        self.logger.info("Output guard passed")

        return cleaned



    async def secure_pipeline(self, query: str, user_role: str = "user") -> dict:
      
        self.logger.info("Secure pipeline started")

        try:
            # Input guard
            safe_query = self.input_guard(query)

            # Sensitive query check
            if self.detect_sensitive_queries(safe_query):
                self.logger.warning("Sensitive query blocked")
                return {
                    "status": "blocked",
                    "safe_query": None,
                    "message": "⚠️ Sensitive request not allowed"
                }

            self.logger.info("Secure pipeline passed")

            return {
                "status": "allowed",
                "safe_query": safe_query,
                "message": None
            }

        except Exception as e:
            self.logger.error(f"Secure pipeline blocked query: {str(e)}")
            return {
                "status": "blocked",
                "safe_query": None,
                "message": str(e)
            }


    async def secure_response(self, response: str) -> str:
       
        self.logger.info("Secure response pipeline started")

        try:
            # Output guard
            safe_response = self.output_guard(response)

            self.logger.info("Secure response pipeline passed")

            return safe_response

        except Exception as e:
            self.logger.error(f"Secure response failed: {str(e)}")
            return "⚠️ Unable to safely generate response"
