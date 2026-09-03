from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.onboarding import OnboardingData
from app.schemas.user import UserOut, UserUpdate, UserRoleUpdate, ClientRegistration
from app.core.slug import unique_org_slug

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/register", response_model=UserOut, status_code=201)
async def register_client(
    data: ClientRegistration,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Complete self-serve signup: create the client's organization and claim it.

    Runs once, straight after the Clerk sign-up, from the welcome form. The first
    user of a company becomes its owner; teammates who join later are attached by
    an admin and stay members.
    """
    if user.organization_id:
        raise HTTPException(status_code=409, detail="Account is already set up")

    org = Organization(
        name=data.company_name.strip(),
        slug=await unique_org_slug(db, data.company_name),
        industry=data.industry,
        website=data.website,
    )
    db.add(org)
    await db.flush()

    db.add(OnboardingData(organization_id=org.id))

    user.full_name = data.full_name.strip()
    user.organization_id = org.id
    user.role = UserRole.CLIENT_OWNER

    await db.commit()
    await db.refresh(user)
    return user


@router.get("", response_model=list[UserOut])
async def list_users(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.is_active == True))
    return result.scalars().all()


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: str,
    data: UserRoleUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = data.role
    if data.organization_id is not None:
        target.organization_id = data.organization_id
    await db.commit()
    await db.refresh(target)
    return target
