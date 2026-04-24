from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.core.auth import get_current_user
from app.core.permissions import assert_project_access
from app.models.user import User
from app.models.project import Project
from app.models.milestone import Milestone
from app.models.request import Request
from app.services.ai import ask_project_assistant

router = APIRouter(prefix="/ai", tags=["AI"])


class AskRequest(BaseModel):
    project_id: str
    question: str


class AskResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=AskResponse)
async def ask_assistant(
    body: AskRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await assert_project_access(user, body.project_id, db)

    milestones_result = await db.execute(
        select(Milestone).where(Milestone.project_id == body.project_id)
    )
    requests_result = await db.execute(
        select(Request).where(Request.project_id == body.project_id)
    )

    context = {
        "project_name": project.name,
        "project_status": project.status.value,
        "completion_percentage": project.completion_percentage,
        "milestones": [
            {"title": m.title, "status": m.status.value}
            for m in milestones_result.scalars().all()
        ],
        "open_requests": [
            {"title": r.title, "status": r.status.value, "category": r.category.value}
            for r in requests_result.scalars().all()
            if r.status.value not in ("completed", "rejected")
        ],
    }

    answer = await ask_project_assistant(context, body.question)
    return AskResponse(answer=answer)
