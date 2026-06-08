from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDBase


class ReputationScore(Base):
    __tablename__ = "reputation_scores"
    __table_args__ = {"schema": "gamification"}

    user_id: Mapped[UUID] = mapped_column(ForeignKey("identity.users.id"), primary_key=True)
    normalized_weight: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False, default=1.00)
    total_reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class GamificationEvent(UUIDBase):
    __tablename__ = "events"
    __table_args__ = {"schema": "gamification"}

    user_id: Mapped[UUID] = mapped_column(ForeignKey("identity.users.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    xp_delta: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
