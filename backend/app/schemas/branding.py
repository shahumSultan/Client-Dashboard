from datetime import datetime

from pydantic import BaseModel


class LetterheadOut(BaseModel):
    """Metadata only - the image itself is served by its own byte route.

    The same call as DocumentOut next door: a JSON payload never carries a
    file, so the bytes are reachable at /branding/letterhead/{sha256}/image
    and nowhere else.
    """

    filename: str
    content_type: str
    size_bytes: int
    width_px: int
    height_px: int
    sha256: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}
