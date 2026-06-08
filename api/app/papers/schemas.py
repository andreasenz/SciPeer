from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.papers.models import PaperStatus


class FieldCategoryOut(BaseModel):
    id: UUID
    name: str
    slug: str
    coi_depth: int

    model_config = {"from_attributes": True}


class CoauthorIn(BaseModel):
    orcid_id: str | None = None
    display_name: str


class SubmissionIn(BaseModel):
    title: str
    abstract: str
    field_category_id: UUID
    coauthors: list[CoauthorIn] = []


class SubmissionOut(BaseModel):
    id: UUID
    title: str
    abstract: str
    status: PaperStatus
    field_category_id: UUID
    pdf_url: str
    source_url: str | None
    created_at: datetime
    updated_at: datetime
    author_names: list[str] = []

    model_config = {"from_attributes": True}
