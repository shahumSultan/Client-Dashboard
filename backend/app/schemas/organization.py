from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class OrganizationCreate(BaseModel):
    name: str
    # Derived from the name when omitted, with collisions suffixed.
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None


class OrganizationOut(BaseModel):
    id: str
    name: str
    slug: str
    logo_url: Optional[str]
    website: Optional[str]
    industry: Optional[str]
    description: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
