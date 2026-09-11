"""Rules for the first-contact sequence that are not plain CRUD."""
import hashlib
import json
from datetime import date

from fastapi import Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utcnow
from app.models.engagement import Engagement
from app.models.invitation import Invitation
from app.models.user import User, UserRole
from app.schemas.engagement import AGREEMENT_FIELDS


def agreement_hash(e: Engagement) -> str:
    """SHA-256 over exactly what the client is asked to sign.

    Canonical JSON (sorted keys, fixed separators) so the same text always
    hashes the same, and the project id is included so one agreement's
    signature can never be presented as another's. For an uploaded PDF the
    file's own fingerprint stands in for the text: change a byte, and the
    signature no longer matches.
    """
    payload: dict = {"project_id": e.project_id}
    if e.agreement_source == "pdf":
        payload.update(
            source="pdf",
            agreement_title=e.agreement_title,
            document_sha256=e.document.sha256 if e.document else None,
        )
    else:
        for field in AGREEMENT_FIELDS:
            if field != "agreement_source":
                payload[field] = getattr(e, field)
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(blob.encode()).hexdigest()


def missing_for_send(e: Engagement) -> list[str]:
    """What must exist before an agreement can go to a client.

    The four things the agreement is for: scope, deliverables, timeline and a
    revision policy. Sending one without them invites the dispute it exists to
    prevent. An invoice with nothing to pay would strand the client at step two.
    """
    missing = []
    if e.agreement_source == "pdf":
        # Their document carries its own scope, deliverables and terms.
        if not e.document:
            missing.append("the agreement PDF")
    else:
        if not (e.scope or "").strip():
            missing.append("scope")
        if not e.deliverables:
            missing.append("deliverables")
        if not e.timeline:
            missing.append("timeline")
        if not (e.revision_policy or "").strip():
            missing.append("revision policy")
    if not e.line_items or e.invoice_total <= 0:
        missing.append("invoice line items")
    if not (e.stripe_payment_url or (e.bank_details or "").strip()):
        missing.append("a way to pay (Stripe link or bank details)")
    return missing


def client_ip(request: Request) -> str | None:
    """The signer's IP, as seen by Railway's edge.

    X-Real-IP is set by the proxy itself. X-Forwarded-For is only a fallback:
    its first entry is whatever the client chose to send, so on its own it
    would let a signer write any address into their own audit trail.
    """
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()[:64]
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # The last hop was appended by the proxy we trust, not the client.
        return forwarded.split(",")[-1].strip()[:64]
    return request.client.host if request.client else None


async def client_recipients(db: AsyncSession, organization_id: str) -> list[str]:
    """Everyone on the client side who should hear about the agreement.

    Includes people invited but not yet signed up: for a brand-new client the
    agreement email is often the first thing they receive, and signing up with
    that address places them in the workspace automatically.
    """
    members = await db.execute(
        select(User.email).where(
            User.organization_id == organization_id,
            User.is_active.is_(True),
            User.role != UserRole.ADMIN,
        )
    )
    invited = await db.execute(
        select(Invitation.email).where(
            Invitation.organization_id == organization_id,
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
            Invitation.expires_at > utcnow(),
        )
    )
    return list(dict.fromkeys([*members.scalars(), *invited.scalars()]))


async def admin_users(db: AsyncSession) -> list[User]:
    """The Enigma-Cube team - everyone who gets a bell for client activity."""
    result = await db.execute(
        select(User).where(User.role.in_((UserRole.ADMIN, UserRole.STAFF)), User.is_active.is_(True))
    )
    return list(result.scalars())


async def next_invoice_number(db: AsyncSession) -> str:
    count = (await db.execute(select(func.count(Engagement.id)))).scalar_one()
    return f"EC-{date.today().year}-{count + 1:04d}"


# Starting text for a first engagement. After that, `defaults_from` carries
# forward whatever the admin last used, so reusable terms are written once.
BUILTIN_DEFAULTS: dict = {
    "agreement_title": "Project Agreement",
    "revision_policy": (
        "Each deliverable includes two rounds of revisions. A round is one "
        "consolidated set of feedback, sent within 5 business days of delivery. "
        "Changes beyond the agreed scope, or further rounds, are quoted "
        "separately before any work begins."
    ),
    "payment_terms": (
        "50% of the project fee is due on signing, before work begins. The "
        "remaining 50% is due on final delivery, before handover of source "
        "files and credentials."
    ),
    "additional_terms": (
        "Timelines assume feedback and materials are provided within the agreed "
        "windows; delays on either side move dependent dates accordingly. On "
        "full payment, ownership of the final deliverables transfers to the "
        "client. Either party may end the engagement with 14 days' written "
        "notice; work completed to that date is billable."
    ),
    "currency": "USD",
    "response_time": "Within one business day",
    "working_hours": "Monday to Friday, 9:00–18:00",
    "next_steps": [
        "Kickoff strategy call - align on goals, creative direction and logistics",
        "Discovery - we gather materials and map the work in detail",
        "First milestone - you see real progress in your portal timeline",
    ],
    "call_agenda": [
        "Goals and what success looks like",
        "Creative direction and references",
        "Timeline and milestone review",
        "Access, logistics and points of contact",
        "Anything else important to your project",
    ],
}

# Terms that belong to the business rather than to one project. The Stripe link
# is deliberately absent: a Payment Link is priced, so it is per-invoice.
REUSABLE_FIELDS = (
    "revision_policy", "payment_terms", "additional_terms", "currency",
    "bank_details", "contact_email", "contact_phone",
    "contact_channel", "response_time", "working_hours", "next_steps",
    "call_booking_url", "call_agenda",
)


async def defaults_from(db: AsyncSession) -> dict:
    latest = (
        await db.execute(select(Engagement).order_by(Engagement.created_at.desc()).limit(1))
    ).scalar_one_or_none()
    values = dict(BUILTIN_DEFAULTS)
    if latest:
        for field in REUSABLE_FIELDS:
            value = getattr(latest, field)
            if value not in (None, "", []):
                values[field] = value
    values["invoice_number"] = await next_invoice_number(db)
    return values
