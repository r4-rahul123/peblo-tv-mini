from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from app.core.security import create_access_token

router = APIRouter()

@router.post("/token")
async def get_token(role: str = Query("admin", pattern="^(admin|editor)$")):
    """Quick role-based JWT token generator — only available in DEBUG mode."""
    if not settings.DEBUG:
        raise HTTPException(
            status_code=403,
            detail="Token generation is disabled in production. Set DEBUG=true to enable.",
        )
    username = f"{role}@mypeblo.com"
    token = create_access_token(subject=username, role=role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "username": username,
    }
