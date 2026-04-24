from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, Any


class AnalyticsEntryCreate(BaseModel):
    project_id: str
    period_start: date
    period_end: date
    leads_processed: Optional[float] = None
    conversions: Optional[float] = None
    conversion_rate: Optional[float] = None
    revenue_attributed: Optional[float] = None
    metrics: Optional[dict[str, Any]] = None
    summary: Optional[str] = None


class AnalyticsEntryOut(BaseModel):
    id: str
    project_id: str
    period_start: date
    period_end: date
    leads_processed: Optional[float]
    conversions: Optional[float]
    conversion_rate: Optional[float]
    revenue_attributed: Optional[float]
    metrics: Optional[dict[str, Any]]
    summary: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
