def test_root_endpoint(client):
    """
    Verifies that the API root endpoint responds with system info.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "CAMPON U" in data["message"]
    assert data["docs"] == "/docs"
    assert "/health" in data["health"]


def test_health_check_endpoint(client):
    """
    Verifies that the /api/v1/health probe functions properly and outputs
    required health attributes.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "CAMPON U" in data["app_name"]
    assert data["version"] == "1.0.0"
    assert "database" in data
    assert "database_message" in data
    assert "timestamp" in data


def test_direct_health_endpoint(client):
    """
    Verifies that the top-level /health route matches the API v1 health probe.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]


def test_standardized_404_error_handling(client):
    """
    Verifies that unhandled routes return the standardized error JSON schema.
    """
    response = client.get("/api/v1/unknown-endpoint-path")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "HTTP_404"
