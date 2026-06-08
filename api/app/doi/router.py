from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import ReadDBSession
from app.doi.models import DOIAssignment
from app.doi.schemas import DOIAssignmentOut

router = APIRouter()


@router.get("/{paper_id}", response_model=DOIAssignmentOut)
async def get_doi(paper_id: UUID, session: ReadDBSession) -> DOIAssignmentOut:
    result = await session.execute(
        select(DOIAssignment).where(DOIAssignment.submission_id == paper_id)
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No DOI assignment found")
    return DOIAssignmentOut.model_validate(assignment)
