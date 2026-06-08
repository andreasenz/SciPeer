"""Redis Streams consumer for async notifications. Run as a separate pod."""

import asyncio
import json
import logging

from app.core.redis import get_client

logger = logging.getLogger(__name__)

STREAMS = {
    "paper.status_changed": "_handle_status_change",
    "review.submitted": "_handle_review_submitted",
}
CONSUMER_GROUP = "notification-worker"
CONSUMER_NAME = "worker-1"


async def _handle_status_change(data: dict) -> None:
    logger.info("Paper status changed: %s", data)


async def _handle_review_submitted(data: dict) -> None:
    logger.info("Review submitted: %s", data)


async def run() -> None:
    r = get_client()
    for stream in STREAMS:
        try:
            await r.xgroup_create(stream, CONSUMER_GROUP, id="0", mkstream=True)
        except Exception:
            pass  # group already exists

    logger.info("Notification worker started, listening on: %s", list(STREAMS))
    while True:
        messages = await r.xreadgroup(
            CONSUMER_GROUP,
            CONSUMER_NAME,
            {s: ">" for s in STREAMS},
            count=10,
            block=5000,
        )
        for stream_name, entries in (messages or []):
            handler_name = STREAMS.get(stream_name)
            for msg_id, fields in entries:
                try:
                    data = json.loads(fields.get("payload", "{}"))
                    if handler_name:
                        await globals()[handler_name](data)
                    await r.xack(stream_name, CONSUMER_GROUP, msg_id)
                except Exception as exc:
                    logger.error("Failed to process %s: %s", msg_id, exc)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run())
