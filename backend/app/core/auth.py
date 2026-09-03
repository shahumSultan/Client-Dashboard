import time
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from jose import jwt, JWTError
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.services.clerk import fetch_clerk_user, primary_email, full_name

security = HTTPBearer()

# Clerk rotates signing keys, so the JWKS is cached with a TTL rather than
# forever — otherwise a rotation breaks every request until the app restarts.
JWKS_TTL_SECONDS = 3600

_clerk_jwks: dict | None = None
_clerk_jwks_fetched_at: float = 0.0


async def _fetch_clerk_jwks() -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{settings.CLERK_JWT_ISSUER}/.well-known/jwks.json")
        resp.raise_for_status()
        return resp.json()


async def _get_clerk_jwks(force_refresh: bool = False) -> dict:
    global _clerk_jwks, _clerk_jwks_fetched_at
    expired = (time.monotonic() - _clerk_jwks_fetched_at) > JWKS_TTL_SECONDS
    if _clerk_jwks is None or expired or force_refresh:
        try:
            _clerk_jwks = await _fetch_clerk_jwks()
            _clerk_jwks_fetched_at = time.monotonic()
        except httpx.HTTPError as e:
            if _clerk_jwks is None:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Unable to reach Clerk JWKS endpoint: {e}",
                )
            # Serve the stale copy rather than failing every request.
    return _clerk_jwks


async def _find_key(kid: str) -> dict | None:
    jwks = await _get_clerk_jwks()
    key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if key is None:
        # Unknown kid usually means a rotation happened — refetch once.
        jwks = await _get_clerk_jwks(force_refresh=True)
        key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    return key


async def verify_clerk_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token invalid: {e}")

    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token missing key id")

    key = await _find_key(kid)
    if not key:
        raise HTTPException(status_code=401, detail="Invalid token key")

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.CLERK_JWT_ISSUER,
            options={"verify_aud": False, "verify_iss": True},
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token invalid: {e}")

    # Clerk's `azp` (authorized party) is the origin the token was minted for.
    # Reject tokens issued to any frontend other than ours.
    allowed_parties = settings.allowed_origins
    azp = payload.get("azp")
    if azp and allowed_parties and azp not in allowed_parties:
        raise HTTPException(status_code=401, detail="Token authorized party not allowed")

    return payload


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
        user = await _provision_user(db, clerk_id, payload)
    elif not user.email:
        # Backfill accounts created before the profile lookup existed. email is
        # UNIQUE NOT NULL, so leaving these blank would make the second such
        # signup collide on the empty string.
        await _backfill_email(db, user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    return user


async def _profile_fields(clerk_id: str, payload: dict) -> tuple[str, str | None, str | None]:
    """Resolve (email, name, avatar), preferring JWT claims over an API call.

    A custom Clerk JWT template may already supply these; if not, fall back to
    the Backend API so provisioning does not depend on dashboard config.
    """
    email = payload.get("email") or payload.get("primary_email_address") or ""
    name = f"{payload.get('first_name', '')} {payload.get('last_name', '')}".strip() or None
    avatar = payload.get("image_url")

    if not email:
        emails = payload.get("email_addresses") or []
        if emails and isinstance(emails, list):
            first = emails[0]
            email = first.get("email_address", "") if isinstance(first, dict) else str(first)

    if not email:
        profile = await fetch_clerk_user(clerk_id)
        if profile:
            email = primary_email(profile)
            name = name or full_name(profile)
            avatar = avatar or profile.get("image_url")

    return email, name, avatar


async def _provision_user(db: AsyncSession, clerk_id: str, payload: dict) -> User:
    """Create the local record for a Clerk identity on first authenticated call."""
    email, name, avatar = await _profile_fields(clerk_id, payload)
    if not email:
        raise HTTPException(
            status_code=502,
            detail="Could not read an email address for this account from Clerk.",
        )

    user = User(
        clerk_id=clerk_id,
        email=email,
        full_name=name,
        avatar_url=avatar,
        role=UserRole.CLIENT_MEMBER,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _backfill_email(db: AsyncSession, user: User) -> None:
    profile = await fetch_clerk_user(user.clerk_id)
    if not profile:
        return
    email = primary_email(profile)
    if not email:
        return
    user.email = email
    user.full_name = user.full_name or full_name(profile)
    user.avatar_url = user.avatar_url or profile.get("image_url")
    await db.commit()
    await db.refresh(user)


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_client_owner(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.ADMIN, UserRole.CLIENT_OWNER):
        raise HTTPException(status_code=403, detail="Client owner access required")
    return user
