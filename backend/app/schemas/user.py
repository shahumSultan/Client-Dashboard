from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


class UserOut(BaseModel):
    id: str
    clerk_id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: UserRole
    organization_id: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role: UserRole
    organization_id: Optional[str] = None

