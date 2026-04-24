from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from jose import jwt, JWTError
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole

security = HTTPBearer()

_clerk_jwks: dict | None = None


async def _get_clerk_jwks() -> dict:
    global _clerk_jwks
    if _clerk_jwks is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.CLERK_JWT_ISSUER}/.well-known/jwks.json")
            resp.raise_for_status()
            _clerk_jwks = resp.json()
    return _clerk_jwks


async def verify_clerk_token(token: str) -> dict:
    try:
        jwks = await _get_clerk_jwks()
        header = jwt.get_unverified_header(token)
        key = next((k for k in jwks["keys"] if k["kid"] == header["kid"]), None)
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token invalid: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = await verify_clerk_token(credentials.credentials)
    clerk_id = payload.get("sub")
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    if not user:
        # Auto-provision user on first login
        email = payload.get("email") or payload.get("email_address", "")
        if not email:
            # Try nested structure Clerk sometimes uses
            emails = payload.get("email_addresses", [])
            email = emails[0].get("email_address", "") if emails else ""

        user = User(
            clerk_id=clerk_id,
            email=email,
            full_name=f"{payload.get('first_name', '')} {payload.get('last_name', '')}".strip() or None,
            avatar_url=payload.get("image_url"),
            role=UserRole.CLIENT_MEMBER,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_client_owner(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.ADMIN, UserRole.CLIENT_OWNER):
        raise HTTPException(status_code=403, detail="Client owner access required")
    return user
