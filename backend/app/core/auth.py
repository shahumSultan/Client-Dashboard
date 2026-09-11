import logging
import re
import time
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
import httpx
from jose import jwt, JWTError
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.services.clerk import fetch_clerk_user, primary_email, full_name, verified_emails
from app.services.invitations import auto_accept_matching_invitation

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Clerk rotates signing keys, so the JWKS is cached with a TTL rather than
# forever — otherwise a rotation breaks every request until the app restarts.
JWKS_TTL_SECONDS = 3600
CLOCK_SKEW_SECONDS = 5

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
            # Clerk stamps `nbf`/`iat` at mint time, and a container clock a
            # second behind Clerk's rejects a brand-new token as not yet
            # valid — a sporadic 401 on the first request after sign-in.
            # Clerk's own SDKs allow the same 5s.
            options={"verify_aud": False, "verify_iss": True, "leeway": CLOCK_SKEW_SECONDS},
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


# A read-only staff account may still do these — they change nothing but
# their own inbox and profile.
_STAFF_WRITABLE = re.compile(r"^/api/v1/(notifications/[^/]+/read|notifications/read-all|users/me)$")
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _guard_read_only(user: User, request: Request) -> None:
    """Refuse every write from a staff account, at one choke point.

    Enforced here — on the dependency every authenticated route shares —
    rather than per endpoint, so a route added later is read-only for staff
    by default instead of by someone remembering to check.
    """
    if (
        user.role == UserRole.STAFF
        and request.method not in SAFE_METHODS
        and not _STAFF_WRITABLE.match(request.url.path)
    ):
        raise HTTPException(status_code=403, detail="Your account has view-only access.")


async def get_current_user(
    request: Request,
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

    _guard_read_only(user, request)

    # Access is invite-only, so a user with no workspace may have one waiting
    # for their address. Only runs while they are unattached, which is at most
    # the handful of requests between signing up and being placed.
    if not user.organization_id:
        user = await auto_accept_matching_invitation(db, user)

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

    existing = (
        await db.execute(select(User).where(func.lower(User.email) == email.lower()))
    ).scalar_one_or_none()
    if existing:
        return await _relink(db, existing, clerk_id)

    user = User(
        clerk_id=clerk_id,
        email=email,
        full_name=name,
        avatar_url=avatar,
        role=UserRole.CLIENT_MEMBER,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # A fresh sign-in fires several requests at once, and each finds no row
        # and tries to create one. Whichever loses the race reads the winner's.
        await db.rollback()
        user = (
            await db.execute(select(User).where(User.clerk_id == clerk_id))
        ).scalar_one_or_none()
        if not user:
            raise
        return user
    await db.refresh(user)
    return user


async def _relink(db: AsyncSession, existing: User, clerk_id: str) -> User:
    """Attach a new Clerk identity to the account that already owns its email.

    Happens when a Clerk user is deleted and recreated, or when switching Clerk
    instances: same person, new id. Without this the insert collides on the
    unique email and every request 500s.

    Only on a *verified* address. Otherwise anyone could register someone
    else's email, unverified, and inherit their account — admin included.
    """
    profile = await fetch_clerk_user(clerk_id)
    if not profile or existing.email.lower() not in verified_emails(profile):
        logger.warning(
            "Refused to relink user %s to Clerk %s: email not verified on that identity",
            existing.id, clerk_id,
        )
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Verify your email address to continue.",
        )

    logger.warning("Relinking user %s from Clerk %s to %s", existing.id, existing.clerk_id, clerk_id)
    existing.clerk_id = clerk_id
    existing.avatar_url = profile.get("image_url") or existing.avatar_url
    await db.commit()
    await db.refresh(existing)
    return existing


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


async def require_admin(request: Request, user: User = Depends(get_current_user)) -> User:
    """The admin panel. Staff pass on reads only; every write needs an admin."""
    if user.role == UserRole.ADMIN:
        return user
    if user.role == UserRole.STAFF and request.method in SAFE_METHODS:
        return user
    raise HTTPException(status_code=403, detail="Admin access required")


async def require_client_owner(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.ADMIN, UserRole.CLIENT_OWNER):
        raise HTTPException(status_code=403, detail="Client owner access required")
    return user
