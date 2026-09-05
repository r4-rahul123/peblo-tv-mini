from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import verify_token

security = HTTPBearer(auto_error=False)

class CurrentUser:
    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
) -> CurrentUser:
    """
    Extracts current user from Bearer JWT token or X-User-Role development header.
    """
    # 1. Check Bearer Token
    if credentials:
        payload = verify_token(credentials.credentials)
        if payload:
            return CurrentUser(
                username=payload.get("sub", "anonymous"),
                role=payload.get("role", "editor")
            )

    # 2. Check dev role header for seamless CMS switching
    if x_user_role:
        role = x_user_role.lower()
        if role in ["admin", "editor"]:
            return CurrentUser(username=f"{role}@mypeblo.com", role=role)

    # Default fallback for testing/dev: editor
    return CurrentUser(username="editor@mypeblo.com", role="editor")

async def require_editor(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in ["editor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editor or Admin role required to perform this action."
        )
    return user

async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to perform this action (e.g. publishing catalogue)."
        )
    return user
