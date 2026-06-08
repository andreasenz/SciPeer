import asyncio
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.deps import CurrentUserID, DBSession, ReadDBSession
from app.core import storage
from app.papers import service
from app.papers.schemas import FieldCategoryOut, SubmissionIn, SubmissionOut

router = APIRouter()


@router.get("/fields", response_model=list[FieldCategoryOut])
async def list_fields(session: ReadDBSession) -> list[FieldCategoryOut]:
    return [FieldCategoryOut.model_validate(c) for c in await service.list_field_categories(session)]


@router.get("/search")
async def search_papers(q: str = "", status: str | None = None) -> dict:
    from app.core.search import search_papers as ms_search
    return await ms_search(q, status=status)


@router.get("", response_model=list[SubmissionOut])
async def list_papers(session: ReadDBSession, status: str | None = None) -> list[SubmissionOut]:
    return [SubmissionOut.model_validate(p) for p in await service.list_submissions(session, status=status)]


@router.get("/{paper_id}", response_model=SubmissionOut)
async def get_paper(paper_id: UUID, session: ReadDBSession) -> SubmissionOut:
    paper = await service.get_submission(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return SubmissionOut.model_validate(paper)


@router.post("", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
async def create_paper(body: SubmissionIn, user_id: CurrentUserID, session: DBSession) -> SubmissionOut:
    paper = await service.create_submission(
        session,
        title=body.title,
        abstract=body.abstract,
        field_category_id=body.field_category_id,
        pdf_url="",
        author_id=user_id,
    )
    from app.core.search import index_paper
    await index_paper({"id": str(paper.id), "title": paper.title, "abstract": paper.abstract, "status": paper.status})
    return SubmissionOut.model_validate(paper)


@router.post("/{paper_id}/upload-pdf", response_model=SubmissionOut)
async def upload_pdf(
    paper_id: UUID,
    user_id: CurrentUserID,
    session: DBSession,
    file: Annotated[UploadFile, File(...)],
) -> SubmissionOut:
    from sqlalchemy import select
    from app.papers.models import SubmissionAuthor

    paper = await service.get_submission(session, paper_id)
    if paper is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    authors = await session.execute(
        select(SubmissionAuthor).where(
            SubmissionAuthor.submission_id == paper_id,
            SubmissionAuthor.user_id == user_id,
        )
    )
    if authors.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not an author of this paper")
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    url = await asyncio.to_thread(
        storage.upload_paper, paper_id, 1, file.filename or "paper.pdf", file.file, "application/pdf"
    )
    updated = await service.update_pdf_url(session, paper_id, url)
    return SubmissionOut.model_validate(updated)


@router.post("/{paper_id}/submit", response_model=SubmissionOut)
async def submit_for_review(paper_id: UUID, user_id: CurrentUserID, session: DBSession) -> SubmissionOut:
    paper = await service.submit_for_review(session, paper_id, user_id)
    if paper is None:
        raise HTTPException(status_code=400, detail="Paper cannot be submitted (wrong status or missing PDF)")
    return SubmissionOut.model_validate(paper)
