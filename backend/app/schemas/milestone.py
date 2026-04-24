from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from app.models.milestone import MilestoneStatus


class MilestoneCreate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    status: MilestoneStatus = MilestoneStatus.UPCOMING
    due_date: Optional[date] = None
    order_index: int = 0


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[MilestoneStatus] = None
    due_date: Optional[date] = None
    completed_date: Optional[date] = None
    order_index: Optional[int] = None


class MilestoneOut(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str]
    status: MilestoneStatus
    due_date: Optional[date]
    completed_date: Optional[date]
    order_index: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
