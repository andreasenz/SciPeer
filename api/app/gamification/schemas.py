from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ReputationOut(BaseModel):
    user_id: UUID
    normalized_weight: float
    total_reviews: int
    total_xp: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventOut(BaseModel):
    id: UUID
    event_type: str
    xp_delta: int
    created_at: datetime

    model_config = {"from_attributes": True}
