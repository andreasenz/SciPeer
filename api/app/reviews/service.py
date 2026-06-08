from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def has_conflict_of_interest(
    session: AsyncSession,
    *,
    paper_author_ids: list[UUID],
    candidate_reviewer_id: UUID,
    max_depth: int = 2,
) -> bool:
    """Return True if candidate_reviewer is within max_depth hops of any paper author."""
    if not paper_author_ids:
        return False

    result = await session.execute(
        text("""
            WITH RECURSIVE coi_graph AS (
                SELECT author_id, coauthor_id, 1 AS depth
                FROM   reviews.coauthor_edges
                WHERE  author_id = ANY(:author_ids)
              UNION ALL
                SELECT e.author_id, e.coauthor_id, g.depth + 1
                FROM   reviews.coauthor_edges e
                JOIN   coi_graph g ON e.author_id = g.coauthor_id
                WHERE  g.depth < :max_depth
            )
            SELECT EXISTS (
                SELECT 1 FROM coi_graph WHERE coauthor_id = :reviewer_id
            ) AS has_conflict
        """),
        {
            "author_ids": paper_author_ids,
            "max_depth": max_depth,
            "reviewer_id": candidate_reviewer_id,
        },
    )
    row = result.one()
    return bool(row.has_conflict)
