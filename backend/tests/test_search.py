from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_composed_search_filtering():
    with TestClient(app) as client:
        res = client.get(f"{settings.API_V1_STR}/catalog/search?q=Moti&language=hi")
        assert res.status_code == 200
        data = res.json()
        assert "results" in data
        assert "total" in data

