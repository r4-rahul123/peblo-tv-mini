import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_viewer_signup_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        email = f"user_{uuid.uuid4().hex[:8]}@peblo.tv"
        password = "secretpassword123"

        # 1. Sign Up
        signup_res = await ac.post(
            "/api/v1/auth/signup",
            json={
                "email": email,
                "password": password,
                "initial_name": "TestKid",
                "age_group": "5-8",
            },
        )
        assert signup_res.status_code == 201
        signup_data = signup_res.json()
        assert "access_token" in signup_data
        token = signup_data["access_token"]
        account = signup_data["account"]
        assert account["email"] == email
        assert len(account["profiles"]) == 1
        assert account["profiles"][0]["name"] == "TestKid"

        # 2. Duplicate Signup -> 400 Bad Request
        dup_res = await ac.post(
            "/api/v1/auth/signup",
            json={"email": email, "password": password},
        )
        assert dup_res.status_code == 400

        # 3. Login with correct password
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login_res.status_code == 200
        login_data = login_res.json()
        assert "access_token" in login_data

        # 4. Login with wrong password -> 401
        wrong_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "wrongpassword!"},
        )
        assert wrong_res.status_code == 401

        # 5. Get Current Account with Token
        me_res = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["email"] == email

        # 6. Add Profile
        prof_res = await ac.post(
            "/api/v1/auth/profiles",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "SecondKid", "age_group": "2-4"},
        )
        assert prof_res.status_code == 201
        prof_data = prof_res.json()
        assert prof_data["name"] == "SecondKid"
        new_prof_id = prof_data["id"]

        # 7. Delete Profile
        del_res = await ac.delete(
            f"/api/v1/auth/profiles/{new_prof_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert del_res.status_code == 204
