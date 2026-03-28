from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-zA-Z0-9_-]+$")

class ProjectResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    model_config = {"from_attributes": True}
