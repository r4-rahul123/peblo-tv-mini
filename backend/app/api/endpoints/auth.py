from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.models.models import UserProfileModel, ViewerAccount
from app.schemas.schemas import (
    AuthTokenResponse,
    UserProfileCreate,
    UserProfileResponse,
    ViewerAccountResponse,
    ViewerLoginRequest,
    ViewerSignUpRequest,
)

router = APIRouter()
bearer_security = HTTPBearer(auto_error=False)

AVATAR_COLORS = [
    "from-amber-500 to-orange-400",
    "from-purple-500 to-pink-500",
    "from-emerald-500 to-teal-400",
    "from-blue-600 to-cyan-400",
]


async def get_current_viewer_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_security),
    db: AsyncSession = Depends(get_db),
) -> ViewerAccount:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload["sub"].lower().strip()
    result = await db.execute(
        select(ViewerAccount)
        .where(ViewerAccount.email == email)
        .options(selectinload(ViewerAccount.profiles))
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )
    return account


@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    data: ViewerSignUpRequest,
    db: AsyncSession = Depends(get_db),
):
    clean_email = data.email.lower().strip()

    # Check if account already exists
    existing = await db.execute(
        select(ViewerAccount).where(ViewerAccount.email == clean_email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in.",
        )

    # Create account
    account = ViewerAccount(
        email=clean_email,
        password_hash=hash_password(data.password),
    )
    db.add(account)
    await db.flush()

    # Create initial user profile
    profile_name = data.initial_name.strip() if data.initial_name else clean_email.split("@")[0].title()
    selected_age = data.age_group or "5-8"
    is_kid = selected_age != "All Ages"

    first_profile = UserProfileModel(
        account_id=account.id,
        name=profile_name,
        age_group=selected_age,
        is_kid=is_kid,
        avatar_color=AVATAR_COLORS[0],
    )
    db.add(first_profile)
    await db.commit()

    # Reload with profiles
    result = await db.execute(
        select(ViewerAccount)
        .where(ViewerAccount.id == account.id)
        .options(selectinload(ViewerAccount.profiles))
    )
    reloaded_account = result.scalar_one()

    token = create_access_token(subject=clean_email, role="viewer")
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        account=ViewerAccountResponse.model_validate(reloaded_account),
    )


@router.post("/login", response_model=AuthTokenResponse)
async def login(
    data: ViewerLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    clean_email = data.email.lower().strip()
    result = await db.execute(
        select(ViewerAccount)
        .where(ViewerAccount.email == clean_email)
        .options(selectinload(ViewerAccount.profiles))
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email. Please sign up first.",
        )

    if not verify_password(data.password, account.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
        )

    token = create_access_token(subject=clean_email, role="viewer")
    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        account=ViewerAccountResponse.model_validate(account),
    )


@router.get("/me", response_model=ViewerAccountResponse)
async def get_me(
    account: ViewerAccount = Depends(get_current_viewer_account),
):
    """Returns currently authenticated viewer account with profiles."""
    return ViewerAccountResponse.model_validate(account)


@router.post("/profiles", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def add_profile(
    data: UserProfileCreate,
    account: ViewerAccount = Depends(get_current_viewer_account),
    db: AsyncSession = Depends(get_db),
):
    """Add a new profile to the viewer's account (up to 4 profiles max)."""
    if len(account.profiles) >= 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 4 profiles allowed per account.",
        )

    color_idx = len(account.profiles) % len(AVATAR_COLORS)
    is_kid = data.age_group != "All Ages"

    profile = UserProfileModel(
        account_id=account.id,
        name=data.name.strip(),
        age_group=data.age_group,
        is_kid=is_kid,
        avatar_color=AVATAR_COLORS[color_idx],
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return UserProfileResponse.model_validate(profile)


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: str,
    account: ViewerAccount = Depends(get_current_viewer_account),
    db: AsyncSession = Depends(get_db),
):
    """Delete a profile (at least 1 profile must remain)."""
    if len(account.profiles) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the only remaining profile in the account.",
        )

    profile_to_delete = next((p for p in account.profiles if p.id == profile_id), None)
    if not profile_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile '{profile_id}' not found in this account.",
        )

    await db.delete(profile_to_delete)
    await db.commit()
    return None


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
