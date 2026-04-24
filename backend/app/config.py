from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Enigma-Cube Client Portal"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # Clerk Auth
    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str
    CLERK_JWT_ISSUER: str  # e.g. https://your-clerk-domain.clerk.accounts.dev

    # Storage (MinIO locally, or Cloudflare R2 / S3 in prod)
    STORAGE_BUCKET: str = "client-portal"
    STORAGE_ENDPOINT: str = ""          # internal endpoint (backend → storage)
    STORAGE_EXTERNAL_ENDPOINT: str = "" # browser-accessible endpoint for presigned URLs
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""
    STORAGE_PUBLIC_URL: str = ""

    # Email (Resend)
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@enigma-cube.com"

    # AI (Groq — free tier)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_FAST_MODEL: str = "llama-3.1-8b-instant"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
