import os

# 🔥 IMPORTANT: set your API key (or comment if not using LLM)
os.environ["GROQ_API_KEY"] = "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"

from app.services.inbox_agents.orchestration_layer import AgentOrchestration
from app.services.inbox_agents.config_service import ConfigService


def run_test(message, channel="web"):
    print("\n ===============================")
    print("TEST MESSAGE:", message)
    print("CHANNEL:", channel)
    print(" ================================\n")

    # INIT SYSTEM
    orchestrator = AgentOrchestration()

    # Inject config
    config_service = ConfigService()
    orchestrator.config_service = config_service
    orchestrator.mcp.config_service = config_service

    # TEST PAYLOAD
    payload = {
        "user_id": "test_user_123",
        "message": message,
        "workspace_id": "test_workspace_001"
    }

    # RUN PROCESS
    try:
        response = orchestrator.process_message(payload, channel)

        print("\n FINAL RESPONSE:", response)

        if not response:
            print(" ERROR: No response returned")

    except Exception as e:
        print(" SYSTEM CRASH:", str(e))


if __name__ == "__main__":

    # TEST CASES
    test_cases = [
        "hi",
        "hello",
        "how much this book",
        "I want to buy AI course",
        "price details please"
    ]

    for msg in test_cases:
        run_test(msg)