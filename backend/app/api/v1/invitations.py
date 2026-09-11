import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.time import utcnow
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User, UserRole, is_team
from app.models.organization import Organization
from app.models.invitation import Invitation
from app.schemas.invitation import (
    InvitationCreate, InvitationOut, InvitationPreview, InvitationAccept,
)
from app.services.invitations import accept_invitation
from app.services.email import send_invitation_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invitations", tags=["Invitations"])


def _new_token() -> str:
    return secrets.token_urlsafe(32)


async def _find_pending(db: AsyncSession, token: str) -> Invitation:
    result = await db.execute(
        select(Invitation)
        .options(selectinload(Invitation.organization))
        .where(Invitation.token == token)
    )
    invite = result.scalar_one_or_none()
    # Same response whether the token is wrong, spent, revoked or stale - a
    # caller holding a bad token learns nothing about which.
    if not invite or not invite.is_pending:
        raise HTTPException(status_code=404, detail="This invitation is no longer valid")
    return invite


@router.post("", response_model=InvitationOut, status_code=201)
async def create_invitation(
    data: InvitationCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, data.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Client not found")

    email = data.email.lower()

    member = (
        await db.execute(select(User).where(func.lower(User.email) == email))
    ).scalar_one_or_none()
    if member and is_team(member):
        raise HTTPException(
            status_code=409,
            detail=f"{email} is an Enigma-Cube team account and can't be invited into a client workspace.",
        )

    existing = await db.execute(
        select(Invitation).where(
            Invitation.email == email,
            Invitation.organization_id == org.id,
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
            Invitation.expires_at > utcnow(),
        )
    )
    if outstanding := existing.scalars().first():
        # Re-inviting the same address is a normal thing to do; hand back the
        # live invitation rather than accumulating duplicates.
        return outstanding

    invite = Invitation(
        organization_id=org.id, email=email, role=data.role,
        token=_new_token(), invited_by=admin.id,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    # Best-effort: the invitation exists either way, and the admin can always
    # copy the link. A mail outage must not block onboarding a client.
    try:
        invite.email_sent = await send_invitation_email(
            to=invite.email,
            organization_name=org.name,
            join_url=f"{settings.FRONTEND_URL.rstrip('/')}/join/{invite.token}",
            inviter_name=admin.full_name,
        )
    except Exception:
        # The row is already committed. Reporting a failure here would tell the
        # admin the invite did not happen when it did; they can copy the link.
        logger.exception("Invitation %s created but the email failed", invite.id)
        invite.email_sent = False

    return invite


@router.get("", response_model=list[InvitationOut])
async def list_invitations(
    organization_id: str | None = Query(None),
    include_spent: bool = Query(False),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Invitation).order_by(Invitation.created_at.desc())
    if organization_id:
        stmt = stmt.where(Invitation.organization_id == organization_id)
    if not include_spent:
        stmt = stmt.where(
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
            Invitation.expires_at > utcnow(),
        )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{invitation_id}", status_code=204)
async def revoke_invitation(
    invitation_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    invite = await db.get(Invitation, invitation_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.accepted_at:
        raise HTTPException(status_code=409, detail="This invitation has already been accepted")
    invite.revoked_at = utcnow()
    await db.commit()


@router.get("/preview", response_model=InvitationPreview)
async def preview_invitation(
    token: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Show who an invitation is for, so the join page can explain a mismatch."""
    invite = await _find_pending(db, token)
    return InvitationPreview(
        organization_name=invite.organization.name,
        email=invite.email,
        role=invite.role,
        expires_at=invite.expires_at,
    )


@router.post("/accept", response_model=InvitationOut)
async def accept(
    data: InvitationAccept,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation)
        .options(selectinload(Invitation.organization))
        .where(Invitation.token == data.token)
    )
    invite = result.scalar_one_or_none()

    # Signing in with the invited address already places the user, so by the
    # time they open the link the invitation is usually spent. Redeeming your
    # own accepted invitation succeeds rather than reporting it invalid.
    if invite and invite.accepted_by == user.id:
        return invite

    if not invite or not invite.is_pending:
        raise HTTPException(status_code=404, detail="This invitation is no longer valid")

    await accept_invitation(db, user, invite)
    await db.refresh(invite)
    return invite
