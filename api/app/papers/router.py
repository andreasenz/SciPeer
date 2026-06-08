from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUserID, ReadDBSession, DBSession
from app.papers import service
from app.papers.schemas import FieldCategoryOut, SubmissionIn, SubmissionOut

router = APIRouter()


@router.get("/fields", response_model=list[FieldCategoryOut])
async def list_fields(session: ReadDBSession) -> list[FieldCategoryOut]:
    categories = await service.list_field_categories(session)
    return [FieldCategoryOut.model_validate(c) for c in categories]


@router.get("", response_model=list[SubmissionOut])
async def list_papers(
    session: ReadDBSession,
    status: str | None = None,
) -> list[SubmissionOut]:
    papers = await service.list_submissions(session, status=status)
    return [SubmissionOut.model_validate(p) for p in papers]


@router.get("/{paper_id}", response_model=SubmissionOut)
async def get_paper(paper_id: UUID, session: ReadDBSession) -> SubmissionOut:
    paper = await service.get_submission(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return SubmissionOut.model_validate(paper)


@router.post("", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
async def create_paper(
    body: SubmissionIn,
    user_id: CurrentUserID,
    session: DBSession,
) -> SubmissionOut:
    paper = await service.create_submission(
        session,
        title=body.title,
        abstract=body.abstract,
        field_category_id=body.field_category_id,
        pdf_url="",  # set after file upload
        author_id=user_id,
    )
    return SubmissionOut.model_validate(paper)
