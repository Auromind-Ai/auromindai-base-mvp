import asyncio
import os
import sys

# Set up environment variables for app configuration
os.environ.setdefault("SECRET_KEY", "change_me_locally")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

import pytest
from app.database import SessionLocal
from app.services.agentic_rag.rag_service import get_rag_service

@pytest.mark.skip(reason="Manual integration test requiring live database and workspace ID")
@pytest.mark.anyio
async def test_reasoning_bypass():
    orchestration = get_rag_service()
    db = SessionLocal()
    workspace_id = "02ef8c46-b0c0-459e-b574-44a770de39d6"
    
    # Test gibberish query
    query = "hrtjtykyu"
    print(f"Sending gibberish query to agent_loop: '{query}'")
    
    # Measure execution time and check output
    import time
    start = time.perf_counter()
    
    # Execute non-stream agent loop
    res = await orchestration.agent_loop(
        db=db,
        workspace_id=workspace_id,
        query=query,
        model="auto"
    )
    
    duration = time.perf_counter() - start
    print(f"\nResponse received in {duration:.3f}s:")
    print("-" * 50)
    print(res.get("response"))
    print("-" * 50)
    
    db.close()

if __name__ == "__main__":
    asyncio.run(test_reasoning_bypass())
