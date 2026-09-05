import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_composed_search_filtering():
    with TestClient(app) as client:
        res = client.get("/catalog/search?q=Moti&language=hi")
        assert res.status_code == 200
        data = res.json()
        assert "results" in data
        assert "total" in data
