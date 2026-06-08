from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ScoreIn(BaseModel):
    raw_score: int = Field(ge=0, le=5)


class ScoreOut(BaseModel):
    id: UUID
    submission_id: UUID
    reviewer_id: UUID
    raw_score: int
    submitted_at: datetime

    model_config = {"from_attributes": True}


class CommentIn(BaseModel):
    comment_type: str = Field(pattern="^(mandatory|suggested)$")
    body: str = Field(min_length=10)


class CommentOut(BaseModel):
    id: UUID
    submission_id: UUID
    reviewer_id: UUID
    comment_type: str
    body: str
    is_resolved: bool
    upvotes: int
    downvotes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class COICheckOut(BaseModel):
    has_conflict: bool
    candidate_reviewer_id: UUID


class AnnotationIn(BaseModel):
    quoted_text: str | None = Field(default=None, max_length=4000)
    page_num: int | None = Field(default=None, ge=1)
    body: str = Field(min_length=1, max_length=2000)


class AnnotationEditIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class AnnotationOut(BaseModel):
    id: UUID
    submission_id: UUID
    reviewer_id: UUID
    reviewer_name: str = ""
    quoted_text: str | None
    page_num: int | None
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}
