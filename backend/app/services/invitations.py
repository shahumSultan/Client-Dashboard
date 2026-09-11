"""Redeeming invitations.

Kept out of the router because `core.auth` needs the auto-accept path and the
router imports `core.auth` - putting them together would be circular.
"""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.time import utcnow
from app.models.user import User, is_team
from app.models.invitation import Invitation


async def accept_invitation(db: AsyncSession, user: User, invite: Invitation) -> User:
    """Attach a user to the invited organization.

    The email binding is the control that makes a link safe to send: holding
    the token is not enough, you must also be signed in as the invitee.
    """
    if invite.email.lower() != (user.email or "").lower():
        raise HTTPException(
            status_code=403,
            detail=f"This invitation was sent to {invite.email}. Sign in with that address to accept it.",
        )
    if user.organization_id and user.organization_id != invite.organization_id:
        raise HTTPException(status_code=409, detail="This account already belongs to a workspace")
    # Accepting would rewrite the role to a client one - for an admin, a
    # self-demotion nobody might be left to undo.
    if is_team(user):
        raise HTTPException(
            status_code=409,
            detail="This is an Enigma-Cube team account, so it can't join a client workspace.",
        )

    user.organization_id = invite.organization_id
    user.role = invite.role
    invite.accepted_at = utcnow()
    invite.accepted_by = user.id
    await db.commit()
    await db.refresh(user)
    return user


async def auto_accept_matching_invitation(db: AsyncSession, user: User) -> User:
    """Redeem a pending invitation addressed to this user, if one exists.

    Called for users with no organization, so a client who simply signs up with
    the address you invited lands in the right workspace without touching a
    link. The token flow stays available for anything unusual.
    """
    # Team accounts never have a workspace, so without this check they would
    # hit it on every request - and one client invitation to their address
    # would silently rewrite their role to a client one.
    if user.organization_id or not user.email or is_team(user):
        return user

    result = await db.execute(
        select(Invitation)
        .where(
            Invitation.email == user.email.lower(),
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
            Invitation.expires_at > utcnow(),
        )
        .order_by(Invitation.created_at.desc())
    )
    invite = result.scalars().first()
    if not invite:
        return user

    user.organization_id = invite.organization_id
    user.role = invite.role
    invite.accepted_at = utcnow()
    invite.accepted_by = user.id
    await db.commit()
    await db.refresh(user)
    return user
