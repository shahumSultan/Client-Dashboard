from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    organization_id: str
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    project_type: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    completion_percentage: Optional[int] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    delivered_date: Optional[date] = None
    project_type: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str]
    status: ProjectStatus
    completion_percentage: int
    start_date: Optional[date]
    target_date: Optional[date]
    delivered_date: Optional[date]
    project_type: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectUpdateCreate(BaseModel):
    content: str


class ProjectUpdateOut(BaseModel):
    id: str
    project_id: str
    author_id: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
