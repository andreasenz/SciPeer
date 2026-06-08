from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID

from jose import JWTError, jwt

from app.core.config import settings

_private_key: str | None = None
_public_key: str | None = None

ALGORITHM = "RS256"


def _load_private() -> str:
    global _private_key
    if _private_key is None:
        _private_key = Path(settings.jwt_private_key_path).read_text()
    return _private_key


def _load_public() -> str:
    global _public_key
    if _public_key is None:
        _public_key = Path(settings.jwt_public_key_path).read_text()
    return _public_key


def create_access_token(user_id: UUID) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "access"},
        _load_private(),
        algorithm=ALGORITHM,
    )


def create_refresh_token(user_id: UUID) -> str:
    expire = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_expire_days)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "refresh"},
        _load_private(),
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _load_public(), algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
