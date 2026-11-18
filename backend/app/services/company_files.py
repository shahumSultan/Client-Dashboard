"""Rules for company documents: what may be uploaded and where it lives."""
import os
import re
import uuid

from fastapi import HTTPException

MAX_COMPANY_FILE_BYTES = 25 * 1024 * 1024
KEY_PREFIX = "company/"

# Decided by extension, not by the browser's File.type: browsers leave it
# empty or guess differently for Office files, and the type we sign into the
# upload URL has to match the one the browser then sends.
ALLOWED_TYPES: dict[str, str] = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".zip": "application/zip",
}


def content_type_for(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_TYPES:
        allowed = ", ".join(sorted(e.lstrip(".") for e in ALLOWED_TYPES))
        raise HTTPException(
            status_code=415,
            detail=f"That file type isn't accepted. Allowed: {allowed}.",
        )
    return ALLOWED_TYPES[ext]


def check_size(size_bytes: int) -> None:
    if size_bytes <= 0:
        raise HTTPException(status_code=422, detail="The file is empty.")
    if size_bytes > MAX_COMPANY_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Files can be at most {MAX_COMPANY_FILE_BYTES // (1024 * 1024)} MB.",
        )


def new_key(filename: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(filename)).strip("._") or "file"
    return f"{KEY_PREFIX}{uuid.uuid4()}/{safe[:120]}"


def owns_key(storage_key: str) -> bool:
    """Keys we minted look like company/<uuid>/<name> - nothing else is accepted.

    Stops a confirm call from claiming some other object in the bucket, such as
    a client's project file, as a company document.
    """
    return bool(re.fullmatch(
        r"company/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]+",
        storage_key,
    ))
