from pydantic import BaseModel, EmailStr, Field
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


class ClientRegistration(BaseModel):
    """Self-serve signup payload — collected once, right after the Clerk sign-up."""
    full_name: str = Field(min_length=1, max_length=255)
    company_name: str = Field(min_length=1, max_length=255)
    industry: Optional[str] = Field(default=None, max_length=100)
    website: Optional[str] = Field(default=None, max_length=255)
