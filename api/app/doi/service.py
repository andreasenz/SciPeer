from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.doi.models import DOIAssignment


async def reserve_doi(session: AsyncSession, submission_id: UUID) -> DOIAssignment:
    """Reserve (draft) a DOI via DataCite when paper reaches CAMERA_READY."""
    assignment = DOIAssignment(submission_id=submission_id, doi_status="reserved")
    session.add(assignment)
    await session.commit()
    await session.refresh(assignment)
    return assignment


async def mint_doi(session: AsyncSession, assignment: DOIAssignment, metadata: dict) -> str:
    """Publish the DOI via DataCite REST API when paper is PUBLISHED."""
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{settings.datacite_api_url}/dois/{assignment.doi}",
            json={"data": {"type": "dois", "attributes": {**metadata, "event": "publish"}}},
            auth=(settings.datacite_username, settings.datacite_password),
            headers={"Content-Type": "application/vnd.api+json"},
        )
        resp.raise_for_status()
        data = resp.json()

    assignment.doi_status = "minted"
    assignment.datacite_response = data
    await session.commit()
    return assignment.doi or ""
