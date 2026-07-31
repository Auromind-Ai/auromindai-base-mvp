import pytest

def test_health_check_endpoint(client):
    """Verify GET /health returns HTTP 200 OK for Docker/K8s liveness probes."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data or "healthy" in str(data).lower() or data.get("status") in ["ok", "healthy"]
