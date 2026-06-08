from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUserID, ReadDBSession
from app.gamification.models import GamificationEvent, ReputationScore
from app.gamification.schemas import EventOut, ReputationOut

router = APIRouter()


@router.get("/me/reputation", response_model=ReputationOut)
async def my_reputation(user_id: CurrentUserID, session: ReadDBSession) -> ReputationOut:
    result = await session.execute(
        select(ReputationScore).where(ReputationScore.user_id == user_id)
    )
    rep = result.scalar_one_or_none()
    if rep is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No reputation record yet")
    return ReputationOut.model_validate(rep)


@router.get("/me/events", response_model=list[EventOut])
async def my_events(user_id: CurrentUserID, session: ReadDBSession) -> list[EventOut]:
    result = await session.execute(
        select(GamificationEvent)
        .where(GamificationEvent.user_id == user_id)
        .order_by(GamificationEvent.created_at.desc())
        .limit(50)
    )
    return [EventOut.model_validate(e) for e in result.scalars()]
