from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import UUIDBase


class DOIAssignment(UUIDBase):
    __tablename__ = "assignments"
    __table_args__ = {"schema": "doi"}

    submission_id: Mapped[UUID] = mapped_column(
        ForeignKey("papers.submissions.id"), unique=True, nullable=False
    )
    doi: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    doi_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    datacite_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
