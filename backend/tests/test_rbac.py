from fastapi.testclient import TestClient

from app.main import app


def test_editor_cannot_publish():
    with TestClient(app) as client:
        res = client.post("/admin/catalog/publish", headers={"X-User-Role": "editor"})
        assert res.status_code == 403
        assert "Admin privileges required" in res.text


def test_admin_can_trigger_publish():
    with TestClient(app) as client:
        res = client.post("/admin/catalog/publish", headers={"X-User-Role": "admin"})
        # 200 (Success) or 400 (Blocked with validation report), but NOT 403 Forbidden!
        assert res.status_code in [200, 400]
