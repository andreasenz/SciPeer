from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_read_session, get_session
from app.core.security import decode_token

_bearer = HTTPBearer()


async def get_current_user_id(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> UUID:
    try:
        payload = decode_token(creds.credentials)
        if payload.get("type") != "access":
            raise ValueError
        return UUID(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


DBSession = Annotated[AsyncSession, Depends(get_session)]
ReadDBSession = Annotated[AsyncSession, Depends(get_read_session)]
CurrentUserID = Annotated[UUID, Depends(get_current_user_id)]
