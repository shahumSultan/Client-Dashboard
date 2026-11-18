from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

Category = Literal["legal", "finance", "hr", "brand", "contracts", "policies", "other"]


def _blank_to_none(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


# ── Profile ──────────────────────────────────────────────────────────────────

class CompanyProfileIn(BaseModel):
    legal_name: Optional[str] = Field(None, max_length=255)
    trading_name: Optional[str] = Field(None, max_length=255)
    registration_number: Optional[str] = Field(None, max_length=100)
    tax_number: Optional[str] = Field(None, max_length=100)
    registered_address: Optional[str] = None
    office_address: Optional[str] = None
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    socials: Optional[dict[str, str]] = None
    notes: Optional[str] = None

    @field_validator("*", mode="before")
    @classmethod
    def _clean(cls, v):
        # An emptied form field clears the value rather than storing "".
        return _blank_to_none(v)


class CompanyProfileOut(CompanyProfileIn):
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Bank accounts ────────────────────────────────────────────────────────────

class BankAccountIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    bank_name: str = Field(..., min_length=1, max_length=255)
    account_name: str = Field(..., min_length=1, max_length=255)
    account_number: Optional[str] = Field(None, max_length=100)
    iban: Optional[str] = Field(None, max_length=64)
    swift: Optional[str] = Field(None, max_length=32)
    branch: Optional[str] = None
    currency: Optional[str] = Field(None, max_length=10)
    notes: Optional[str] = None
    is_default: bool = False

    @field_validator(
        "account_number", "iban", "swift", "branch", "currency", "notes", mode="before"
    )
    @classmethod
    def _optional(cls, v):
        return _blank_to_none(v)


class BankAccountOut(BankAccountIn):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Team ─────────────────────────────────────────────────────────────────────

class TeamMemberIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    title: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    user_id: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

    @field_validator("title", "email", "phone", "user_id", "notes", mode="before")
    @classmethod
    def _optional(cls, v):
        return _blank_to_none(v)


class TeamMemberOut(TeamMemberIn):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Documents ────────────────────────────────────────────────────────────────

class UploadRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    size_bytes: int


class UploadTicket(BaseModel):
    """Where the browser PUTs the file, and the exact Content-Type to send."""

    upload_url: str
    storage_key: str
    content_type: str


class UploadedFile(BaseModel):
    storage_key: str
    original_name: str = Field(..., min_length=1, max_length=255)


class DocumentCreate(UploadedFile):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Category = "other"
    tags: list[str] = []
    expires_on: Optional[date] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[Category] = None
    tags: Optional[list[str]] = None
    expires_on: Optional[date] = None
    is_archived: Optional[bool] = None


class DocumentVersionOut(BaseModel):
    id: str
    version: int
    original_name: str
    content_type: str
    size_bytes: int
    uploaded_by: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: Category
    tags: list[str]
    expires_on: Optional[date]
    is_archived: bool
    version: int
    original_name: str
    content_type: str
    size_bytes: int
    uploaded_by: Optional[str]
    uploader_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def _tags(cls, v):
        return v or []

    model_config = {"from_attributes": True}


class DownloadLink(BaseModel):
    url: str
    expires_in: int
