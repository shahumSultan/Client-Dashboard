"""The first-contact sequence: agreement → invoice → welcome → kickoff call.

Admins author and send it; the client works through it in order. Each client
action is only accepted once the step before it is done, so the order is
enforced here rather than trusted to the UI.
"""
import hashlib
import html
import logging
import re
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, undefer

from app.config import settings
from app.core.auth import get_current_user, require_admin
from app.core.time import utcnow
from app.database import get_db
from app.models.engagement import Engagement, EngagementDocument
from app.models.notification import NotificationType
from app.models.project import Project
from app.models.user import User, UserRole, is_team
from app.schemas.engagement import (
    AGREEMENT_FIELDS, INVOICE_FIELDS,
    EngagementCreate, EngagementUpdate, EngagementOut, EngagementSent,
    EngagementSign, PaymentReport, CallSchedule,
)
from app.services import engagements as rules
from app.services import documents as pdfs
from app.services.email import send_project_email, is_test_address
from app.services.notifications import create_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/engagements", tags=["Engagements"])


def _load():
    return select(Engagement).options(
        selectinload(Engagement.project).selectinload(Project.organization),
        selectinload(Engagement.sender),
        selectinload(Engagement.document),
    )


def _out(e: Engagement, schema=EngagementOut, **extra):
    return schema.model_validate(e).model_copy(update={
        "project_name": e.project.name,
        "organization_name": e.project.organization.name,
        **extra,
    })


def _portal(path: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


async def _get(db: AsyncSession, engagement_id: str, user: User) -> Engagement:
    e = (await db.execute(_load().where(Engagement.id == engagement_id))).scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    if is_team(user):
        return e
    # A draft does not exist as far as the client is concerned, and neither
    # does another organization's paperwork. Same 404 for both.
    if (
        e.project.organization_id != user.organization_id
        or not e.project.is_active
        or e.sent_at is None
    ):
        raise HTTPException(status_code=404, detail="Not found")
    return e


def _client_only(user: User) -> None:
    # A signature or a payment claim is only meaningful from the client. An
    # admin acting "on their behalf" would forge exactly the evidence the
    # audit trail exists to provide.
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only the client can do this")


async def _tell_admins(
    db: AsyncSession, e: Engagement, actor: User, title: str, body: str
) -> None:
    """Bell notification for every admin, plus one email to the business inbox."""
    link = f"/admin/projects/{e.project_id}/onboarding"
    for admin in await rules.admin_users(db):
        await create_notification(
            db, admin.id, NotificationType.ONBOARDING_STEP, title, body, link
        )
    # Activity by a test account is not client activity — keep it out of the inbox.
    if is_test_address(actor.email) or not settings.ADMIN_NOTIFICATION_EMAIL:
        return
    try:
        await send_project_email(
            to=[settings.ADMIN_NOTIFICATION_EMAIL],
            subject=title,
            title=html.escape(title),
            paragraphs=[html.escape(body)],
            cta_label="Open onboarding",
            cta_url=_portal(link),
        )
    except Exception:
        logger.exception("Admin email for engagement %s failed", e.id)


async def _tell_client(db: AsyncSession, e: Engagement, title: str, body: str) -> None:
    members = await db.execute(
        select(User).where(
            User.organization_id == e.project.organization_id,
            User.role != UserRole.ADMIN,
            User.is_active.is_(True),
        )
    )
    for member in members.scalars():
        await create_notification(
            db, member.id, NotificationType.ONBOARDING_STEP, title, body,
            f"/onboarding/{e.id}",
        )


# ── Admin ────────────────────────────────────────────────────────────────────

@router.get("/defaults")
async def get_defaults(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Starting values for a new engagement — the terms you used last time."""
    return await rules.defaults_from(db)


@router.post("", response_model=EngagementOut, status_code=201)
async def create_engagement(
    data: EngagementCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, data.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = await db.execute(select(Engagement).where(Engagement.project_id == project.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This project already has onboarding")

    fields = {k: v for k, v in data.model_dump(exclude={"project_id"}).items() if v is not None}
    e = Engagement(project_id=project.id, **fields)
    if not e.invoice_number:
        e.invoice_number = await rules.next_invoice_number(db)
    db.add(e)
    await db.commit()
    return _out(await _get(db, e.id, admin))


@router.get("", response_model=list[EngagementOut])
async def list_engagements(
    project_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = _load().join(Project).order_by(Engagement.created_at.desc())
    if project_id:
        stmt = stmt.where(Engagement.project_id == project_id)
    if not is_team(user):
        if not user.organization_id:
            return []
        stmt = stmt.where(
            Project.organization_id == user.organization_id,
            Project.is_active.is_(True),
            Engagement.sent_at.is_not(None),
        )
    return [_out(e) for e in (await db.execute(stmt)).scalars()]


@router.get("/{engagement_id}", response_model=EngagementOut)
async def get_engagement(
    engagement_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return _out(await _get(db, engagement_id, user))


@router.patch("/{engagement_id}", response_model=EngagementOut)
async def update_engagement(
    engagement_id: str,
    data: EngagementUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, engagement_id, admin)
    # Only fields whose value actually differs count as edits, so the admin
    # form can save every section at once without tripping the locks below.
    changes = {
        f: v for f, v in data.model_dump(exclude_unset=True).items()
        if getattr(e, f) != v
    }

    if e.sent_at and any(f in changes for f in AGREEMENT_FIELDS):
        raise HTTPException(
            status_code=409,
            detail=(
                "This agreement is signed and can no longer change."
                if e.signed_at
                else "The agreement has been sent. Recall it to make changes."
            ),
        )
    if e.is_paid and any(f in changes for f in INVOICE_FIELDS):
        raise HTTPException(
            status_code=409, detail="The client has already paid against this invoice."
        )

    for field, value in changes.items():
        setattr(e, field, value)
    await db.commit()
    return _out(await _get(db, e.id, admin))


@router.delete("/{engagement_id}", status_code=204)
async def delete_engagement(
    engagement_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, engagement_id, admin)
    if e.signed_at:
        raise HTTPException(status_code=409, detail="A signed agreement cannot be deleted")
    await db.delete(e)
    await db.commit()


@router.post("/{engagement_id}/send", response_model=EngagementSent)
async def send_engagement(
    engagement_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, engagement_id, admin)
    if e.sent_at:
        raise HTTPException(status_code=409, detail="Already sent")
    if missing := rules.missing_for_send(e):
        raise HTTPException(status_code=422, detail="Still missing: " + ", ".join(missing))

    e.sent_at = utcnow()
    e.sent_by = admin.id
    e.agreement_hash = rules.agreement_hash(e)
    await db.commit()
    e = await _get(db, e.id, admin)

    project = html.escape(e.project.name)
    await _tell_client(
        db, e, "Your project agreement is ready",
        f"Review and sign the agreement for {e.project.name} to get started.",
    )
    emailed: list[str] = []
    try:
        emailed = await send_project_email(
            to=await rules.client_recipients(db, e.project.organization_id),
            subject=f"Your agreement for {e.project.name} is ready to sign",
            title="Let's make it official",
            paragraphs=[
                f"Thank you for choosing Enigma&#8209;Cube. Your agreement for "
                f'<strong style="color:#0d0d0d;">{project}</strong> is ready — it sets '
                f"out the scope, deliverables, timeline and revision policy in one place.",
                "It takes about two minutes: review, sign, and the invoice and "
                "your welcome pack open straight after.",
                "New to the portal? Sign up with this email address and you will "
                "land in your workspace automatically.",
            ],
            cta_label="Review & sign",
            cta_url=_portal(f"/onboarding/{e.id}"),
        )
    except Exception:
        logger.exception("Agreement email for engagement %s failed", e.id)

    return _out(e, EngagementSent, emailed=emailed)


@router.post("/{engagement_id}/recall", response_model=EngagementOut)
async def recall_engagement(
    engagement_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Pull a sent agreement back to draft to fix it. Impossible once signed."""
    e = await _get(db, engagement_id, admin)
    if e.signed_at:
        raise HTTPException(status_code=409, detail="A signed agreement cannot be recalled")
    e.sent_at = None
    e.sent_by = None
    e.agreement_hash = None
    await db.commit()
    return _out(await _get(db, e.id, admin))


@router.post("/{engagement_id}/confirm-payment", response_model=EngagementOut)
async def confirm_payment(
    engagement_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, engagement_id, admin)
    if not e.signed_at:
        raise HTTPException(status_code=409, detail="The agreement is not signed yet")
    if e.paid_at:
        return _out(e)
    e.paid_at = utcnow()
    await db.commit()
    await _tell_client(
        db, e, "Payment received",
        f"Thank you — payment for {e.project.name} is confirmed.",
    )
    return _out(await _get(db, e.id, admin))


@router.post("/{engagement_id}/complete-call", response_model=EngagementOut)
async def complete_call(
    engagement_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, engagement_id, admin)
    if not e.call_scheduled_for:
        raise HTTPException(status_code=409, detail="No call has been scheduled")
    e.call_completed_at = e.call_completed_at or utcnow()
    await db.commit()
    return _out(await _get(db, e.id, admin))


# ── Uploaded agreement PDF ───────────────────────────────────────────────────

@router.put("/{engagement_id}/document", response_model=EngagementOut)
async def upload_document(
    engagement_id: str,
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Use the admin's own PDF as the agreement. Replaces any earlier upload."""
    e = await _get(db, engagement_id, admin)
    if e.sent_at:
        raise HTTPException(status_code=409, detail="The agreement has been sent. Recall it to change the document.")

    # Read one byte past the cap so an oversized upload is caught without
    # holding an arbitrarily large body in memory.
    data = await file.read(pdfs.MAX_PDF_BYTES + 1)
    try:
        pages = pdfs.inspect_pdf(data)
    except pdfs.InvalidPdf as err:
        raise HTTPException(status_code=422, detail=str(err))

    name = (file.filename or "agreement.pdf").rsplit("/", 1)[-1][:255]
    if e.document:
        await db.delete(e.document)
        await db.flush()
    e.document = EngagementDocument(
        filename=name, size_bytes=len(data), page_count=pages,
        sha256=hashlib.sha256(data).hexdigest(), data=data, uploaded_by=admin.id,
    )
    e.agreement_source = "pdf"
    await db.commit()
    return _out(await _get(db, e.id, admin))


@router.delete("/{engagement_id}/document", response_model=EngagementOut)
async def remove_document(
    engagement_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, engagement_id, admin)
    if e.sent_at:
        raise HTTPException(status_code=409, detail="The agreement has been sent. Recall it to change the document.")
    if e.document:
        await db.delete(e.document)
    e.agreement_source = "form"
    await db.commit()
    return _out(await _get(db, e.id, admin))


def _pdf_response(data: bytes, filename: str) -> Response:
    safe = re.sub(r'[^A-Za-z0-9._ -]', "_", filename) or "agreement.pdf"
    return Response(
        content=data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{safe}"',
            # Contracts — keep them out of shared and browser caches.
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


async def _document_bytes(db: AsyncSession, e: Engagement) -> bytes:
    if not e.document:
        raise HTTPException(status_code=404, detail="No document uploaded")
    row = await db.execute(
        select(EngagementDocument).options(undefer(EngagementDocument.data))
        .where(EngagementDocument.id == e.document.id)
        .execution_options(populate_existing=True)
    )
    return row.scalar_one().data


@router.get("/{engagement_id}/document")
async def get_document(
    engagement_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    e = await _get(db, engagement_id, user)
    return _pdf_response(await _document_bytes(db, e), e.document.filename)


@router.get("/{engagement_id}/document/signed")
async def get_signed_document(
    engagement_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The uploaded PDF with a signature certificate appended as its last page."""
    e = await _get(db, engagement_id, user)
    if not e.signed_at:
        raise HTTPException(status_code=409, detail="Not signed yet")
    data = pdfs.signed_copy(e, await _document_bytes(db, e))
    stem = e.document.filename.rsplit(".", 1)[0]
    return _pdf_response(data, f"{stem} (signed).pdf")


# ── Client ───────────────────────────────────────────────────────────────────

@router.post("/{engagement_id}/sign", response_model=EngagementOut)
async def sign_agreement(
    engagement_id: str,
    data: EngagementSign,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _client_only(user)
    e = await _get(db, engagement_id, user)
    if e.signed_at:
        raise HTTPException(status_code=409, detail="This agreement is already signed")
    if data.agreement_hash != e.agreement_hash or e.agreement_hash != rules.agreement_hash(e):
        raise HTTPException(
            status_code=409,
            detail="This agreement changed since you opened it. Reload to see the current version.",
        )

    e.signed_at = utcnow()
    e.signed_by = user.id
    e.signer_name = data.signer_name.strip()
    e.signer_title = (data.signer_title or "").strip() or None
    e.signer_email = user.email
    e.signer_ip = rules.client_ip(request)
    e.signer_user_agent = (request.headers.get("user-agent") or "")[:500]
    await db.commit()

    e = await _get(db, e.id, user)
    await _tell_admins(
        db, e, user, f"{e.project.organization.name} signed the agreement",
        f"{e.signer_name} signed the agreement for {e.project.name}. The invoice is now open to them.",
    )
    return _out(e)


@router.post("/{engagement_id}/report-payment", response_model=EngagementOut)
async def report_payment(
    engagement_id: str,
    data: PaymentReport,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _client_only(user)
    e = await _get(db, engagement_id, user)
    if not e.signed_at:
        raise HTTPException(status_code=409, detail="Sign the agreement first")
    if e.is_paid:
        return _out(e)

    e.payment_reported_at = utcnow()
    e.payment_reported_by = user.id
    e.payment_method = data.method
    e.payment_reference = (data.reference or "").strip() or None
    await db.commit()

    e = await _get(db, e.id, user)
    via = "Stripe" if data.method == "stripe" else "bank transfer"
    ref = f" (ref: {e.payment_reference})" if e.payment_reference else ""
    await _tell_admins(
        db, e, user, f"{e.project.organization.name} reported a payment",
        f"Invoice {e.invoice_number} for {e.project.name} was paid by {via}{ref}. "
        "Confirm it once the funds arrive.",
    )
    return _out(e)


@router.post("/{engagement_id}/welcome-read", response_model=EngagementOut)
async def mark_welcome_read(
    engagement_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _client_only(user)
    e = await _get(db, engagement_id, user)
    if not e.is_paid:
        raise HTTPException(status_code=409, detail="The welcome pack opens after payment")
    e.welcome_read_at = e.welcome_read_at or utcnow()
    await db.commit()
    return _out(await _get(db, e.id, user))


@router.post("/{engagement_id}/schedule-call", response_model=EngagementOut)
async def schedule_call(
    engagement_id: str,
    data: CallSchedule,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record when the kickoff call is. Either side may set it."""
    e = await _get(db, engagement_id, user)
    if not e.is_paid:
        raise HTTPException(status_code=409, detail="The kickoff call opens after payment")

    first_time = e.call_scheduled_for is None
    # Stored naive UTC like every other timestamp in the schema.
    when = data.scheduled_for
    if when.tzinfo is not None:
        when = when.astimezone(timezone.utc).replace(tzinfo=None)
    e.call_scheduled_for = when
    if data.prep_notes is not None:
        e.call_prep_notes = data.prep_notes.strip() or None
    e.call_completed_at = None
    await db.commit()

    e = await _get(db, e.id, user)
    if user.role != UserRole.ADMIN:
        await _tell_admins(
            db, e, user,
            f"{e.project.organization.name} {'booked' if first_time else 'moved'} the kickoff call",
            f"Kickoff for {e.project.name}: {e.call_scheduled_for:%a %d %b %Y, %H:%M} UTC.",
        )
    return _out(e)
