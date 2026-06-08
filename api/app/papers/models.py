from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDBase


class PaperStatus(StrEnum):
    DRAFT = "DRAFT"
    UNDER_REVIEW = "UNDER_REVIEW"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    CAMERA_READY = "CAMERA_READY"
    PUBLISHED = "PUBLISHED"
    REJECTED = "REJECTED"


class FieldCategory(UUIDBase):
    __tablename__ = "field_categories"
    __table_args__ = {"schema": "papers"}

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    coi_depth: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=2)
    min_draft_days: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=7)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Submission(UUIDBase):
    __tablename__ = "submissions"
    __table_args__ = {"schema": "papers"}

    title: Mapped[str] = mapped_column(Text, nullable=False)
    abstract: Mapped[str] = mapped_column(Text, nullable=False)
    field_category_id: Mapped[UUID] = mapped_column(
        ForeignKey("papers.field_categories.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=PaperStatus.DRAFT
    )
    pdf_url: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    authors: Mapped[list["SubmissionAuthor"]] = relationship(back_populates="submission")


class SubmissionAuthor(Base):
    __tablename__ = "submission_authors"
    __table_args__ = {"schema": "papers"}

    submission_id: Mapped[UUID] = mapped_column(
        ForeignKey("papers.submissions.id"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("identity.users.id"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    submission: Mapped["Submission"] = relationship(back_populates="authors")


class StatusHistory(UUIDBase):
    __tablename__ = "status_history"
    __table_args__ = {"schema": "papers"}

    submission_id: Mapped[UUID] = mapped_column(ForeignKey("papers.submissions.id"), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("identity.users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
