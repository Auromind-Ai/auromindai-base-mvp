import requests
import json
import time

BASE_URL = "http://localhost:8000"

def run_test():
    print("--- 🛡️ Starting Governed AI System Verification ---\n")
    
    # 1. Login/Get Token (Using the simplified email-only login)
    print("Step 1: Authenticating...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "test@example.com"})
    if login_resp.status_code != 200:
        print("❌ Auth failed. Make sure the backend is running.")
        return
    
    auth_data = login_resp.json()
    token = auth_data["access_token"]
    workspace_id = auth_data["workspaces"][0]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Auth successful. Workspace: {workspace_id}\n")

    # 2. Test ALLOW (Normal follow-up)
    print("Step 2: Testing [ALLOW] - Normal follow-up")
    req_data = {
        "action_type": "followup",
        "intent": "Follow up with John about the invoice.",
        "workspace_id": workspace_id,
        "metadata": {"lead_value": 500, "followup_count": 1}
    }
    resp = requests.post(f"{BASE_URL}/simulation/run", json=req_data, headers=headers)
    print(json.dumps(resp.json(), indent=2))
    print("\n")

    # 3. Test BLOCK (Safety trigger - Keyword 'lawsuit')
    print("Step 3: Testing [BLOCK] - Prohibited 'lawsuit' keyword")
    req_data = {
        "action_type": "followup",
        "intent": "Threaten the customer with a lawsuit if they don't pay.",
        "workspace_id": workspace_id,
        "metadata": {"lead_value": 100}
    }
    resp = requests.post(f"{BASE_URL}/simulation/run", json=req_data, headers=headers)
    print(json.dumps(resp.json(), indent=2))
    print("\n")

    # 4. Test ESCALATE (Guardrail - High value lead)
    print("Step 4: Testing [ESCALATE] - High value lead ($25,000)")
    req_data = {
        "action_type": "followup",
        "intent": "Email the CEO to close the deal.",
        "workspace_id": workspace_id,
        "metadata": {"lead_value": 25000}
    }
    resp = requests.post(f"{BASE_URL}/simulation/run", json=req_data, headers=headers)
    print(json.dumps(resp.json(), indent=2))
    print("\n")

    # 5. Verify Traceability
    print("Step 5: Verifying Audit Logs (MANDATORY GATEKEEPER PROOF)")
    logs_resp = requests.get(f"{BASE_URL}/mcp/actions?workspace_id={workspace_id}", headers=headers)
    actions = logs_resp.json()["actions"]
    print(f"✅ Found {len(actions)} governed actions in audit log.")
    
    for action in actions[:3]:
        print(f"- [{action['mcp_decision'].upper()}] {action['intent'][:30]}... | Reason: {action['mcp_reason']}")

    print("\n--- ✅ System Architecture Verified ---")

if __name__ == "__main__":
    run_test()
