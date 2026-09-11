import enum
import uuid
from datetime import datetime, date

from sqlalchemy import String, DateTime, Date, ForeignKey, Text, JSON, Integer, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship, deferred

from app.core.time import utcnow
from app.database import Base


class EngagementStage(str, enum.Enum):
    """Where a client is in the first-contact sequence.

    Derived from timestamps rather than stored, so it can never disagree with
    the record it describes.
    """
    DRAFT = "draft"                          # admin is still preparing it
    AWAITING_SIGNATURE = "awaiting_signature"
    AWAITING_PAYMENT = "awaiting_payment"
    KICKOFF = "kickoff"                      # paid (or payment reported); call + welcome remain
    COMPLETE = "complete"


class Engagement(Base):
    """Everything a client receives after deciding to go ahead with a project.

    One per project: the agreement, the invoice, the welcome note and the
    kickoff call. Kept on a single row because they are always read together
    and each depends on the one before — the invoice opens only once the
    agreement is signed.

    The agreement fields are frozen from the moment it is sent: `agreement_hash`
    is taken over them and the client must present the same hash to sign, so
    nobody can sign a version that changed underneath them.
    """

    __tablename__ = "engagements"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # ── 1. Agreement ─────────────────────────────────────────────────────────
    # "form": assembled from the fields below. "pdf": the admin's own document,
    # uploaded as-is — the fields are then unused and `document` is what is signed.
    agreement_source: Mapped[str] = mapped_column(String(10), default="form", server_default="form")
    agreement_title: Mapped[str] = mapped_column(String(255), default="Project Agreement")
    scope: Mapped[str | None] = mapped_column(Text)
    deliverables: Mapped[list | None] = mapped_column(JSON)    # [{title, detail}]
    timeline: Mapped[list | None] = mapped_column(JSON)        # [{phase, duration}]
    revision_policy: Mapped[str | None] = mapped_column(Text)
    payment_terms: Mapped[str | None] = mapped_column(Text)
    additional_terms: Mapped[str | None] = mapped_column(Text)

    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    sent_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    agreement_hash: Mapped[str | None] = mapped_column(String(64))

    # The signature and the evidence around it — what makes a click-to-sign
    # attributable: who, when, from where, and exactly what they saw.
    signed_at: Mapped[datetime | None] = mapped_column(DateTime)
    signed_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    signer_name: Mapped[str | None] = mapped_column(String(255))
    signer_title: Mapped[str | None] = mapped_column(String(255))
    signer_email: Mapped[str | None] = mapped_column(String(255))
    signer_ip: Mapped[str | None] = mapped_column(String(64))
    signer_user_agent: Mapped[str | None] = mapped_column(String(500))

    # ── 2. Invoice ───────────────────────────────────────────────────────────
    invoice_number: Mapped[str | None] = mapped_column(String(50))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    line_items: Mapped[list | None] = mapped_column(JSON)      # [{description, quantity, unit_amount}] — minor units
    invoice_due_date: Mapped[date | None] = mapped_column(Date)
    invoice_notes: Mapped[str | None] = mapped_column(Text)
    stripe_payment_url: Mapped[str | None] = mapped_column(String(500))
    bank_details: Mapped[str | None] = mapped_column(Text)

    # Reported by the client ("I've paid"), then confirmed by the admin once the
    # money lands. The client moves on at the first; the books close at the second.
    payment_reported_at: Mapped[datetime | None] = mapped_column(DateTime)
    payment_reported_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    payment_method: Mapped[str | None] = mapped_column(String(20))   # bank | stripe
    payment_reference: Mapped[str | None] = mapped_column(String(255))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)

    # ── 3. Welcome ───────────────────────────────────────────────────────────
    welcome_message: Mapped[str | None] = mapped_column(Text)
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    contact_channel: Mapped[str | None] = mapped_column(String(255))   # e.g. "Slack — #acme-build"
    response_time: Mapped[str | None] = mapped_column(String(255))
    working_hours: Mapped[str | None] = mapped_column(String(255))
    next_steps: Mapped[list | None] = mapped_column(JSON)              # [str]
    welcome_read_at: Mapped[datetime | None] = mapped_column(DateTime)

    # ── 5. Strategy call ─────────────────────────────────────────────────────
    call_booking_url: Mapped[str | None] = mapped_column(String(500))
    call_agenda: Mapped[list | None] = mapped_column(JSON)             # [str]
    call_scheduled_for: Mapped[datetime | None] = mapped_column(DateTime)
    call_prep_notes: Mapped[str | None] = mapped_column(Text)          # from the client
    call_completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    project: Mapped["Project"] = relationship("Project")
    document: Mapped["EngagementDocument | None"] = relationship(
        "EngagementDocument", uselist=False, cascade="all, delete-orphan",
        back_populates="engagement",
    )
    sender: Mapped["User | None"] = relationship("User", foreign_keys=[sent_by])

    @property
    def is_paid(self) -> bool:
        """Paid for the purpose of moving forward — reported counts."""
        return self.paid_at is not None or self.payment_reported_at is not None

    @property
    def stage(self) -> EngagementStage:
        if self.sent_at is None:
            return EngagementStage.DRAFT
        if self.signed_at is None:
            return EngagementStage.AWAITING_SIGNATURE
        if not self.is_paid:
            return EngagementStage.AWAITING_PAYMENT
        if self.welcome_read_at is None or self.call_scheduled_for is None:
            return EngagementStage.KICKOFF
        return EngagementStage.COMPLETE

    @property
    def invoice_total(self) -> int:
        return sum(
            int(item.get("quantity", 1) or 0) * int(item.get("unit_amount", 0) or 0)
            for item in (self.line_items or [])
        )

    @property
    def sender_name(self) -> str | None:
        return self.sender.full_name if self.sender else None


class EngagementDocument(Base):
    """An agreement the admin wrote elsewhere and uploaded as a PDF.

    Kept in the database rather than object storage: it is one file per
    project, capped small, and it has to live exactly as long as the signature
    that refers to it. The bytes are deferred so loading an engagement does not
    drag the file along with it.
    """

    __tablename__ = "engagement_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    engagement_id: Mapped[str] = mapped_column(
        String, ForeignKey("engagements.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    data: Mapped[bytes] = deferred(mapped_column(LargeBinary, nullable=False))
    uploaded_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    engagement: Mapped["Engagement"] = relationship("Engagement", back_populates="document")
