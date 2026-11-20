"""Redeeming invitations.

Kept out of the router because `core.auth` needs the auto-accept path and the
router imports `core.auth` - putting them together would be circular.
"""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.core.time import utcnow
from app.models.user import User, is_team
from app.models.invitation import Invitation
from app.models.company import TeamMember


async def accept_invitation(db: AsyncSession, user: User, invite: Invitation) -> User:
    """Attach a user to the invited organization, or to the team.

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
            detail=(
                "This account is already on the Enigma-Cube team. Change its role on the Users page."
                if invite.is_team_invite
                else "This is an Enigma-Cube team account, so it can't join a client workspace."
            ),
        )

    return await _redeem(db, user, invite)


async def _redeem(db: AsyncSession, user: User, invite: Invitation) -> User:
    user.organization_id = invite.organization_id
    user.role = invite.role
    invite.accepted_at = utcnow()
    invite.accepted_by = user.id
    if invite.is_team_invite:
        await _link_directory_entry(db, user)
    await db.commit()
    await db.refresh(user)
    return user


async def _link_directory_entry(db: AsyncSession, user: User) -> None:
    """Put a new team account in the Team directory.

    Links an existing entry with the same email (admins often list people
    before inviting them) instead of creating a duplicate.
    """
    already = await db.execute(select(TeamMember.id).where(TeamMember.user_id == user.id))
    if already.first():
        return
    match = (
        await db.execute(
            select(TeamMember)
            .where(func.lower(TeamMember.email) == user.email.lower(), TeamMember.user_id.is_(None))
            .limit(1)
        )
    ).scalar_one_or_none()
    if match:
        match.user_id = user.id
        match.is_active = True
        return
    db.add(TeamMember(
        name=user.full_name or user.email.split("@")[0],
        email=user.email,
        user_id=user.id,
    ))


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

    return await _redeem(db, user, invite)
