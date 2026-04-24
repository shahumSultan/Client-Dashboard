import boto3
from botocore.config import Config
from app.config import settings


def _get_client(endpoint_override: str | None = None):
    endpoint = endpoint_override or settings.STORAGE_ENDPOINT or None
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.STORAGE_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",  # MinIO requires a region even if unused
    )


async def generate_presigned_upload(storage_key: str, content_type: str, expires: int = 3600) -> str:
    if not settings.STORAGE_BUCKET:
        return ""
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
    if not settings.STORAGE_BUCKET:
        return
    _get_client().delete_object(Bucket=settings.STORAGE_BUCKET, Key=storage_key)
