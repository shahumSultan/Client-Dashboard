from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.auth import get_current_user
from app.core.permissions import assert_org_access
from app.models.user import User
from app.models.onboarding import OnboardingData
from app.schemas.onboarding import OnboardingUpdate, OnboardingOut

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.get("/{organization_id}", response_model=OnboardingOut)
async def get_onboarding(
    organization_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_org_access(user, organization_id, db)
    result = await db.execute(
        select(OnboardingData).where(OnboardingData.organization_id == organization_id)
    )
    data = result.scalar_one_or_none()
    if not data:
        raise HTTPException(status_code=404, detail="Onboarding data not found")
    return data


@router.put("/{organization_id}", response_model=OnboardingOut)
async def upsert_onboarding(
    organization_id: str,
    update: OnboardingUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_org_access(user, organization_id, db)
    result = await db.execute(
        select(OnboardingData).where(OnboardingData.organization_id == organization_id)
    )
    data = result.scalar_one_or_none()

    if not data:
        data = OnboardingData(organization_id=organization_id)
        db.add(data)

    for field, value in update.model_dump(exclude_none=True).items():
        setattr(data, field, value)

    await db.commit()
    await db.refresh(data)
    return data
