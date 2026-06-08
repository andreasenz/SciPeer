from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.papers.models import FieldCategory, PaperStatus, StatusHistory, Submission, SubmissionAuthor


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
    session.add(SubmissionAuthor(submission_id=sub.id, user_id=author_id, position=0))
    session.add(StatusHistory(submission_id=sub.id, to_status=PaperStatus.DRAFT, actor_id=author_id))
    await session.commit()
    await session.refresh(sub)
    return sub


async def update_pdf_url(session: AsyncSession, submission_id: UUID, pdf_url: str) -> Submission | None:
    sub = await get_submission(session, submission_id)
    if sub is None:
        return None
    sub.pdf_url = pdf_url
    await session.commit()
    await session.refresh(sub)
    return sub


async def transition_status(
    session: AsyncSession,
    submission_id: UUID,
    new_status: PaperStatus,
    actor_id: UUID | None,
) -> Submission | None:
    sub = await get_submission(session, submission_id)
    if sub is None:
        return None
    old_status = sub.status
    sub.status = new_status
    session.add(StatusHistory(
        submission_id=submission_id,
        from_status=old_status,
        to_status=new_status,
        actor_id=actor_id,
    ))
    await session.commit()
    await session.refresh(sub)

    from app.core.events import emit_status_changed
    await emit_status_changed(str(submission_id), old_status, new_status)

    if new_status == PaperStatus.PUBLISHED:
        from app.doi.service import create_or_mint_doi
        await create_or_mint_doi(session, submission_id, title=sub.title)

    return sub


async def submit_for_review(
    session: AsyncSession, submission_id: UUID, actor_id: UUID
) -> Submission | None:
    sub = await get_submission(session, submission_id)
    if sub is None or sub.status != PaperStatus.DRAFT:
        return None
    if not sub.pdf_url:
        return None  # must have PDF
    return await transition_status(session, submission_id, PaperStatus.UNDER_REVIEW, actor_id)


async def check_and_apply_acceptance(session: AsyncSession, submission_id: UUID) -> None:
    """After each review, re-evaluate acceptance/rejection criteria."""
    from app.reviews.service import (
        count_open_mandatory_comments,
        get_scores,
        get_weighted_avg_score,
    )

    sub = await get_submission(session, submission_id)
    if sub is None or sub.status not in (PaperStatus.UNDER_REVIEW, PaperStatus.CAMERA_READY):
        return

    scores = await get_scores(session, submission_id)
    if len(scores) < 3:
        return

    low = sum(1 for s in scores if s.raw_score <= 1)
    if low >= 2:
        await transition_status(session, submission_id, PaperStatus.REJECTED, actor_id=None)
        return

    weighted_avg = await get_weighted_avg_score(session, submission_id)
    if weighted_avg >= 3.0:
        open_mandatory = await count_open_mandatory_comments(session, submission_id)
        new_status = PaperStatus.REVISION_REQUESTED if open_mandatory > 0 else PaperStatus.PUBLISHED
        await transition_status(session, submission_id, new_status, actor_id=None)


async def list_field_categories(session: AsyncSession) -> list[FieldCategory]:
    result = await session.execute(select(FieldCategory).order_by(FieldCategory.name))
    return list(result.scalars().all())
