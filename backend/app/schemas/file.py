from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class FileOut(BaseModel):
    id: str
    project_id: str
    milestone_id: Optional[str]
    uploaded_by: str
    name: str
    original_name: str
    file_type: Optional[str]
    size_bytes: Optional[int]
    public_url: Optional[str]
    description: Optional[str]
    version: int
    is_deliverable: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PresignedUploadOut(BaseModel):
    upload_url: str
    file_id: str
    storage_key: str
