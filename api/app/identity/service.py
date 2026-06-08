import logging
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.identity.models import User
from app.identity.schemas import TokenOut

logger = logging.getLogger(__name__)

ORCID_TOKEN_URL = "{base}/oauth/token"


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


async def get_or_create_user(
    session: AsyncSession, orcid_id: str, display_name: str, email: str | None
) -> User:
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


async def sync_coauthor_graph(session: AsyncSession, user: User) -> None:
    """Fetch ORCID works and create coauthor edges for registered SciPeer users."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://pub.orcid.org/v3.0/{user.orcid_id}/works",
                headers={"Accept": "application/json"},
                timeout=10.0,
            )
            if resp.status_code != 200:
                return
            works = resp.json()
    except Exception as exc:
        logger.warning("ORCID works fetch failed for %s: %s", user.orcid_id, exc)
        return

    coauthor_orcid_ids: set[str] = set()
    for group in works.get("group", []):
        for summary in group.get("work-summary", []):
            for contributor in summary.get("contributors", {}).get("contributor", []):
                path = contributor.get("contributor-orcid", {}).get("path")
                if path and path != user.orcid_id:
                    coauthor_orcid_ids.add(path)

    from app.reviews.service import create_coauthor_edge

    for orcid_id in coauthor_orcid_ids:
        result = await session.execute(select(User).where(User.orcid_id == orcid_id))
        coauthor = result.scalar_one_or_none()
        if coauthor is not None:
            await create_coauthor_edge(session, user.id, coauthor.id)
