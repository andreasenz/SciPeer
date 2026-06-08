"""Tests for the conflict-of-interest graph traversal."""
from uuid import uuid7

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.reviews.models import CoauthorEdge
from app.reviews.service import has_conflict_of_interest


async def _add_edge(session: AsyncSession, a, b):
    session.add(CoauthorEdge(author_id=a, coauthor_id=b))
    session.add(CoauthorEdge(author_id=b, coauthor_id=a))  # bidirectional


@pytest.mark.asyncio
async def test_no_conflict_unconnected(session: AsyncSession):
    author = uuid7()
    reviewer = uuid7()
    assert not await has_conflict_of_interest(
        session, paper_author_ids=[author], candidate_reviewer_id=reviewer
    )


@pytest.mark.asyncio
async def test_direct_coauthor_blocked(session: AsyncSession):
    author, reviewer = uuid7(), uuid7()
    await _add_edge(session, author, reviewer)
    await session.commit()

    assert await has_conflict_of_interest(
        session, paper_author_ids=[author], candidate_reviewer_id=reviewer
    )


@pytest.mark.asyncio
async def test_two_hop_blocked_at_depth_2(session: AsyncSession):
    author, middle, reviewer = uuid7(), uuid7(), uuid7()
    await _add_edge(session, author, middle)
    await _add_edge(session, middle, reviewer)
    await session.commit()

    assert await has_conflict_of_interest(
        session, paper_author_ids=[author], candidate_reviewer_id=reviewer, max_depth=2
    )


@pytest.mark.asyncio
async def test_two_hop_allowed_at_depth_1(session: AsyncSession):
    author, middle, reviewer = uuid7(), uuid7(), uuid7()
    await _add_edge(session, author, middle)
    await _add_edge(session, middle, reviewer)
    await session.commit()

    assert not await has_conflict_of_interest(
        session, paper_author_ids=[author], candidate_reviewer_id=reviewer, max_depth=1
    )


@pytest.mark.asyncio
async def test_multiple_authors_any_match_blocks(session: AsyncSession):
    author_a, author_b, reviewer = uuid7(), uuid7(), uuid7()
    await _add_edge(session, author_b, reviewer)
    await session.commit()

    assert await has_conflict_of_interest(
        session, paper_author_ids=[author_a, author_b], candidate_reviewer_id=reviewer
    )
