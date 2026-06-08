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


class SubmissionIn(BaseModel):
    title: str
    abstract: str
    field_category_id: UUID


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

    model_config = {"from_attributes": True}
