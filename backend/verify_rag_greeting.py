import sys
import os
import asyncio

# Load env
from dotenv import load_dotenv
load_dotenv(dotenv_path=r"/app/.env")

sys.path.append(r"/app")

from app.database import SessionLocal
from app.models.workspace import Workspace
from app.services.agentic_rag.orchestrator_layer import OrchestratorLayer
from app.services.agentic_rag.rag_service import get_rag_service

async def run_test():
    db = SessionLocal()
    try:
        ws = db.query(Workspace).first()
        if not ws:
            print("Workspace not found")
            return

        rag = get_rag_service()
        
        print("Testing RAG execution with greeting 'hi'...")
        res = await rag.agent_loop(
            db=db,
            workspace_id=str(ws.id),
            query="hi",
            source="vector_db",
            collection="sales",
            bypass_billing=True
        )
        
        print("RAG Response keys:", res.keys())
        print(f"RAG Response Answer: {repr(res.get('answer'))}")
        
        assert res.get("answer") == "", f"Expected empty answer, but got: {repr(res.get('answer'))}"
        print("-> SUCCESS: RAG returned empty answer for small talk greeting!")

    except Exception as e:
        print("Test failed:", e)
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_test())
