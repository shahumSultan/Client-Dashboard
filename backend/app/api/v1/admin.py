from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.core.auth import require_admin
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.project import Project
from app.models.request import Request, RequestStatus
from app.models.milestone import Milestone
from app.schemas.user import UserOut, UserRoleUpdate
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
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.is_active == True).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: str,
    data: UserRoleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Set someone's role. Admins only - staff are read-only and cannot promote."""
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Demoting yourself is the one change that can't be undone from the UI:
    # with no admin left, nobody can promote anyone back.
    if target.id == admin.id:
        raise HTTPException(status_code=409, detail="You can't change your own role.")
    # Team roles see every client. Someone inside a client's workspace getting
    # one is almost certainly a mis-click on the wrong row.
    if data.role in (UserRole.ADMIN, UserRole.STAFF) and target.organization_id:
        raise HTTPException(
            status_code=409,
            detail="This person belongs to a client workspace. Team roles are only for Enigma-Cube staff.",
        )
    target.role = data.role
    await db.commit()
    await db.refresh(target)
    return target
