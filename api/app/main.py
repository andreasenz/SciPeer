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


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    allow_origins=[str(settings.app_base_url)],
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
    status = "ok" if db_ok and redis_ok else "degraded"
    return {"status": status, "db": db_ok, "redis": redis_ok}
