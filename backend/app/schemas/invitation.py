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
        if v in (UserRole.ADMIN, UserRole.STAFF):
            raise ValueError("Invitations are for clients; team roles are set on the Users page")
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
    # Set only on creation. False means email is unconfigured or the send
    # failed, and the admin should copy the link instead.
    email_sent: bool = False

    model_config = {"from_attributes": True}


class InvitationPreview(BaseModel):
    """What the join page shows before the invite is accepted."""
    organization_name: str
    email: str
    role: UserRole
    expires_at: datetime


class InvitationAccept(BaseModel):
    token: str = Field(min_length=8, max_length=64)
