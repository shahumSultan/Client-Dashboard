from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.request import RequestCategory, RequestStatus, RequestPriority


class RequestCreate(BaseModel):
    project_id: str
    title: str
    description: str
    category: RequestCategory = RequestCategory.OTHER
    priority: RequestPriority = RequestPriority.MEDIUM


class RequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[RequestCategory] = None
    status: Optional[RequestStatus] = None
    priority: Optional[RequestPriority] = None
    admin_response: Optional[str] = None
    assigned_to: Optional[str] = None


class RequestOut(BaseModel):
    id: str
    project_id: str
    submitted_by: str
    assigned_to: Optional[str]
    title: str
    description: str
    category: RequestCategory
    status: RequestStatus
    priority: RequestPriority
    admin_response: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
