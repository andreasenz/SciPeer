from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, Text, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDBase


class CommentType(StrEnum):
    MANDATORY = "mandatory"
    SUGGESTED = "suggested"


class CoauthorEdge(Base):
    __tablename__ = "coauthor_edges"
    __table_args__ = {"schema": "reviews"}

    # No FK — graph is seeded from ORCID; referenced users may not be registered yet
    author_id: Mapped[UUID] = mapped_column(primary_key=True)
    coauthor_id: Mapped[UUID] = mapped_column(primary_key=True)
    source_work: Mapped[str | None] = mapped_column(Text, nullable=True)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReviewScore(UUIDBase):
    __tablename__ = "scores"
    __table_args__ = (
        UniqueConstraint("submission_id", "reviewer_id", name="uq_scores_one_per_reviewer"),
        {"schema": "reviews"},
    )

    submission_id: Mapped[UUID] = mapped_column(ForeignKey("papers.submissions.id"), nullable=False)
    reviewer_id: Mapped[UUID] = mapped_column(ForeignKey("identity.users.id"), nullable=False)
    raw_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReviewComment(UUIDBase):
    __tablename__ = "comments"
    __table_args__ = {"schema": "reviews"}

    submission_id: Mapped[UUID] = mapped_column(ForeignKey("papers.submissions.id"), nullable=False)
    reviewer_id: Mapped[UUID] = mapped_column(ForeignKey("identity.users.id"), nullable=False)
    comment_type: Mapped[str] = mapped_column(String(20), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    upvotes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PdfAnnotation(UUIDBase):
    __tablename__ = "annotations"
    __table_args__ = {"schema": "reviews"}

    submission_id: Mapped[UUID] = mapped_column(ForeignKey("papers.submissions.id"), nullable=False)
    reviewer_id: Mapped[UUID] = mapped_column(ForeignKey("identity.users.id"), nullable=False)
    quoted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_num: Mapped[int | None] = mapped_column(Integer, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
