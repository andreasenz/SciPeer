from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DOIAssignmentOut(BaseModel):
    id: UUID
    submission_id: UUID
    doi: str | None
    doi_status: str
    created_at: datetime

    model_config = {"from_attributes": True}
