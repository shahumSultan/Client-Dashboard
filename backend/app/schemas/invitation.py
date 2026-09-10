from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


class InvitationCreate(BaseModel):
    organization_id: str
    email: EmailStr
    role: UserRole = UserRole.CLIENT_MEMBER

    @field_validator("role")
    @classmethod
    def _client_roles_only(cls, v: UserRole) -> UserRole:
        # Admin is granted deliberately, never handed out by an emailed link.
        if v == UserRole.ADMIN:
            raise ValueError("Invitations cannot grant admin")
        return v


class InvitationOut(BaseModel):
    id: str
    organization_id: str
    email: str
    role: UserRole
    token: str
    expires_at: datetime
    accepted_at: Optional[datetime]
    revoked_at: Optional[datetime]
    created_at: datetime
    is_pending: bool

    model_config = {"from_attributes": True}


class InvitationPreview(BaseModel):
    """What the join page shows before the invite is accepted."""
    organization_name: str
    email: str
    role: UserRole
    expires_at: datetime


class InvitationAccept(BaseModel):
    token: str = Field(min_length=8, max_length=64)
