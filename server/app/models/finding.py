from __future__ import annotations
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field

class FindingCreate(BaseModel):
    severity: Literal["critical", "warning", "style"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    title: str = Field(..., min_length=1, max_length=500)
    description: str
    category: Literal["logic", "security", "performance", "style"]
    evidence_chain: list[dict[str, Any]]
    test_verification: dict[str, Any] | None = None
    suggestion: str

class FindingStatusUpdate(BaseModel):
    status: Literal["accepted", "dismissed"]

class FindingResponse(BaseModel):
    id: str
    review_id: str
    severity: str
    confidence: float
    title: str
    description: str
    category: str
    evidence_chain: list[dict[str, Any]]
    test_verification: dict[str, Any] | None
    suggestion: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}
