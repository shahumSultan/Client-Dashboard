from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1 import (
    projects, milestones, requests, files,
    notifications, analytics, onboarding, organizations, users, ai
)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
for router in [
    organizations.router,
    users.router,
    projects.router,
    milestones.router,
    requests.router,
    files.router,
    notifications.router,
    analytics.router,
    onboarding.router,
    ai.router,
]:
    app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
