"""Keeping department membership in step with who is on the team."""
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Department, DepartmentMember


async def remove_from_departments(db: AsyncSession, user_id: str) -> None:
    """Take someone out of every department and every lead seat.

    Called when an account leaves the team (its role changes to a client
    one). Left in place, a client would show up as part of the company, and
    any department they led could no longer be saved: the update re-checks
    the lead and refuses a non-team account. The caller commits.
    """
    await db.execute(delete(DepartmentMember).where(DepartmentMember.user_id == user_id))
    await db.execute(
        update(Department).where(Department.lead_user_id == user_id).values(lead_user_id=None)
    )
