"""Redis Streams event publisher. Producers call publish(); the worker consumes."""
import json

from app.core.redis import get_client

STREAM_STATUS_CHANGED = "paper.status_changed"
STREAM_REVIEW_SUBMITTED = "review.submitted"


async def publish(stream: str, payload: dict) -> None:
    r = get_client()
    await r.xadd(stream, {"payload": json.dumps(payload)})


async def emit_status_changed(paper_id: str, from_status: str | None, to_status: str) -> None:
    await publish(STREAM_STATUS_CHANGED, {
        "paper_id": paper_id,
        "from_status": from_status,
        "to_status": to_status,
    })


async def emit_review_submitted(paper_id: str, reviewer_id: str, score: int) -> None:
    await publish(STREAM_REVIEW_SUBMITTED, {
        "paper_id": paper_id,
        "reviewer_id": reviewer_id,
        "score": score,
    })
