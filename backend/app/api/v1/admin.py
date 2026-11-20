from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.services.team import join_team, leave_team
from app.database import get_db
from app.core.auth import require_admin
from app.models.user import TEAM_ROLES, User, UserRole
from app.models.organization import Organization
from app.models.project import Project
from app.models.request import Request, RequestStatus
from app.models.milestone import Milestone
from app.schemas.user import UserAccessUpdate, UserOut, UserRoleUpdate
from app.schemas.request import RequestOut

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
async def get_stats(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    clients = await db.scalar(select(func.count()).select_from(Organization).where(Organization.is_active == True))
    projects = await db.scalar(select(func.count()).select_from(Project).where(Project.is_active == True))
    open_requests = await db.scalar(
        select(func.count()).select_from(Request).where(
            Request.status.in_([RequestStatus.PENDING, RequestStatus.IN_PROGRESS])
        )
    )
    total_users = await db.scalar(select(func.count()).select_from(User).where(User.is_active == True))
    return {
        "clients": clients,
        "projects": projects,
        "open_requests": open_requests,
        "total_users": total_users,
    }


@router.get("/requests", response_model=list[RequestOut])
async def list_all_requests(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Request).order_by(Request.created_at.desc())
    )
    return result.scalars().all()


@router.get("/users", response_model=list[UserOut])
async def list_all_users(
    include_inactive: bool = Query(False),
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(User.created_at.desc())
    if not include_inactive:
        stmt = stmt.where(User.is_active.is_(True))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: str,
    data: UserRoleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Set someone's role. Admins only."""
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Demoting yourself is the one change that can't be undone from the UI:
    # with no admin left, nobody can promote anyone back.
    if target.id == admin.id:
        raise HTTPException(status_code=409, detail="You can't change your own role.")
    # Team roles are for Enigma-Cube people. Someone inside a client's
    # workspace getting one is almost certainly a mis-click on the wrong row.
    if data.role in TEAM_ROLES and target.organization_id:
        raise HTTPException(
            status_code=409,
            detail="This person belongs to a client workspace. Team roles are only for Enigma-Cube staff.",
        )
    was_team = target.role in TEAM_ROLES
    target.role = data.role
    if was_team and data.role not in TEAM_ROLES:
        await leave_team(db, target.id)
    elif data.role in TEAM_ROLES and not was_team and target.is_active:
        await join_team(db, target)
    await db.commit()
    await db.refresh(target)
    return target


@router.get("/users/waiting", response_model=list[UserOut])
async def list_waiting_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """People who signed up without an invitation and belong nowhere yet.

    Access is invite-only, so they sit on a "waiting for access" screen until
    an admin adds them to the team or invites them into a client workspace.
    A pending invitation for their address would already have placed them.
    """
    result = await db.execute(
        select(User)
        .where(
            User.is_active.is_(True),
            User.organization_id.is_(None),
            User.role.not_in(TEAM_ROLES),
        )
        .order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/users/{user_id}/access", response_model=UserOut)
async def set_user_access(
    user_id: str,
    data: UserAccessUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove someone's access, or restore it.

    Removing it signs them out of the portal on their next request (every
    route refuses an inactive account) without deleting anything they made.
    A team account also leaves its departments and becomes a former member in
    the directory; restoring it puts the directory entry back.
    """
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id:
        raise HTTPException(status_code=409, detail="You can't remove your own access.")
    if target.is_active == data.active:
        return target
    target.is_active = data.active
    if target.role in TEAM_ROLES:
        if data.active:
            await join_team(db, target)
        else:
            await leave_team(db, target.id)
    await db.commit()
    await db.refresh(target)
    return target
