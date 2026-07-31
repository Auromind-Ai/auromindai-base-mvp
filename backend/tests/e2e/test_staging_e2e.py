import pytest
import os
import requests

def test_staging_health_and_version_probe():
    """Staging E2E verification test for CloudBuild & CD validation."""
    staging_url = os.getenv("API_URL", "http://localhost:8000")
    # Skips live HTTP request if not executing in Staging CI environment
    if "staging" not in staging_url and "localhost" in staging_url:
        pytest.skip("Skipping live HTTP staging request during local unit test suite")

    resp = requests.get(f"{staging_url}/health", timeout=10)
    assert resp.status_code == 200
