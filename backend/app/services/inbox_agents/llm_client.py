import json
from app.core.logger import logger
from app.services.ai.execution_service import AIExecutionService, AIFeatureRegistry, current_execution_context

class LLMClient:

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self.model = model
        # Logger
        self.logger = logger
        self.logger.info("LLMClient initialized with centralized AIExecutionService")

    # RAW COMPLETION
    async def generate(self, prompt, temperature=0.2, max_tokens=1024, retries=2, response_format=None):
        ctx = current_execution_context.get()
        user_id = ctx.user_id if ctx else "system"
        feature_key = ctx.feature_key if ctx else AIFeatureRegistry.AGENT

        if not ctx:
            from app.database import SessionLocal
            db = SessionLocal()
            try:
                result = await AIExecutionService.execute(
                    db=db,
                    workspace_id="system_workspace",
                    user_id=user_id,
                    feature_key=feature_key,
                    prompt=prompt,
                    model=self.model,
                    bypass_billing=True
                )
            finally:
                db.close()
        else:
            result = await AIExecutionService.execute(
                db=None,
                workspace_id=ctx.workspace_id,
                user_id=user_id,
                feature_key=feature_key,
                prompt=prompt,
                model=self.model
            )

        return result.get("text", "")

    # JSON GENERATION
    async def generate_json(self, prompt, retries=2):
        try:
            structured_prompt = f"""
            {prompt}

            IMPORTANT:
            - Return ONLY valid JSON
            - No extra text
            """

            for attempt in range(retries + 1):
                text = await self.generate(structured_prompt, response_format={"type": "json_object"})

                if not text:
                    continue

                cleaned_text = text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                elif cleaned_text.startswith("```"):
                    cleaned_text = cleaned_text[3:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                cleaned_text = cleaned_text.strip()

                first_brace = cleaned_text.find('{')
                last_brace = cleaned_text.rfind('}')
                if first_brace != -1 and last_brace != -1 and last_brace >= first_brace:
                    cleaned_text = cleaned_text[first_brace:last_brace+1]

                try:
                    return json.loads(cleaned_text)
                except json.JSONDecodeError:
                    self.logger.warning(
                        f"JSON parse failed (attempt {attempt})",
                        extra={"output": text}
                    )

            return {}

        except Exception as e:
            self.logger.error("LLM JSON error", exc_info=True)
            return {}

    # TEXT GENERATION
    async def generate_text(self, prompt):
        try:
            return await self.generate(prompt)
        except Exception as e:
            self.logger.error("LLM text error", exc_info=True)
            return ""

    # STREAM 
    async def generate_stream(self, prompt):
        ctx = current_execution_context.get()
        user_id = ctx.user_id if ctx else "system"
        feature_key = ctx.feature_key if ctx else AIFeatureRegistry.AGENT
        
        if not ctx:
            from app.database import SessionLocal
            db = SessionLocal()
            try:
                async for chunk in AIExecutionService.execute_stream(
                    db=db,
                    workspace_id="system_workspace",
                    user_id=user_id,
                    feature_key=feature_key,
                    prompt=prompt,
                    model=self.model,
                    bypass_billing=True
                ):
                    yield chunk.get("content", "")
            finally:
                db.close()
        else:
            async for chunk in AIExecutionService.execute_stream(
                db=None,
                workspace_id=ctx.workspace_id,
                user_id=user_id,
                feature_key=feature_key,
                prompt=prompt,
                model=self.model
            ):
                yield chunk.get("content", "")