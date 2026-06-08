from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, DBSession, ReadDBSession
from app.reviews import service
from app.reviews.schemas import COICheckOut

router = APIRouter()


@router.get("/coi-check/{paper_id}/{reviewer_id}", response_model=COICheckOut)
async def coi_check(
    paper_id: UUID,
    reviewer_id: UUID,
    session: ReadDBSession,
) -> COICheckOut:
    from sqlalchemy import select
    from app.papers.models import SubmissionAuthor

    result = await session.execute(
        select(SubmissionAuthor.user_id).where(SubmissionAuthor.submission_id == paper_id)
    )
    author_ids = [row.user_id for row in result]
    if not author_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")

    conflict = await service.has_conflict_of_interest(
        session,
        paper_author_ids=author_ids,
        candidate_reviewer_id=reviewer_id,
    )
    return COICheckOut(has_conflict=conflict, candidate_reviewer_id=reviewer_id)
