from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.core.auth import require_admin
from app.models.user import User
from app.models.organization import Organization
from app.models.project import Project
from app.models.request import Request, RequestStatus
from app.models.milestone import Milestone
from app.schemas.user import UserOut
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


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import UserRole
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        from fastapi import HTTPException
        raise HTTPException(404, "User not found")
    target.role = UserRole(body["role"])
    await db.commit()
    await db.refresh(target)
    from app.schemas.user import UserOut
    return UserOut.model_validate(target)
