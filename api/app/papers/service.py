from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.papers.models import FieldCategory, Submission, SubmissionAuthor, StatusHistory, PaperStatus


async def list_submissions(session: AsyncSession, status: str | None = None) -> list[Submission]:
    q = select(Submission)
    if status:
        q = q.where(Submission.status == status)
    result = await session.execute(q.order_by(Submission.created_at.desc()))
    return list(result.scalars().all())


async def get_submission(session: AsyncSession, submission_id: UUID) -> Submission | None:
    result = await session.execute(select(Submission).where(Submission.id == submission_id))
    return result.scalar_one_or_none()


async def create_submission(
    session: AsyncSession,
    *,
    title: str,
    abstract: str,
    field_category_id: UUID,
    pdf_url: str,
    author_id: UUID,
) -> Submission:
    sub = Submission(
        title=title,
        abstract=abstract,
        field_category_id=field_category_id,
        pdf_url=pdf_url,
        status=PaperStatus.DRAFT,
    )
    session.add(sub)
    await session.flush()

    author = SubmissionAuthor(submission_id=sub.id, user_id=author_id, position=0)
    session.add(author)

    history = StatusHistory(submission_id=sub.id, to_status=PaperStatus.DRAFT, actor_id=author_id)
    session.add(history)

    await session.commit()
    await session.refresh(sub)
    return sub


async def list_field_categories(session: AsyncSession) -> list[FieldCategory]:
    result = await session.execute(select(FieldCategory).order_by(FieldCategory.name))
    return list(result.scalars().all())
