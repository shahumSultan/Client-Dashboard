from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserRole
from app.models.project import Project
from app.models.organization import Organization


async def assert_project_access(user: User, project_id: str, db: AsyncSession) -> Project:
    """Ensure the user can access the given project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if user.role == UserRole.ADMIN:
        return project

    if user.organization_id != project.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Deleting a project is a soft delete, and the list endpoint filters on it.
    # Without this a client who kept the URL would still reach the project and
    # every collection hanging off it. Admins keep access so it stays
    # recoverable.
    if not project.is_active:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


async def assert_org_access(user: User, organization_id: str, db: AsyncSession) -> Organization:
    """Ensure the user can access the given organization."""
    result = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if user.role == UserRole.ADMIN:
        return org

    if user.organization_id != organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return org
