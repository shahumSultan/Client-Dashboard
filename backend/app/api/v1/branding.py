"""The company letterhead: one image, printed behind every generated document."""
import hashlib
import re

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.core.auth import get_current_user, require_admin
from app.core.time import utcnow
from app.database import get_db
from app.models.branding import CompanyLetterhead
from app.models.user import User
from app.schemas.branding import LetterheadOut
from app.services import branding as letterheads

router = APIRouter(prefix="/branding", tags=["Branding"])


async def _current(db: AsyncSession) -> CompanyLetterhead | None:
    return (
        await db.execute(
            select(CompanyLetterhead).where(CompanyLetterhead.is_current.is_(True))
        )
    ).scalar_one_or_none()


def _image_response(data: bytes, filename: str, content_type: str) -> Response:
    safe = re.sub(r'[^A-Za-z0-9._ -]', "_", filename) or "letterhead.png"
    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{safe}"',
            # Deliberately NOT `no-store` like the contract PDFs next door. This
            # is company stationery addressed by its own content hash: the bytes
            # at a given URL can never change, and the print view refetches it
            # every time a document is opened. Please don't "fix" this to match.
            "Cache-Control": "private, max-age=86400, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/letterhead", response_model=LetterheadOut | None)
async def get_letterhead(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Which letterhead is in force, or null if none has been uploaded.

    Readable by any signed-in user rather than admins only, because the print
    view is opened by clients too. It is public-facing stationery carrying no
    tenant data, and the document behind it is still gated by the engagement's
    own access rules.
    """
    return await _current(db)


@router.get("/letterhead/{sha256}/image")
async def get_letterhead_image(
    sha256: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The image itself, addressed by content hash.

    By hash rather than "whichever is current" so a signed agreement can ask
    for the exact stationery it was sent on, long after it was replaced.
    """
    row = (
        await db.execute(
            select(CompanyLetterhead)
            .options(undefer(CompanyLetterhead.data))
            .where(CompanyLetterhead.sha256 == sha256)
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="No such letterhead")
    return _image_response(row.data, row.filename, row.content_type)


@router.put("/letterhead", response_model=LetterheadOut)
async def upload_letterhead(
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Replace the letterhead. The previous one is retired, never deleted.

    Retired rather than deleted because agreements already signed are pinned to
    it by hash and must keep rendering on the stationery they were signed under.
    """
    # One byte past the cap, so an oversized upload is caught without holding an
    # arbitrarily large body in memory.
    data = await file.read(letterheads.MAX_LETTERHEAD_BYTES + 1)
    try:
        info = letterheads.inspect_letterhead(data)
    except letterheads.InvalidLetterhead as err:
        raise HTTPException(status_code=422, detail=str(err))

    digest = hashlib.sha256(data).hexdigest()
    current = await _current(db)
    if current and current.sha256 == digest:
        # Same bytes as what is already in force - nothing to retire or insert.
        return current

    if current:
        current.is_current = False
        current.retired_at = utcnow()
        # Clear the old row's flag before the new one claims it: the partial
        # unique index allows exactly one is_current row at a time.
        await db.flush()

    existing = (
        await db.execute(
            select(CompanyLetterhead).where(CompanyLetterhead.sha256 == digest)
        )
    ).scalar_one_or_none()
    if existing:
        # Re-uploading a letterhead used before. Bring that row back rather than
        # storing identical bytes twice, so anything pinned to it still resolves.
        existing.is_current = True
        existing.retired_at = None
        row = existing
    else:
        row = CompanyLetterhead(
            filename=(file.filename or "letterhead.png").rsplit("/", 1)[-1][:255],
            content_type=info.content_type,
            size_bytes=len(data),
            width_px=info.width,
            height_px=info.height,
            sha256=digest,
            data=data,
            is_current=True,
            uploaded_by=admin.id,
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/letterhead", status_code=204)
async def remove_letterhead(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Stop printing on a letterhead. The bytes stay so signed documents hold."""
    current = await _current(db)
    if current:
        current.is_current = False
        current.retired_at = utcnow()
        await db.commit()
