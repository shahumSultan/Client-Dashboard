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
    # Frontend-only value. Declared so a shared .env validates, but the backend
    # verifies tokens against the JWKS and never reads it.
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_JWT_ISSUER: str  # e.g. https://your-clerk-domain.clerk.accounts.dev

    # Storage (MinIO locally, or Cloudflare R2 / S3 in prod)
    # No default: a placeholder name made the app sign uploads against an
    # unrelated bucket on AWS instead of reporting storage as unconfigured.
    STORAGE_BUCKET: str = ""
    STORAGE_ENDPOINT: str = ""          # internal endpoint (backend → storage)
    STORAGE_EXTERNAL_ENDPOINT: str = "" # browser-accessible endpoint for presigned URLs
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""
    STORAGE_PUBLIC_URL: str = ""
    # R2 ignores it; S3 needs the real region. Any value satisfies signing.
    STORAGE_REGION: str = "auto"

    # Email (Resend)
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@enigma-cube.com"
    # Where alerts about client activity go (signed, paid, booked). A shared
    # business inbox rather than each admin's personal login address.
    ADMIN_NOTIFICATION_EMAIL: str = "info@enigma-cube.com"

    # AI (Groq - free tier)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_FAST_MODEL: str = "llama-3.1-8b-instant"

    # CORS - comma-separated list; supports Vercel preview deploys etc.
    FRONTEND_URL: str = "http://localhost:3000"
    EXTRA_ALLOWED_ORIGINS: str = ""

    @property
    def allowed_origins(self) -> list[str]:
        origins = [self.FRONTEND_URL, *self.EXTRA_ALLOWED_ORIGINS.split(",")]
        return [o.strip().rstrip("/") for o in origins if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
