"""Enigma-Cube's own records: profile, bank accounts, team and documents.

Everything here belongs to the company, not to a client. None of it is scoped by
organization_id, and the API keeps it on the team side of the line (admins
write, staff read, clients never see it).
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON, Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utcnow
from app.database import Base

# The single profile row's fixed key. A table with one row is simpler to reason
# about than a key-value settings table, and the fixed id makes "upsert the
# profile" a plain get-or-create.
PROFILE_ID = "company"

DOCUMENT_CATEGORIES = (
    "legal", "finance", "hr", "brand", "contracts", "policies", "other",
)


class CompanyProfile(Base):
    __tablename__ = "company_profile"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=PROFILE_ID)
    legal_name: Mapped[str | None] = mapped_column(String(255))
    trading_name: Mapped[str | None] = mapped_column(String(255))
    registration_number: Mapped[str | None] = mapped_column(String(100))
    tax_number: Mapped[str | None] = mapped_column(String(100))
    registered_address: Mapped[str | None] = mapped_column(Text)
    office_address: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    website: Mapped[str | None] = mapped_column(String(255))
    # {"linkedin": "...", "instagram": "..."} - open-ended on purpose.
    socials: Mapped[dict | None] = mapped_column(JSON)
    notes: Mapped[str | None] = mapped_column(Text)
    updated_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class CompanyBankAccount(Base):
    __tablename__ = "company_bank_accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    label: Mapped[str] = mapped_column(String(100), nullable=False)       # "Main PKR account"
    bank_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number: Mapped[str | None] = mapped_column(String(100))
    iban: Mapped[str | None] = mapped_column(String(64))
    swift: Mapped[str | None] = mapped_column(String(32))
    branch: Mapped[str | None] = mapped_column(Text)                      # branch name / address
    currency: Mapped[str | None] = mapped_column(String(10))
    notes: Mapped[str | None] = mapped_column(Text)
    # The account that pre-fills new invoices.
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        # At most one default. Same shape as the letterhead's is_current index,
        # and declared on the model because the tests use create_all.
        Index(
            "uq_company_bank_default",
            "is_default",
            unique=True,
            postgresql_where=text("is_default"),
        ),
    )


class TeamMember(Base):
    """A person at Enigma-Cube - not necessarily someone with a portal login."""

    __tablename__ = "company_team_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class CompanyDocument(Base):
    """A company file. The file fields mirror its latest version.

    The bytes live in object storage under company/; the bucket is private and
    every download goes through a short-lived signed URL.
    """

    __tablename__ = "company_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="other")
    tags: Mapped[list | None] = mapped_column(JSON)                       # [str]
    # Licences, certificates, insurance - surfaced on the overview before they lapse.
    expires_on: Mapped[date | None] = mapped_column(Date)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Latest version, denormalised so the list never needs a join.
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)

    uploaded_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    versions: Mapped[list["CompanyDocumentVersion"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="CompanyDocumentVersion.version.desc()",
    )


class CompanyDocumentVersion(Base):
    """Every file ever uploaded for a document, current one included."""

    __tablename__ = "company_document_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(
        String, ForeignKey("company_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    uploaded_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    document: Mapped[CompanyDocument] = relationship(back_populates="versions")
