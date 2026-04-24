from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.core.permissions import assert_project_access
from app.models.user import User
from app.models.analytics import AnalyticsEntry
from app.schemas.analytics import AnalyticsEntryCreate, AnalyticsEntryOut
from app.services.ai import generate_analytics_summary

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/project/{project_id}", response_model=list[AnalyticsEntryOut])
async def list_analytics(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, project_id, db)
    result = await db.execute(
        select(AnalyticsEntry)
        .where(AnalyticsEntry.project_id == project_id)
        .order_by(AnalyticsEntry.period_start.desc())
    )
    return result.scalars().all()


@router.post("", response_model=AnalyticsEntryOut)
async def create_analytics_entry(
    data: AnalyticsEntryCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, data.project_id, db)

    # AI-generate summary if not provided
    summary = data.summary
    if not summary:
        summary = await generate_analytics_summary(data.model_dump())

    entry = AnalyticsEntry(**data.model_dump(exclude={"summary"}), summary=summary)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
