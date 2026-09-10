from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.api.v1 import (
    projects, milestones, requests, files,
    notifications, analytics, onboarding, organizations, users, ai, admin,
    comments, invitations,
)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
for router in [
    organizations.router,
    users.router,
    invitations.router,
    projects.router,
    milestones.router,
    requests.router,
    comments.router,
    files.router,
    notifications.router,
    analytics.router,
    onboarding.router,
    ai.router,
    admin.router,
]:
    app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health(response: Response, db: AsyncSession = Depends(get_db)):
    """Railway's healthcheck target.

    Checks the database too: the API can serve nothing without it, so a green
    healthcheck while Postgres is unreachable would keep a dead deployment in
    rotation instead of rolling it back.
    """
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degraded", "app": settings.APP_NAME, "database": "unreachable"}

    return {"status": "ok", "app": settings.APP_NAME, "database": "ok"}
