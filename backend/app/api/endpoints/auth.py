from fastapi import APIRouter, HTTPException, Query
from app.core.security import create_access_token

router = APIRouter()

@router.post("/token")
async def get_token(role: str = Query("admin", pattern="^(admin|editor)$")):
    """Quick role-based JWT token generator for testing and CMS UI."""
    username = f"{role}@mypeblo.com"
    token = create_access_token(subject=username, role=role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "username": username
    }
