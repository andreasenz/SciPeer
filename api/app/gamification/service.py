from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.gamification.models import GamificationEvent, ReputationScore

XP_TABLE = {
    "review_submitted": 20,
    "comment_upvoted": 10,
    "fast_review_bonus": 10,
    "paper_accepted": 50,
    "review_accuracy_bonus": 15,
}


async def get_or_create_reputation(session: AsyncSession, user_id: UUID) -> ReputationScore:
    result = await session.execute(
        select(ReputationScore).where(ReputationScore.user_id == user_id)
    )
    rep = result.scalar_one_or_none()
    if rep is None:
        rep = ReputationScore(user_id=user_id)
        session.add(rep)
        await session.flush()
    return rep


async def award_xp(session: AsyncSession, user_id: UUID, event_type: str, metadata: dict | None = None) -> int:
    xp = XP_TABLE.get(event_type, 0)
    event = GamificationEvent(user_id=user_id, event_type=event_type, xp_delta=xp, metadata_=metadata)
    session.add(event)

    rep = await get_or_create_reputation(session, user_id)
    rep.total_xp += xp
    if event_type == "review_submitted":
        rep.total_reviews += 1

    await session.commit()
    return xp
