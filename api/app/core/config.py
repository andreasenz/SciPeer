from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("database_replica_url", mode="before")
    @classmethod
    def _none_if_blank(cls, v: object) -> object:
        # Docker Compose env_file doesn't strip inline comments, so a line like
        # DATABASE_REPLICA_URL=  # optional becomes "  # optional" — treat as None.
        if isinstance(v, str) and (not v.strip() or v.strip().startswith("#")):
            return None
        return v

    app_env: str = "development"
    app_base_url: AnyHttpUrl = AnyHttpUrl("http://localhost:3000")
    secret_key: str = "change-me"

    # Database
    database_url: str = "postgresql+asyncpg://scipeer:scipeer@localhost:5432/scipeer"
    database_replica_url: str | None = None

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # S3 / MinIO
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_papers: str = "scipeer-papers"

    # Meilisearch
    meilisearch_url: str = "http://localhost:7700"
    meilisearch_master_key: str = ""

    # ORCID OAuth2
    orcid_client_id: str = ""
    orcid_client_secret: str = ""
    orcid_redirect_uri: str = "http://localhost:3000/auth/callback"
    orcid_base_url: str = "https://sandbox.orcid.org"  # use orcid.org in production

    # JWT
    jwt_private_key_path: str = "./jwt_private.key"
    jwt_public_key_path: str = "./jwt_public.key"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 30

    # DataCite
    datacite_api_url: str = "https://api.test.datacite.org"
    datacite_username: str = ""
    datacite_password: str = ""
    datacite_prefix: str = "10.00000"

    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@scipeer.org"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()
