import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash password using SHA-256 with a unique random 16-byte salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored salted hash."""
    if not hashed_password or ":" not in hashed_password:
        return False
    salt, hashed = hashed_password.split(":", 1)
    recalculated = hashlib.sha256(f"{salt}:{plain_password}".encode("utf-8")).hexdigest()
    return secrets.compare_digest(hashed, recalculated)


def create_access_token(
    subject: str, role: str = "viewer", expires_delta: timedelta | None = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "role": role}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except jwt.PyJWTError:
        return None
