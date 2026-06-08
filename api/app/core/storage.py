from typing import BinaryIO
from uuid import UUID

import boto3
from botocore.config import Config

from app.core.config import settings

_client = None
_public_client = None


def get_client():  # type: ignore[return]
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(signature_version="s3v4"),
        )
    return _client


def get_public_client():  # type: ignore[return]
    """Separate client for presigned URLs — signs with the public endpoint
    so the browser can verify the signature without URL rewriting."""
    global _public_client
    if _public_client is None:
        _public_client = boto3.client(
            "s3",
            endpoint_url=_public_endpoint(),
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(signature_version="s3v4"),
        )
    return _public_client


def _public_endpoint() -> str:
    return settings.s3_public_endpoint_url or settings.s3_endpoint_url


def paper_key(paper_id: UUID, version: int, filename: str) -> str:
    return f"{paper_id}/v{version}/{filename}"


def upload_paper(paper_id: UUID, version: int, filename: str, fileobj: BinaryIO, content_type: str) -> str:
    key = paper_key(paper_id, version, filename)
    get_client().upload_fileobj(
        fileobj,
        settings.s3_bucket_papers,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    return f"{_public_endpoint()}/{settings.s3_bucket_papers}/{key}"


def presigned_url_for_key(key: str, expires: int = 3600) -> str:
    # Use public client so the signature is computed for the public hostname.
    # No URL rewriting needed — host in signature matches what the browser sends.
    return get_public_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_papers, "Key": key},
        ExpiresIn=expires,
    )


def presigned_url(paper_id: UUID, version: int, filename: str, expires: int = 3600) -> str:
    key = paper_key(paper_id, version, filename)
    return presigned_url_for_key(key, expires)


def ensure_buckets() -> None:
    """Create required buckets on startup. Safe to call repeatedly."""
    client = get_client()
    try:
        existing = {b["Name"] for b in client.list_buckets().get("Buckets", [])}
    except Exception:
        existing = set()
    for bucket in (settings.s3_bucket_papers,):
        if bucket not in existing:
            try:
                client.create_bucket(Bucket=bucket)
            except Exception:
                pass
