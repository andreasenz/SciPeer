from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserOut(BaseModel):
    id: UUID
    orcid_id: str
    display_name: str
    email: str | None
    affiliation: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrcidCallbackIn(BaseModel):
    code: str
    state: str | None = None


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
