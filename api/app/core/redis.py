import redis.asyncio as aioredis

from app.core.config import settings

_pool: aioredis.ConnectionPool | None = None
_blocking_pool: aioredis.ConnectionPool | None = None


def get_pool() -> aioredis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = aioredis.ConnectionPool.from_url(settings.redis_url, decode_responses=True)
    return _pool


def get_blocking_pool() -> aioredis.ConnectionPool:
    """Pool for blocking commands (XREADGROUP, BLPOP, …).
    socket_timeout=None so the connection is not killed mid-block."""
    global _blocking_pool
    if _blocking_pool is None:
        _blocking_pool = aioredis.ConnectionPool.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_timeout=None,
            socket_connect_timeout=5,
        )
    return _blocking_pool


def get_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=get_pool())


def get_blocking_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=get_blocking_pool())


async def check_redis() -> bool:
    try:
        r = get_client()
        await r.ping()
        return True
    except Exception:
        return False
