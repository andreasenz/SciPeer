import logging
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.doi.models import DOIAssignment

logger = logging.getLogger(__name__)


async def create_or_mint_doi(session: AsyncSession, submission_id: UUID, title: str) -> DOIAssignment:
    """Create a DOI assignment record and mint via DataCite if credentials are configured."""
    result = await session.execute(
        select(DOIAssignment).where(DOIAssignment.submission_id == submission_id)
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        assignment = DOIAssignment(submission_id=submission_id, doi_status="pending")
        session.add(assignment)
        await session.flush()

    if not settings.datacite_username or not settings.datacite_password:
        logger.info("DataCite credentials not configured — skipping DOI minting for %s", submission_id)
        assignment.doi_status = "skipped"
        await session.commit()
        return assignment

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.datacite_api_url}/dois",
                json={"data": {"type": "dois", "attributes": {
                    "prefix": settings.datacite_prefix,
                    "event": "publish",
                    "titles": [{"title": title}],
                    "types": {"resourceTypeGeneral": "Preprint"},
                    "publisher": "SciPeer",
                    "publicationYear": 2026,
                    "url": f"{settings.app_base_url}/papers/{submission_id}",
                }}},
                auth=(settings.datacite_username, settings.datacite_password),
                headers={"Content-Type": "application/vnd.api+json"},
                timeout=15.0,
            )
            resp.raise_for_status()
            data = resp.json()
        assignment.doi = data["data"]["attributes"].get("doi")
        assignment.doi_status = "minted"
        assignment.datacite_response = data
    except Exception as exc:
        logger.error("DOI minting failed for %s: %s", submission_id, exc)
        assignment.doi_status = "error"

    await session.commit()
    return assignment
