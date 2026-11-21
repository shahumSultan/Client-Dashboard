"""Joining and leaving the Enigma-Cube team, kept in one place.

An account joins the team by redeeming a team invitation, by an admin
setting a team role, or by having its access restored. It leaves by moving to
a client role or having its access removed. Either way its Team directory
entry and department seats follow, so the directory and departments always
describe the team as it is. Callers commit.
"""
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Department, DepartmentMember, TeamMember
from app.models.notification import TASK_NOTIFICATION_TYPES, Notification
from app.models.user import User, UserRole


async def join_team(db: AsyncSession, user: User) -> None:
    """Make sure a team account has a current Team directory entry.

    Re-activates its own entry if it had one (someone returning), else links
    an unclaimed entry with the same email (admins often list people before
    inviting them), else creates one.
    """
    own = (
        await db.execute(select(TeamMember).where(TeamMember.user_id == user.id).limit(1))
    ).scalar_one_or_none()
    if own:
        own.is_active = True
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


async def leave_team(db: AsyncSession, user_id: str) -> None:
    """Take an account out of every department and lead seat, mark its
    directory entry as former (kept, so the history of who was here stays),
    and clear the task notifications from its bell.

    Left in place, a client or ex-colleague would show up as part of the
    company, and a department they led could no longer be saved: the update
    re-checks the lead and refuses a non-team account.
    """
    await db.execute(delete(DepartmentMember).where(DepartmentMember.user_id == user_id))
    await db.execute(
        update(Department).where(Department.lead_user_id == user_id).values(lead_user_id=None)
    )
    await db.execute(
        update(TeamMember).where(TeamMember.user_id == user_id).values(is_active=False)
    )
    # Their bell held internal task titles and comment text; a client (or an
    # ex-colleague, should access come back later) must not keep them.
    await db.execute(
        delete(Notification).where(
            Notification.user_id == user_id, Notification.type.in_(TASK_NOTIFICATION_TYPES)
        )
    )


async def visible_people(db: AsyncSession, viewer: User) -> set[str] | None:
    """Accounts an employee may see: colleagues who share a department with
    them, every admin (so they know who to ask), and themselves.

    None means no limit - an admin sees everyone. Employees in different
    departments don't see each other, nor each other's tasks.
    """
    if viewer.role == UserRole.ADMIN:
        return None
    mine = select(DepartmentMember.department_id).where(DepartmentMember.user_id == viewer.id)
    colleagues = await db.execute(
        select(DepartmentMember.user_id).where(DepartmentMember.department_id.in_(mine))
    )
    admins = await db.execute(select(User.id).where(User.role == UserRole.ADMIN))
    return {viewer.id, *colleagues.scalars(), *admins.scalars()}


async def names(db: AsyncSession, users: "list[User] | set[User]") -> dict[str, str]:
    """What to call each account, the same everywhere: its Team directory
    name (what admins see and edit on Company -> Team), else the name on its
    login, else its email. Many accounts sign up without a name, so the
    login alone often has only the email.
    """
    users = list(users)
    if not users:
        return {}
    rows = await db.execute(
        select(TeamMember.user_id, TeamMember.name)
        .where(TeamMember.user_id.in_([u.id for u in users]))
        # A current entry wins over a former one.
        .order_by(TeamMember.is_active)
    )
    listed = {uid: name for uid, name in rows if name and name.strip()}
    return {u.id: (listed.get(u.id) or u.full_name or u.email) for u in users}


async def name_of(db: AsyncSession, user: User | None) -> str | None:
    return (await names(db, [user]))[user.id] if user else None
