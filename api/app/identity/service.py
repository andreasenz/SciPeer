from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.identity.models import User
from app.identity.schemas import TokenOut


ORCID_TOKEN_URL = "{base}/oauth/token"
ORCID_USERINFO_URL = "{base}/oauth/userinfo"


async def exchange_orcid_code(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            ORCID_TOKEN_URL.format(base=settings.orcid_base_url),
            data={
                "client_id": settings.orcid_client_id,
                "client_secret": settings.orcid_client_secret,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.orcid_redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_or_create_user(session: AsyncSession, orcid_id: str, display_name: str, email: str | None) -> User:
    result = await session.execute(select(User).where(User.orcid_id == orcid_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(orcid_id=orcid_id, display_name=display_name, email=email)
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


async def issue_tokens(user_id: UUID) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )
