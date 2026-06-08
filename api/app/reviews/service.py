from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.reviews.models import CoauthorEdge, PdfAnnotation, ReviewComment, ReviewScore


# ── COI ───────────────────────────────────────────────────────────────────────

async def has_conflict_of_interest(
    session: AsyncSession,
    *,
    paper_author_ids: list[UUID],
    candidate_reviewer_id: UUID,
    max_depth: int = 2,
) -> bool:
    if not paper_author_ids:
        return False
    from sqlalchemy import text
    result = await session.execute(
        text("""
            WITH RECURSIVE coi_graph AS (
                SELECT author_id, coauthor_id, 1 AS depth
                FROM   reviews.coauthor_edges
                WHERE  author_id = ANY(:author_ids)
              UNION ALL
                SELECT e.author_id, e.coauthor_id, g.depth + 1
                FROM   reviews.coauthor_edges e
                JOIN   coi_graph g ON e.author_id = g.coauthor_id
                WHERE  g.depth < :max_depth
            )
            SELECT EXISTS (
                SELECT 1 FROM coi_graph WHERE coauthor_id = :reviewer_id
            ) AS has_conflict
        """),
        {"author_ids": paper_author_ids, "max_depth": max_depth, "reviewer_id": candidate_reviewer_id},
    )
    return bool(result.one().has_conflict)


async def create_coauthor_edge(session: AsyncSession, author_id: UUID, coauthor_id: UUID) -> None:
    """Called by the identity module after ORCID sync — avoids cross-module SQL."""
    for a, b in ((author_id, coauthor_id), (coauthor_id, author_id)):
        existing = await session.execute(
            select(CoauthorEdge).where(
                CoauthorEdge.author_id == a, CoauthorEdge.coauthor_id == b
            )
        )
        if existing.scalar_one_or_none() is None:
            session.add(CoauthorEdge(author_id=a, coauthor_id=b))
    await session.commit()


# ── Scores ────────────────────────────────────────────────────────────────────

async def get_scores(session: AsyncSession, submission_id: UUID) -> list[ReviewScore]:
    result = await session.execute(
        select(ReviewScore).where(ReviewScore.submission_id == submission_id)
    )
    return list(result.scalars().all())


async def get_weighted_avg_score(session: AsyncSession, submission_id: UUID) -> float:
    from app.gamification.service import get_or_create_reputation
    scores = await get_scores(session, submission_id)
    if not scores:
        return 0.0
    total_weight = 0.0
    weighted_sum = 0.0
    for s in scores:
        rep = await get_or_create_reputation(session, s.reviewer_id)
        w = float(rep.normalized_weight)
        weighted_sum += s.raw_score * w
        total_weight += w
    return weighted_sum / total_weight if total_weight else 0.0


async def submit_score(
    session: AsyncSession,
    *,
    submission_id: UUID,
    reviewer_id: UUID,
    raw_score: int,
) -> ReviewScore:
    existing = await session.execute(
        select(ReviewScore).where(
            ReviewScore.submission_id == submission_id,
            ReviewScore.reviewer_id == reviewer_id,
        )
    )
    score = existing.scalar_one_or_none()
    if score is not None:
        score.raw_score = raw_score
    else:
        score = ReviewScore(submission_id=submission_id, reviewer_id=reviewer_id, raw_score=raw_score)
        session.add(score)
    await session.commit()
    await session.refresh(score)
    return score


# ── Comments ──────────────────────────────────────────────────────────────────

async def get_comments(session: AsyncSession, submission_id: UUID) -> list[ReviewComment]:
    result = await session.execute(
        select(ReviewComment)
        .where(ReviewComment.submission_id == submission_id)
        .order_by(ReviewComment.created_at)
    )
    return list(result.scalars().all())


async def count_open_mandatory_comments(session: AsyncSession, submission_id: UUID) -> int:
    result = await session.execute(
        select(func.count()).where(
            ReviewComment.submission_id == submission_id,
            ReviewComment.comment_type == "mandatory",
            ReviewComment.is_resolved.is_(False),
        )
    )
    return result.scalar_one()


async def submit_comment(
    session: AsyncSession,
    *,
    submission_id: UUID,
    reviewer_id: UUID,
    comment_type: str,
    body: str,
) -> ReviewComment:
    comment = ReviewComment(
        submission_id=submission_id,
        reviewer_id=reviewer_id,
        comment_type=comment_type,
        body=body,
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return comment


async def vote_comment(
    session: AsyncSession, *, comment_id: UUID, direction: str
) -> ReviewComment | None:
    result = await session.execute(select(ReviewComment).where(ReviewComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if comment is None:
        return None
    if direction == "up":
        comment.upvotes += 1
    else:
        comment.downvotes += 1
    await session.commit()
    await session.refresh(comment)
    return comment


async def resolve_comment(
    session: AsyncSession, *, comment_id: UUID
) -> ReviewComment | None:
    result = await session.execute(select(ReviewComment).where(ReviewComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if comment is None:
        return None
    comment.is_resolved = True
    await session.commit()
    await session.refresh(comment)
    return comment


async def get_scores_by_reviewer(session: AsyncSession, reviewer_id: UUID) -> list[ReviewScore]:
    result = await session.execute(
        select(ReviewScore)
        .where(ReviewScore.reviewer_id == reviewer_id)
        .order_by(ReviewScore.submitted_at.desc())
    )
    return list(result.scalars().all())


# ── PDF annotations ───────────────────────────────────────────────────────────

async def get_annotations_with_reviewer(
    session: AsyncSession, submission_id: UUID
) -> list[tuple[PdfAnnotation, str]]:
    """Returns (annotation, reviewer_display_name) tuples, ordered by creation."""
    from app.identity.models import User
    result = await session.execute(
        select(PdfAnnotation, User.display_name)
        .join(User, User.id == PdfAnnotation.reviewer_id)
        .where(PdfAnnotation.submission_id == submission_id)
        .order_by(PdfAnnotation.created_at)
    )
    return [(row.PdfAnnotation, row.display_name) for row in result.all()]


async def get_annotation(session: AsyncSession, annotation_id: UUID) -> PdfAnnotation | None:
    result = await session.execute(select(PdfAnnotation).where(PdfAnnotation.id == annotation_id))
    return result.scalar_one_or_none()


async def create_annotation(
    session: AsyncSession,
    *,
    submission_id: UUID,
    reviewer_id: UUID,
    quoted_text: str | None,
    page_num: int | None,
    body: str,
) -> PdfAnnotation:
    annotation = PdfAnnotation(
        submission_id=submission_id,
        reviewer_id=reviewer_id,
        quoted_text=quoted_text,
        page_num=page_num,
        body=body,
    )
    session.add(annotation)
    await session.commit()
    await session.refresh(annotation)
    return annotation


async def edit_annotation(
    session: AsyncSession, annotation_id: UUID, body: str
) -> PdfAnnotation | None:
    annotation = await get_annotation(session, annotation_id)
    if annotation is None:
        return None
    annotation.body = body
    await session.commit()
    await session.refresh(annotation)
    return annotation


async def delete_annotation(session: AsyncSession, annotation_id: UUID) -> bool:
    annotation = await get_annotation(session, annotation_id)
    if annotation is None:
        return False
    await session.delete(annotation)
    await session.commit()
    return True
