from datetime import datetime, date
from typing import Optional, Literal

from pydantic import BaseModel, Field, field_validator

from app.models.engagement import EngagementStage


class Deliverable(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    detail: Optional[str] = Field(None, max_length=2000)


class TimelinePhase(BaseModel):
    phase: str = Field(min_length=1, max_length=255)
    duration: Optional[str] = Field(None, max_length=255)


class LineItem(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    quantity: int = Field(1, ge=1, le=100_000)
    # Minor units (cents). Integers, so a total never picks up float error.
    unit_amount: int = Field(ge=0, le=100_000_000_00)


def _https_or_none(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    # These links are rendered as buttons in front of a client about to pay.
    # Only https — no javascript:, no plain http a network could rewrite.
    if not v.startswith("https://"):
        raise ValueError("Must be an https:// link")
    return v


# Fields that make up the signed agreement. Frozen once it is sent.
AGREEMENT_FIELDS = (
    "agreement_source", "agreement_title", "scope", "deliverables", "timeline",
    "revision_policy", "payment_terms", "additional_terms",
)
# Frozen once the client says they have paid — the amount they paid against.
INVOICE_FIELDS = (
    "invoice_number", "currency", "line_items", "invoice_due_date",
    "invoice_notes", "stripe_payment_url", "bank_details",
)


class EngagementFields(BaseModel):
    """Everything the admin authors. All optional so drafts can be partial."""

    agreement_source: Optional[Literal["form", "pdf"]] = None
    agreement_title: Optional[str] = Field(None, max_length=255)
    scope: Optional[str] = None
    deliverables: Optional[list[Deliverable]] = None
    timeline: Optional[list[TimelinePhase]] = None
    revision_policy: Optional[str] = None
    payment_terms: Optional[str] = None
    additional_terms: Optional[str] = None

    invoice_number: Optional[str] = Field(None, max_length=50)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    line_items: Optional[list[LineItem]] = None
    invoice_due_date: Optional[date] = None
    invoice_notes: Optional[str] = None
    stripe_payment_url: Optional[str] = Field(None, max_length=500)
    bank_details: Optional[str] = None

    welcome_message: Optional[str] = None
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    contact_channel: Optional[str] = Field(None, max_length=255)
    response_time: Optional[str] = Field(None, max_length=255)
    working_hours: Optional[str] = Field(None, max_length=255)
    next_steps: Optional[list[str]] = None

    call_booking_url: Optional[str] = Field(None, max_length=500)
    call_agenda: Optional[list[str]] = None

    @field_validator("stripe_payment_url", "call_booking_url")
    @classmethod
    def _urls(cls, v: Optional[str]) -> Optional[str]:
        return _https_or_none(v)

    @field_validator("currency")
    @classmethod
    def _upper(cls, v: Optional[str]) -> Optional[str]:
        return v.upper() if v else v

    @field_validator("next_steps", "call_agenda")
    @classmethod
    def _drop_blank(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        return [s.strip() for s in v if s and s.strip()] if v is not None else None


class EngagementCreate(EngagementFields):
    project_id: str


class EngagementUpdate(EngagementFields):
    pass


class EngagementSign(BaseModel):
    signer_name: str = Field(min_length=2, max_length=255)
    signer_title: Optional[str] = Field(None, max_length=255)
    # The hash of the version on the signer's screen. Must match what is
    # stored, or the agreement changed after they loaded it.
    agreement_hash: str = Field(min_length=64, max_length=64)
    # Explicit consent to sign electronically and authority to bind the company.
    consent: bool

    @field_validator("consent")
    @classmethod
    def _must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Consent is required to sign")
        return v


class PaymentReport(BaseModel):
    method: Literal["bank", "stripe"]
    reference: Optional[str] = Field(None, max_length=255)


class CallSchedule(BaseModel):
    scheduled_for: datetime
    prep_notes: Optional[str] = Field(None, max_length=5000)


class DocumentOut(BaseModel):
    filename: str
    size_bytes: int
    page_count: int
    sha256: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class EngagementOut(BaseModel):
    id: str
    project_id: str
    stage: EngagementStage

    agreement_source: str
    document: Optional[DocumentOut]

    agreement_title: str
    scope: Optional[str]
    deliverables: Optional[list[Deliverable]]
    timeline: Optional[list[TimelinePhase]]
    revision_policy: Optional[str]
    payment_terms: Optional[str]
    additional_terms: Optional[str]
    sent_at: Optional[datetime]
    sender_name: Optional[str]
    agreement_hash: Optional[str]

    signed_at: Optional[datetime]
    signer_name: Optional[str]
    signer_title: Optional[str]
    signer_email: Optional[str]
    signer_ip: Optional[str]

    invoice_number: Optional[str]
    currency: str
    line_items: Optional[list[LineItem]]
    invoice_total: int
    invoice_due_date: Optional[date]
    invoice_notes: Optional[str]
    stripe_payment_url: Optional[str]
    bank_details: Optional[str]
    payment_reported_at: Optional[datetime]
    payment_method: Optional[str]
    payment_reference: Optional[str]
    paid_at: Optional[datetime]

    welcome_message: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    contact_channel: Optional[str]
    response_time: Optional[str]
    working_hours: Optional[str]
    next_steps: Optional[list[str]]
    welcome_read_at: Optional[datetime]

    call_booking_url: Optional[str]
    call_agenda: Optional[list[str]]
    call_scheduled_for: Optional[datetime]
    call_prep_notes: Optional[str]
    call_completed_at: Optional[datetime]

    created_at: datetime
    updated_at: datetime

    project_name: Optional[str] = None
    organization_name: Optional[str] = None

    model_config = {"from_attributes": True}


class EngagementSent(EngagementOut):
    """Response to sending: who the notice actually went to."""
    emailed: list[str] = []
