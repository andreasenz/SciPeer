import math
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
    result = await session.execute(select(ReputationScore).where(ReputationScore.user_id == user_id))
    rep = result.scalar_one_or_none()
    if rep is None:
        rep = ReputationScore(user_id=user_id)
        session.add(rep)
        await session.flush()
    return rep


async def award_xp(
    session: AsyncSession, user_id: UUID, event_type: str, metadata: dict | None = None
) -> int:
    xp = XP_TABLE.get(event_type, 0)
    session.add(GamificationEvent(user_id=user_id, event_type=event_type, xp_delta=xp, metadata_=metadata))
    rep = await get_or_create_reputation(session, user_id)
    rep.total_xp += xp
    if event_type == "review_submitted":
        rep.total_reviews += 1
        rep.normalized_weight = _calc_weight(rep.total_reviews)
    await session.commit()
    return xp


def _calc_weight(total_reviews: int) -> float:
    """Logarithmic weight: starts at 1.0, caps at 1.5 around 50+ reviews."""
    if total_reviews <= 0:
        return 1.0
    return min(1.5, 1.0 + 0.5 * math.log1p(total_reviews) / math.log1p(50))
