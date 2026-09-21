from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.security import verify_token

security = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    x_user_role: str | None = Header(None, alias="X-User-Role"),
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
                role=payload.get("role", "editor"),
            )

    # 2. Check dev role header — only allowed in DEBUG mode
    if x_user_role and settings.DEBUG:
        role = x_user_role.lower()
        if role in ["admin", "editor"]:
            return CurrentUser(username=f"{role}@mypeblo.com", role=role)

    # No valid credentials provided
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Provide a valid Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_editor(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in ["editor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Editor or Admin role required to perform this action.",
        )
    return user


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to perform this action (e.g. publishing catalogue).",
        )
    return user
