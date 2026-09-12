import asyncio
import uuid
from datetime import datetime
from collections import deque
from typing import Dict, Any, List, Optional
from app.sse import sse_manager

# Bounded queue holding last 30 agent reasoning steps
_PULSE_HISTORY: deque = deque(maxlen=30)

def record_pulse_event(
    event_type: str,
    step_key: str,
    tool: Optional[str] = None,
    params: Optional[Dict[str, Any]] = None,
    raw_text: Optional[str] = None
) -> Dict[str, Any]:
    """Records an autonomous agent reasoning step and broadcasts via SSE."""
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "type": event_type, # 'thinking' | 'tool_call' | 'decision' | 'success' | 'info'
        "tool": tool,
        "step_key": step_key,
        "params": params or {},
        "raw_text": raw_text or ""
    }
    _PULSE_HISTORY.append(entry)
    
    # Broadcast asynchronously
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(sse_manager.broadcast("AGENT_PULSE", entry))
    except Exception:
        pass
        
    return entry

def get_recent_pulse_events(limit: int = 25) -> List[Dict[str, Any]]:
    """Returns the most recent agent reasoning steps."""
    items = list(_PULSE_HISTORY)
    return items[-limit:]

# Seed realistic initial baseline logs so the UI starts with live historical context
def _init_default_pulse_history():
    defaults = [
        {
            "event_type": "info",
            "step_key": "agent_awakened",
            "params": {"model": "us.amazon.nova-pro-v1:0", "region": "us-east-1"},
            "raw_text": "EduShare Autonomous Strands Agent initialized with Amazon Bedrock Nova Pro."
        },
        {
            "event_type": "tool_call",
            "step_key": "tool_query_needs",
            "tool": "query_nearby_needs",
            "params": {"category": "Bilişim & Donanım", "source_school": "Kadıköy Anadolu Lisesi", "found_count": 2},
            "raw_text": "Queried nearby school needs. Matched Haydarpaşa MTAL for IT hardware."
        },
        {
            "event_type": "tool_call",
            "step_key": "tool_calc_impact",
            "tool": "calculate_impact_metrics",
            "params": {"savings_tl": 90000.0, "co2_kg": 1919.5, "distance_km": 3.8},
            "raw_text": "Calculated impact: ₺90,000 public savings and 1,919.5 kg CO2 footprint reduction."
        },
        {
            "event_type": "decision",
            "step_key": "tool_hitl_created",
            "tool": "create_hitl_approval_card",
            "params": {"item": "12 HP ProDesk Bilgisayar", "target_school": "Haydarpaşa MTAL"},
            "raw_text": "Formulated Human-in-the-Loop decision proposal. Awaiting principal signature."
        },
        {
            "event_type": "info",
            "step_key": "agent_idle",
            "params": {},
            "raw_text": "Agent background daemon standing by for new inventory and need signals."
        }
    ]
    for d in defaults:
        record_pulse_event(
            event_type=d["event_type"],
            step_key=d["step_key"],
            tool=d.get("tool"),
            params=d.get("params"),
            raw_text=d.get("raw_text")
        )

_init_default_pulse_history()
