import os
import pytest
import requests

API_URL = os.environ.get("API_URL", "https://orbion-api-staging-900605000401.asia-south1.run.app")
TEST_API_KEY = os.environ.get("TEST_API_KEY", "test_key_123")

def test_health():
    response = requests.get(f"{API_URL}/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.json() == {"status": "healthy"}

def test_dashboard_overview():
    headers = {"Authorization": f"Bearer {TEST_API_KEY}"}
    response = requests.get(f"{API_URL}/dashboard/overview?start_date=2026-06-01&end_date=2026-07-01", headers=headers)
    assert response.status_code not in [401, 500], f"Endpoint failed with {response.status_code}"

def test_brain_stats():
    headers = {"Authorization": f"Bearer {TEST_API_KEY}"}
    response = requests.get(f"{API_URL}/brain/stats", headers=headers)
    assert response.status_code not in [401, 500], f"Endpoint failed with {response.status_code}"

def test_auth_workspaces():
    headers = {"Authorization": f"Bearer {TEST_API_KEY}"}
    response = requests.get(f"{API_URL}/auth/workspaces", headers=headers)
    assert response.status_code == 200, f"Endpoint failed with {response.status_code}"
    assert isinstance(response.json(), list)
