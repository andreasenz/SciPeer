from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUserID, DBSession, ReadDBSession
from app.reviews import service
from app.reviews.schemas import (
    COICheckOut,
    CommentIn,
    CommentOut,
    ScoreIn,
    ScoreOut,
)

router = APIRouter()


# ── COI ───────────────────────────────────────────────────────────────────────

@router.get("/coi-check/{paper_id}/{reviewer_id}", response_model=COICheckOut)
async def coi_check(paper_id: UUID, reviewer_id: UUID, session: ReadDBSession) -> COICheckOut:
    from app.papers.models import SubmissionAuthor
    result = await session.execute(
        select(SubmissionAuthor.user_id).where(SubmissionAuthor.submission_id == paper_id)
    )
    author_ids = [row.user_id for row in result]
    if not author_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    conflict = await service.has_conflict_of_interest(
        session, paper_author_ids=author_ids, candidate_reviewer_id=reviewer_id
    )
    return COICheckOut(has_conflict=conflict, candidate_reviewer_id=reviewer_id)


# ── My reviews ───────────────────────────────────────────────────────────────

@router.get("/my", response_model=list[ScoreOut])
async def my_reviews(user_id: CurrentUserID, session: ReadDBSession) -> list[ScoreOut]:
    scores = await service.get_scores_by_reviewer(session, user_id)
    return [ScoreOut.model_validate(s) for s in scores]


# ── Scores ────────────────────────────────────────────────────────────────────

@router.get("/{paper_id}/scores", response_model=list[ScoreOut])
async def list_scores(paper_id: UUID, session: ReadDBSession) -> list[ScoreOut]:
    scores = await service.get_scores(session, paper_id)
    return [ScoreOut.model_validate(s) for s in scores]


@router.post("/{paper_id}/scores", response_model=ScoreOut, status_code=status.HTTP_201_CREATED)
async def submit_score(
    paper_id: UUID,
    body: ScoreIn,
    user_id: CurrentUserID,
    session: DBSession,
) -> ScoreOut:
    from app.papers.models import Submission, SubmissionAuthor, PaperStatus
    from app.core.events import emit_review_submitted
    from app.gamification import service as gami
    from app.papers import service as papers_svc

    paper = await session.get(Submission, paper_id)
    if paper is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper.status not in (PaperStatus.UNDER_REVIEW, PaperStatus.CAMERA_READY):
        raise HTTPException(status_code=400, detail="Paper is not open for review")

    is_author = await session.execute(
        select(SubmissionAuthor).where(
            SubmissionAuthor.submission_id == paper_id,
            SubmissionAuthor.user_id == user_id,
        )
    )
    if is_author.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Authors cannot review their own paper")

    author_ids_result = await session.execute(
        select(SubmissionAuthor.user_id).where(SubmissionAuthor.submission_id == paper_id)
    )
    author_ids = [r.user_id for r in author_ids_result]
    if await service.has_conflict_of_interest(session, paper_author_ids=author_ids, candidate_reviewer_id=user_id):
        raise HTTPException(status_code=400, detail="Conflict of interest — you are a co-author of an author")

    score = await service.submit_score(
        session, submission_id=paper_id, reviewer_id=user_id, raw_score=body.raw_score
    )
    await gami.award_xp(session, user_id, "review_submitted")
    await emit_review_submitted(str(paper_id), str(user_id), body.raw_score)
    await papers_svc.check_and_apply_acceptance(session, paper_id)
    return ScoreOut.model_validate(score)


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/{paper_id}/comments", response_model=list[CommentOut])
async def list_comments(paper_id: UUID, session: ReadDBSession) -> list[CommentOut]:
    comments = await service.get_comments(session, paper_id)
    return [CommentOut.model_validate(c) for c in comments]


@router.post("/{paper_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    paper_id: UUID,
    body: CommentIn,
    user_id: CurrentUserID,
    session: DBSession,
) -> CommentOut:
    from app.papers.models import Submission, PaperStatus
    paper = await session.get(Submission, paper_id)
    if paper is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper.status not in (PaperStatus.UNDER_REVIEW, PaperStatus.CAMERA_READY, PaperStatus.REVISION_REQUESTED):
        raise HTTPException(status_code=400, detail="Paper is not open for comments")
    comment = await service.submit_comment(
        session,
        submission_id=paper_id,
        reviewer_id=user_id,
        comment_type=body.comment_type,
        body=body.body,
    )
    return CommentOut.model_validate(comment)


@router.patch("/comments/{comment_id}/vote", response_model=CommentOut)
async def vote_comment(comment_id: UUID, direction: str, session: DBSession) -> CommentOut:
    if direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="direction must be 'up' or 'down'")
    comment = await service.vote_comment(session, comment_id=comment_id, direction=direction)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    return CommentOut.model_validate(comment)


@router.patch("/comments/{comment_id}/resolve", response_model=CommentOut)
async def resolve_comment(comment_id: UUID, user_id: CurrentUserID, session: DBSession) -> CommentOut:
    comment = await service.resolve_comment(session, comment_id=comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    return CommentOut.model_validate(comment)
