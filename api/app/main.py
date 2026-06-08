import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import check_db
from app.core.redis import check_redis
from app.identity.router import router as identity_router
from app.papers.router import router as papers_router
from app.reviews.router import router as reviews_router
from app.doi.router import router as doi_router
from app.gamification.router import router as gamification_router

logger = logging.getLogger(__name__)


async def _startup() -> None:
    if not settings.orcid_client_id or not settings.orcid_client_secret:
        logger.warning(
            "ORCID_CLIENT_ID / ORCID_CLIENT_SECRET not set — login will fail. "
            "Register a sandbox app at https://sandbox.orcid.org/developer-tools"
        )
    from app.core.storage import ensure_buckets
    from app.core.search import ensure_index
    try:
        await asyncio.to_thread(ensure_buckets)
    except Exception as exc:
        logger.warning("MinIO bucket init failed (non-fatal): %s", exc)
    await ensure_index()
    if settings.app_env == "development":
        try:
            from app.core.seed_dev import seed as seed_dev
            await seed_dev()
        except Exception as exc:
            logger.warning("Dev seed failed (non-fatal): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _startup()
    yield


app = FastAPI(
    title="SciPeer API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(settings.app_base_url), "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(identity_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(papers_router, prefix="/api/v1/papers", tags=["papers"])
app.include_router(reviews_router, prefix="/api/v1/reviews", tags=["reviews"])
app.include_router(doi_router, prefix="/api/v1/doi", tags=["doi"])
app.include_router(gamification_router, prefix="/api/v1/gamification", tags=["gamification"])


@app.get("/api/health", tags=["health"])
async def health() -> dict:
    db_ok = await check_db()
    redis_ok = await check_redis()
    return {"status": "ok" if db_ok and redis_ok else "degraded", "db": db_ok, "redis": redis_ok}
