"""Meilisearch thin wrapper. All calls are sync-wrapped with asyncio.to_thread."""
import asyncio
import logging

import meilisearch

from app.core.config import settings

logger = logging.getLogger(__name__)

INDEX = "papers"


def _client() -> meilisearch.Client:
    return meilisearch.Client(
        settings.meilisearch_url,
        settings.meilisearch_master_key or None,
    )


def _ensure_index() -> None:
    c = _client()
    try:
        c.create_index(INDEX, {"primaryKey": "id"})
    except Exception:
        pass
    idx = c.index(INDEX)
    idx.update_settings({
        "searchableAttributes": ["title", "abstract"],
        "filterableAttributes": ["status", "field_category_id"],
        "sortableAttributes": ["created_at"],
    })


async def ensure_index() -> None:
    try:
        await asyncio.to_thread(_ensure_index)
    except Exception as exc:
        logger.warning("Meilisearch init failed (non-fatal): %s", exc)


def _add(docs: list[dict]) -> None:
    _client().index(INDEX).add_documents(docs)


async def index_paper(paper: dict) -> None:
    try:
        await asyncio.to_thread(_add, [paper])
    except Exception as exc:
        logger.warning("Meilisearch index failed: %s", exc)


def _search(q: str, params: dict) -> dict:
    return _client().index(INDEX).search(q, params)


async def search_papers(query: str, status: str | None = None, limit: int = 20) -> dict:
    params: dict = {"limit": limit}
    if status:
        params["filter"] = f"status = '{status}'"
    try:
        return await asyncio.to_thread(_search, query, params)
    except Exception as exc:
        logger.warning("Meilisearch search failed: %s", exc)
        return {"hits": []}
