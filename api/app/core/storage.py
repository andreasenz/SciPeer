from typing import BinaryIO
from uuid import UUID

import boto3
from botocore.config import Config

from app.core.config import settings

_client = None


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
    return f"{settings.s3_endpoint_url}/{settings.s3_bucket_papers}/{key}"


def presigned_url(paper_id: UUID, version: int, filename: str, expires: int = 3600) -> str:
    key = paper_key(paper_id, version, filename)
    return get_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_papers, "Key": key},
        ExpiresIn=expires,
    )
