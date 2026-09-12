import asyncio
import json
from typing import AsyncGenerator, Set
from sse_starlette.sse import ServerSentEvent

class SSEManager:
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self) -> AsyncGenerator[ServerSentEvent, None]:
        queue = asyncio.Queue()
        self._subscribers.add(queue)
        try:
            # Send initial keep-alive ping
            yield ServerSentEvent(data=json.dumps({"type": "CONNECTED", "message": "EduShare SSE Stream Active"}), event="ping")
            while True:
                msg = await queue.get()
                yield ServerSentEvent(data=json.dumps(msg, ensure_ascii=False), event="update")
        except asyncio.CancelledError:
            pass
        finally:
            self._subscribers.remove(queue)

    async def broadcast(self, event_type: str, payload: dict):
        msg = {"type": event_type, "payload": payload}
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(msg)
            except Exception:
                pass

sse_manager = SSEManager()
