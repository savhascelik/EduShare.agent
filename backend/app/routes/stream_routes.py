from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from app.sse import sse_manager

router = APIRouter(prefix="/api/stream", tags=["Realtime Stream (SSE)"])

@router.get("")
async def stream_events():
    """
    Subscribes the frontend to real-time agent updates (new HITL proposals, approved transfers).
    """
    return EventSourceResponse(sse_manager.subscribe())
