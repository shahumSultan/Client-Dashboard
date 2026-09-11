from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.core.permissions import assert_project_access
from app.models.user import User, UserRole, is_team
from app.models.project import Project, ProjectUpdate as ProjectUpdateModel
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectOut,
    ProjectUpdateCreate, ProjectUpdateOut,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if is_team(user):
        result = await db.execute(select(Project).where(Project.is_active == True))
    else:
        result = await db.execute(
            select(Project).where(
                Project.organization_id == user.organization_id,
                Project.is_active == True,
            )
        )
    return result.scalars().all()


@router.post("", response_model=ProjectOut)
async def create_project(
    data: ProjectCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    project = Project(**data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await assert_project_access(user, project_id, db)


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    project = await assert_project_access(user, project_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    project = await assert_project_access(user, project_id, db)
    project.is_active = False
    await db.commit()


# Project Updates (feed)
@router.get("/{project_id}/updates", response_model=list[ProjectUpdateOut])
async def list_updates(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, project_id, db)
    result = await db.execute(
        select(ProjectUpdateModel)
        .where(ProjectUpdateModel.project_id == project_id)
        .order_by(ProjectUpdateModel.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{project_id}/updates", response_model=ProjectUpdateOut)
async def create_update(
    project_id: str,
    data: ProjectUpdateCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, project_id, db)
    update = ProjectUpdateModel(project_id=project_id, author_id=user.id, content=data.content)
    db.add(update)
    await db.commit()
    await db.refresh(update)
    return update
