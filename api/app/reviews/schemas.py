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
