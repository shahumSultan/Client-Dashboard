"""The company letterhead: checking an upload is really A4 stationery."""
import io
from dataclasses import dataclass

from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.branding import CompanyLetterhead

MAX_LETTERHEAD_BYTES = 4 * 1024 * 1024

# A4 portrait. The image is stretched to fill a 210x297mm page, so a file of the
# wrong shape is distorted rather than merely cropped - worth refusing up front.
A4_ASPECT = 297 / 210
ASPECT_TOLERANCE = 0.02

# Roughly 120 DPI across an A4 width. Below this a logo goes visibly soft once
# it is on paper, which is the one place this image is guaranteed to be seen.
MIN_WIDTH_PX = 1000

# Stationery is a page of artwork, not a photograph. Anything past this is a
# decompression bomb rather than a letterhead.
Image.MAX_IMAGE_PIXELS = 50_000_000

# SVG is deliberately absent. Rendered through <img> from our own origin it is a
# scriptable, externally-referencing document, and its intrinsic size cannot be
# checked against A4 the way a raster's can.
_MAGIC = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
)


class InvalidLetterhead(ValueError):
    pass


@dataclass(frozen=True)
class LetterheadInfo:
    content_type: str
    width: int
    height: int


def inspect_letterhead(data: bytes) -> LetterheadInfo:
    """Return the type and dimensions, or raise InvalidLetterhead with a reason.

    This image is printed behind a contract, so it has to be one that actually
    opens, at a size and shape that will not embarrass the document.
    """
    if len(data) > MAX_LETTERHEAD_BYTES:
        raise InvalidLetterhead(
            "That letterhead is larger than 4 MB. Export it again as a PNG or "
            "JPEG at around 150 DPI."
        )

    content_type = next((t for magic, t in _MAGIC if data.startswith(magic)), None)
    if content_type is None:
        raise InvalidLetterhead(
            "That file isn't a PNG or JPEG. Export your letterhead as one of those."
        )

    try:
        image = Image.open(io.BytesIO(data))
        # Read the size before verify(): it consumes the file and leaves the
        # image object unusable for anything afterwards.
        width, height = image.size
        image.verify()
    except Exception:
        # Pillow raises a spread of types on malformed input, not only
        # UnidentifiedImageError; any of them means the same thing to the admin.
        raise InvalidLetterhead(
            "That image couldn't be read - it may be damaged. Export it again."
        )

    if width < MIN_WIDTH_PX:
        raise InvalidLetterhead(
            f"That letterhead is only {width}px wide. Export it at least "
            f"{MIN_WIDTH_PX}px wide so it stays sharp on paper."
        )

    if abs((height / width) - A4_ASPECT) / A4_ASPECT > ASPECT_TOLERANCE:
        raise InvalidLetterhead(
            f"That letterhead is {width}x{height}, which isn't A4 shaped. Export "
            "it as A4 portrait (210 x 297 mm) so nothing is stretched or cropped."
        )

    return LetterheadInfo(content_type=content_type, width=width, height=height)


async def current_letterhead_sha256(db: AsyncSession) -> str | None:
    """The letterhead a document sent right now would be printed on.

    Selects the hash alone. `data` is deferred, so this never pulls the image
    bytes just to answer which letterhead is in force.
    """
    result = await db.execute(
        select(CompanyLetterhead.sha256).where(CompanyLetterhead.is_current.is_(True))
    )
    return result.scalar_one_or_none()
