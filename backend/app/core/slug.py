import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.organization import Organization


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:80] or "client"


async def unique_org_slug(db: AsyncSession, name: str) -> str:
    """Derive a URL-safe slug from a company name, suffixing on collision.

    Two clients can legitimately share a company name, so the slug — not the
    name — carries the uniqueness constraint.
    """
    base = slugify(name)
    result = await db.execute(
        select(Organization.slug).where(Organization.slug.like(f"{base}%"))
    )
    taken = set(result.scalars().all())
    if base not in taken:
        return base
    n = 2
    while f"{base}-{n}" in taken:
        n += 1
    return f"{base}-{n}"
