from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_editor_cannot_publish():
    settings.DEBUG = True
    with TestClient(app) as client:
        res = client.post(f"{settings.API_V1_STR}/admin/catalog/publish", headers={"X-User-Role": "editor"})
        assert res.status_code == 403
        assert "Admin privileges required" in res.text


def test_admin_can_trigger_publish():
    settings.DEBUG = True
    with TestClient(app) as client:
        res = client.post(f"{settings.API_V1_STR}/admin/catalog/publish", headers={"X-User-Role": "admin"})
        # 200 (Success) or 400 (Blocked with validation report), but NOT 403 Forbidden!
        assert res.status_code in [200, 400]

