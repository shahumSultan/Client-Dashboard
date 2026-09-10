from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.core.permissions import assert_project_access
from app.models.user import User
from app.models.milestone import Milestone
from app.models.comment import Comment, CommentTargetType
from app.schemas.milestone import MilestoneCreate, MilestoneUpdate, MilestoneOut

router = APIRouter(prefix="/milestones", tags=["Milestones"])


@router.get("/project/{project_id}", response_model=list[MilestoneOut])
async def list_milestones(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, project_id, db)
    result = await db.execute(
        select(Milestone)
        .where(Milestone.project_id == project_id)
        .order_by(Milestone.order_index)
    )
    return result.scalars().all()


@router.post("", response_model=MilestoneOut)
async def create_milestone(
    data: MilestoneCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, data.project_id, db)
    milestone = Milestone(**data.model_dump())
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.patch("/{milestone_id}", response_model=MilestoneOut)
async def update_milestone(
    milestone_id: str,
    data: MilestoneUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    milestone = result.scalar_one_or_none()
    if not milestone:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Milestone not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(milestone, field, value)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.delete("/{milestone_id}", status_code=204)
async def delete_milestone(
    milestone_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    milestone = result.scalar_one_or_none()
    if not milestone:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Milestone not found")
    # target_id is polymorphic, so there is no FK to cascade from — clear the
    # milestone's comments explicitly rather than stranding them.
    await db.execute(
        delete(Comment).where(
            Comment.target_type == CommentTargetType.MILESTONE,
            Comment.target_id == milestone.id,
        )
    )
    await db.delete(milestone)
    await db.commit()
