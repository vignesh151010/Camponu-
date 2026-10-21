import pytest
import os
import sys

# Ensure backend root is on Python module path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.core.config import settings

# Configure testing environment
settings.ENVIRONMENT = "testing"

from app.main import app


@pytest.fixture(scope="session")
def client():
    """
    TestClient fixture for FastAPI endpoints testing.
    """
    with TestClient(app) as test_client:
        yield test_client
