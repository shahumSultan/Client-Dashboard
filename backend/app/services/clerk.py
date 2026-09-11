import httpx
from app.config import settings

CLERK_API = "https://api.clerk.com/v1"


async def fetch_clerk_user(clerk_id: str) -> dict | None:
    """Fetch a user's profile from Clerk's Backend API.

    Clerk's default session token carries only identity claims (sub, sid, azp…)
    - no email or name unless a custom JWT template adds them. Rather than
    depend on the dashboard being configured a particular way, read the profile
    from the API with the secret key.

    Returns None on any failure; callers must degrade rather than block login.
    """
    if not settings.CLERK_SECRET_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{CLERK_API}/users/{clerk_id}",
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )
            resp.raise_for_status()
            return resp.json()
    except (httpx.HTTPError, ValueError):
        return None


def primary_email(profile: dict) -> str:
    """Pull the primary address out of a Clerk user payload."""
    addresses = profile.get("email_addresses") or []
    primary_id = profile.get("primary_email_address_id")
    for entry in addresses:
        if entry.get("id") == primary_id:
            return entry.get("email_address", "")
    # No primary flagged - fall back to the first verified address, then any.
    for entry in addresses:
        if (entry.get("verification") or {}).get("status") == "verified":
            return entry.get("email_address", "")
    return addresses[0].get("email_address", "") if addresses else ""


def full_name(profile: dict) -> str | None:
    name = f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip()
    return name or None


def verified_emails(profile: dict) -> set[str]:
    """Every address on the account that Clerk has verified, lower-cased."""
    return {
        (entry.get("email_address") or "").lower()
        for entry in profile.get("email_addresses") or []
        if (entry.get("verification") or {}).get("status") == "verified"
    } - {""}
