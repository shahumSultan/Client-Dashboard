from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.core.permissions import assert_org_access
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.onboarding import OnboardingData
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationOut

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("", response_model=list[OrganizationOut])
async def list_organizations(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organization).where(Organization.is_active == True))
    return result.scalars().all()


@router.post("", response_model=OrganizationOut)
async def create_organization(
    data: OrganizationCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Organization).where(Organization.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug already in use")

    org = Organization(**data.model_dump())
    db.add(org)
    await db.flush()

    # Auto-create onboarding data
    onboarding = OnboardingData(organization_id=org.id)
    db.add(onboarding)

    await db.commit()
    await db.refresh(org)
    return org


@router.get("/{organization_id}", response_model=OrganizationOut)
async def get_organization(
    organization_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await assert_org_access(user, organization_id, db)


@router.patch("/{organization_id}", response_model=OrganizationOut)
async def update_organization(
    organization_id: str,
    data: OrganizationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await assert_org_access(user, organization_id, db)
    # Only admin or client owner can update org
    if user.role not in (UserRole.ADMIN, UserRole.CLIENT_OWNER):
        raise HTTPException(status_code=403, detail="Permission denied")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(org, field, value)
    await db.commit()
    await db.refresh(org)
    return org
