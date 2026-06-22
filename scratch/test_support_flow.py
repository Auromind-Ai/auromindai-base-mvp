import sys
import os
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Set mock env vars for pydantic settings validation
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/db"
os.environ["SECRET_KEY"] = "mock_secret_key"

# Mock dependencies before importing app structures to prevent DB connection errors if any
# We mock settings.DATABASE_URL or database engine just in case
from uuid import uuid4
from app.services.inbox_agents.support_agent import SupportAgent
from app.models.ai_action import SupportTicket

class MockLLM:
    def __init__(self):
        self.generate_json = MagicMock()

class MockMemory:
    def __init__(self):
        self.get_lead_data = MagicMock()
        self.update_lead_data = MagicMock()
        self.get_conversation_history = MagicMock()
        self.create_support_ticket = MagicMock()

async def run_tests():
    print("==================================================")
    print("RUNNING SUPPORT AGENT CONVERSATIONAL FLOW TESTS")
    print("==================================================")

    # 1. Test Ticket-in-progress check
    print("\n--- Test 1: Ticket-in-progress check ---")
    llm = MockLLM()
    memory = MockMemory()
    agent = SupportAgent(llm, memory)

    db_mock = MagicMock()
    open_ticket = SupportTicket(id=uuid4(), status="open")
    
    # We patch _get_open_ticket directly to return our open ticket
    agent._get_open_ticket = MagicMock(return_value=open_ticket)
    
    context = {
        "workspace_id": uuid4(),
        "conversation_id": uuid4(),
        "db": db_mock
    }
    
    result = await agent.handle("hi", context)
    print(f"Result response: {result['response']}")
    assert "already being processed" in result["response"]
    assert result["escalate"] is True
    assert result["close"] is True
    print("Test 1 Passed!")

    # 2. Test Name & Contact details collection
    print("\n--- Test 2: Name & Contact details collection (Greeting) ---")
    llm = MockLLM()
    memory = MockMemory()
    agent = SupportAgent(llm, memory)
    agent._get_open_ticket = MagicMock(return_value=None)
    
    # Lead starts empty
    lead_mock = MagicMock()
    lead_mock.custom_fields = {}
    memory.get_lead_data.return_value = lead_mock
    memory.get_conversation_history.return_value = []
    
    # Mock LLM output
    llm.generate_json.return_value = {
        "support_stage": "collecting_name",
        "collect": {
            "support_name": None,
            "support_contact": None,
            "support_problem": None
        },
        "feedback": None,
        "response": "Hi! To help you raise a support ticket, could you please tell me your name?"
    }
    
    result = await agent.handle("hello", context)
    print(f"Result response: {result['response']}")
    assert "please tell me your name" in result["response"]
    # Check that update_lead_data was called with new stage
    memory.update_lead_data.assert_called_with(
        workspace_id=context["workspace_id"],
        conversation_id=context["conversation_id"],
        data={
            "support_stage": "collecting_name",
            "support_name": "",
            "support_contact": "",
            "support_problem": "",
            "support_rag_solution": ""
        }
    )
    print("Test 2 Passed!")

    # 3. Test RAG lookup positive path (solution works)
    print("\n--- Test 3: RAG lookup positive path (Solution Found) ---")
    llm = MockLLM()
    memory = MockMemory()
    agent = SupportAgent(llm, memory)
    agent._get_open_ticket = MagicMock(return_value=None)
    
    # Lead has name and contact, but problem is empty. LLM will collect the problem.
    lead_mock = MagicMock()
    lead_mock.custom_fields = {
        "support_stage": "collecting_problem",
        "support_name": "John Doe",
        "support_contact": "john@example.com",
        "support_problem": ""
    }
    memory.get_lead_data.return_value = lead_mock
    
    llm.generate_json.return_value = {
        "support_stage": "collecting_problem",
        "collect": {
            "support_name": "John Doe",
            "support_contact": "john@example.com",
            "support_problem": "my app crashes on startup"
        },
        "feedback": None,
        "response": "Let me look that up for you."
    }
    
    # Mock RAG answer
    agent.query_rag = AsyncMock(return_value="Clear app cache to fix crash.")
    
    result = await agent.handle("my app crashes on startup", context)
    print(f"Result response: {result['response']}")
    assert "Clear app cache" in result["response"]
    assert "Did this resolve your issue?" in result["response"]
    
    # Verify stage updated to verifying_solution
    memory.update_lead_data.assert_called_with(
        workspace_id=context["workspace_id"],
        conversation_id=context["conversation_id"],
        data={
            "support_stage": "verifying_solution",
            "support_name": "John Doe",
            "support_contact": "john@example.com",
            "support_problem": "my app crashes on startup",
            "support_rag_solution": "Clear app cache to fix crash."
        }
    )
    print("Test 3 Passed!")

    # 4. Test RAG lookup negative path (no solution in RAG -> ticket created)
    print("\n--- Test 4: RAG lookup negative path (No Solution Found -> Create Ticket) ---")
    llm = MockLLM()
    memory = MockMemory()
    agent = SupportAgent(llm, memory)
    agent._get_open_ticket = MagicMock(return_value=None)
    
    lead_mock = MagicMock()
    lead_mock.custom_fields = {
        "support_stage": "collecting_problem",
        "support_name": "John Doe",
        "support_contact": "john@example.com",
        "support_problem": ""
    }
    memory.get_lead_data.return_value = lead_mock
    
    llm.generate_json.return_value = {
        "support_stage": "collecting_problem",
        "collect": {
            "support_name": "John Doe",
            "support_contact": "john@example.com",
            "support_problem": "unsupported device error"
        },
        "feedback": None,
        "response": "Let me look that up."
    }
    
    # RAG returns None
    agent.query_rag = AsyncMock(return_value=None)
    
    # Mock ticket creation
    ticket_id = uuid4()
    mock_ticket = SupportTicket(id=ticket_id, status="open")
    memory.create_support_ticket.return_value = mock_ticket
    
    result = await agent.handle("unsupported device error", context)
    print(f"Result response: {result['response']}")
    assert "created a support ticket" in result["response"]
    assert f"TKT-{str(ticket_id)[:8].upper()}" in result["response"]
    assert result["escalate"] is True
    assert result["close"] is True
    
    # Verify stage updated to escalated
    memory.update_lead_data.assert_called_with(
        workspace_id=context["workspace_id"],
        conversation_id=context["conversation_id"],
        data={
            "support_stage": "escalated",
            "support_name": "John Doe",
            "support_contact": "john@example.com",
            "support_problem": "unsupported device error",
            "support_rag_solution": ""
        }
    )
    print("Test 4 Passed!")

    # 5. Test verification feedback "yes" (fixed)
    print("\n--- Test 5: Verification feedback 'yes' (Fixed) ---")
    llm = MockLLM()
    memory = MockMemory()
    agent = SupportAgent(llm, memory)
    agent._get_open_ticket = MagicMock(return_value=None)
    
    lead_mock = MagicMock()
    lead_mock.custom_fields = {
        "support_stage": "verifying_solution",
        "support_name": "John Doe",
        "support_contact": "john@example.com",
        "support_problem": "my app crashes on startup",
        "support_rag_solution": "Clear app cache to fix crash."
    }
    memory.get_lead_data.return_value = lead_mock
    
    llm.generate_json.return_value = {
        "support_stage": "resolved",
        "collect": {},
        "feedback": "yes",
        "response": "Glad it's resolved!"
    }
    
    result = await agent.handle("yes it worked", context)
    print(f"Result response: {result['response']}")
    assert "resolve" in result["response"].lower() or "glad" in result["response"].lower()
    assert result["escalate"] is False
    assert result["close"] is True
    
    # Verify stage updated to resolved
    memory.update_lead_data.assert_called_with(
        workspace_id=context["workspace_id"],
        conversation_id=context["conversation_id"],
        data={
            "support_stage": "resolved",
            "support_name": "John Doe",
            "support_contact": "john@example.com",
            "support_problem": "my app crashes on startup",
            "support_rag_solution": "Clear app cache to fix crash."
        }
    )
    print("Test 5 Passed!")

    # 6. Test verification feedback "no" (not fixed -> create ticket)
    print("\n--- Test 6: Verification feedback 'no' (Not Fixed -> Create Ticket) ---")
    llm = MockLLM()
    memory = MockMemory()
    agent = SupportAgent(llm, memory)
    agent._get_open_ticket = MagicMock(return_value=None)
    
    lead_mock = MagicMock()
    lead_mock.custom_fields = {
        "support_stage": "verifying_solution",
        "support_name": "John Doe",
        "support_contact": "john@example.com",
        "support_problem": "my app crashes on startup",
        "support_rag_solution": "Clear app cache to fix crash."
    }
    memory.get_lead_data.return_value = lead_mock
    
    llm.generate_json.return_value = {
        "support_stage": "creating_ticket",
        "collect": {},
        "feedback": "no",
        "response": "I see. Let me create a ticket."
    }
    
    # Mock ticket creation
    ticket_id = uuid4()
    mock_ticket = SupportTicket(id=ticket_id, status="open")
    memory.create_support_ticket.return_value = mock_ticket
    
    result = await agent.handle("no still crashes", context)
    print(f"Result response: {result['response']}")
    assert "created a support ticket" in result["response"]
    assert f"TKT-{str(ticket_id)[:8].upper()}" in result["response"]
    assert result["escalate"] is True
    assert result["close"] is True
    
    # Verify stage updated to escalated
    memory.update_lead_data.assert_called_with(
        workspace_id=context["workspace_id"],
        conversation_id=context["conversation_id"],
        data={
            "support_stage": "escalated",
            "support_name": "John Doe",
            "support_contact": "john@example.com",
            "support_problem": "my app crashes on startup",
            "support_rag_solution": "Clear app cache to fix crash."
        }
    )
    print("Test 6 Passed!")

    print("\n==================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
