import boto3
from botocore.config import Config
from fastapi import HTTPException

from app.config import settings


def is_configured() -> bool:
    # Credentials matter as much as the bucket: signing with empty keys yields
    # a URL that looks valid and fails on use.
    return bool(
        settings.STORAGE_BUCKET
        and settings.STORAGE_ACCESS_KEY
        and settings.STORAGE_SECRET_KEY
    )


def _get_client(endpoint_override: str | None = None):
    endpoint = endpoint_override or settings.STORAGE_ENDPOINT or None
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.STORAGE_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        # S3-compatible providers still require a region to sign the request.
        region_name=settings.STORAGE_REGION,
    )


async def generate_presigned_upload(storage_key: str, content_type: str, expires: int = 3600) -> str:
    if not is_configured():
        # Returning an empty URL here made uploads fail silently in the browser.
        # Say so instead: there is no object storage in the local stack.
        raise HTTPException(
            status_code=503,
            detail="File storage is not configured. Set STORAGE_BUCKET and the "
                   "other STORAGE_* variables to enable uploads.",
        )
    # Use external endpoint so the browser can reach the URL directly
    external = settings.STORAGE_EXTERNAL_ENDPOINT or settings.STORAGE_ENDPOINT or None
    client = _get_client(endpoint_override=external)
    url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.STORAGE_BUCKET,
            "Key": storage_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )
    return url


async def delete_file_from_storage(storage_key: str) -> None:
    # A no-op when storage is off: the File row is still removed by the caller.
    if not is_configured():
        return
    _get_client().delete_object(Bucket=settings.STORAGE_BUCKET, Key=storage_key)
