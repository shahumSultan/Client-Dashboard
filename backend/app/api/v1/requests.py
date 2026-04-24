from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.core.permissions import assert_project_access
from app.models.user import User, UserRole
from app.models.request import Request, RequestStatus
from app.schemas.request import RequestCreate, RequestUpdate, RequestOut
from app.services.notifications import create_notification
from app.models.notification import NotificationType

router = APIRouter(prefix="/requests", tags=["Requests"])


@router.get("/project/{project_id}", response_model=list[RequestOut])
async def list_requests(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, project_id, db)
    result = await db.execute(
        select(Request)
        .where(Request.project_id == project_id)
        .order_by(Request.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=RequestOut)
async def create_request(
    data: RequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, data.project_id, db)
    req = Request(**data.model_dump(), submitted_by=user.id)
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.get("/{request_id}", response_model=RequestOut)
async def get_request(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Request).where(Request.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    await assert_project_access(user, req.project_id, db)
    return req


@router.patch("/{request_id}", response_model=RequestOut)
async def update_request(
    request_id: str,
    data: RequestUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Request).where(Request.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(req, field, value)

    if data.status in (RequestStatus.COMPLETED, RequestStatus.REJECTED):
        req.resolved_at = datetime.utcnow()

    await db.commit()
    await db.refresh(req)

    # Notify the submitter
    await create_notification(
        db=db,
        user_id=req.submitted_by,
        type=NotificationType.REQUEST_UPDATED,
        title=f"Request '{req.title}' updated",
        body=f"Status: {req.status.value}",
        link=f"/requests/{req.id}",
    )

    return req
