from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class OnboardingUpdate(BaseModel):
    current_step: Optional[int] = None
    completed: Optional[bool] = None
    business_type: Optional[str] = None
    team_size: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    timezone: Optional[str] = None
    integrations: Optional[dict[str, Any]] = None
    goals: Optional[list[str]] = None
    kpis: Optional[list[str]] = None
    notes: Optional[str] = None


class OnboardingOut(BaseModel):
    id: str
    organization_id: str
    current_step: int
    completed: bool
    business_type: Optional[str]
    team_size: Optional[str]
    primary_contact_name: Optional[str]
    primary_contact_phone: Optional[str]
    timezone: Optional[str]
    integrations: Optional[dict[str, Any]]
    goals: Optional[list[str]]
    kpis: Optional[list[str]]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
