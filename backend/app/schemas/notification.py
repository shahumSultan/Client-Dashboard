from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: Optional[NotificationType]
    title: str
    body: Optional[str]
    link: Optional[str]
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
