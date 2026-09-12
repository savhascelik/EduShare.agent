import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import School, SurplusItem, NeedRequest, AgentTask, Transfer
from app.schemas import AgentTaskResponse, HITLApprovalAction, TransferResponse
from app.auth import get_optional_current_school, get_current_school
from app.sse import sse_manager
from app.pulse_logger import get_recent_pulse_events, record_pulse_event
from app.worker import run_autonomous_inventory_sweep

router = APIRouter(prefix="/api/agent", tags=["Agent & HITL Approvals"])

@router.get("/tasks", response_model=List[AgentTaskResponse])
def get_agent_tasks(
    status: Optional[str] = None,
    current_school: Optional[School] = Depends(get_optional_current_school),
    db: Session = Depends(get_db)
):
    query = db.query(AgentTask)
    if status:
        query = query.filter(AgentTask.status == status)
    
    tasks = query.order_by(AgentTask.created_at.desc()).all()
    
    # If a school is logged in, filter or prioritize tasks where their school is the source or destination
    if current_school:
        user_tasks = []
        for t in tasks:
            payload = t.match_payload or {}
            from_id = payload.get("from_school_id")
            to_id = payload.get("to_school_id")
            if from_id == current_school.id or to_id == current_school.id:
                user_tasks.append(t)
            elif not status or status == "AWAITING_HUMAN_APPROVAL":
                # Also include if source item belongs to them
                item = db.query(SurplusItem).filter(SurplusItem.id == t.source_id).first()
                if item and item.school_id == current_school.id:
                    user_tasks.append(t)
        # If user has specific tasks, return them; otherwise return general active approvals
        if user_tasks:
            return [AgentTaskResponse.from_orm(t) for t in user_tasks]
            
    return [AgentTaskResponse.from_orm(t) for t in tasks]

@router.post("/approve/{task_id}")
async def approve_transfer_task(
    task_id: str,
    action: Optional[HITLApprovalAction] = None,
    current_school: Optional[School] = Depends(get_optional_current_school),
    db: Session = Depends(get_db)
):
    """
    Human-in-the-Loop (HITL) Gate:
    School Principal gives explicit approval to finalize the autonomous transfer.
    """
    task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Ajan görevi bulunamadı.")
    
    if task.status != "AWAITING_HUMAN_APPROVAL":
        raise HTTPException(status_code=400, detail=f"Bu görev onay bekler durumda değil (Mevcut Durum: {task.status}).")

    payload = task.match_payload or {}
    surplus_id = payload.get("surplus_item_id")
    need_id = payload.get("need_id")
    from_school_id = payload.get("from_school_id")
    to_school_id = payload.get("to_school_id")
    quantity = payload.get("quantity", 1)
    savings_tl = payload.get("estimated_savings_tl", 0.0)
    co2_kg = payload.get("prevented_co2_kg", 0.0)
    item_title = payload.get("item_title", "Eğitim Malzemesi")

    # Update Surplus Item
    surplus = db.query(SurplusItem).filter(SurplusItem.id == surplus_id).first()
    if surplus:
        surplus.status = "TRANSFERRED"
    
    # Update Need Request
    if need_id:
        need = db.query(NeedRequest).filter(NeedRequest.id == need_id).first()
        if need:
            need.status = "FULFILLED"

    # Fetch school entities for transfer record
    from_school = db.query(School).filter(School.id == from_school_id).first()
    to_school = db.query(School).filter(School.id == to_school_id).first()

    # Create Transfer Log
    transfer = Transfer(
        task_id=task.id,
        surplus_item_id=surplus_id,
        from_school_id=from_school_id,
        to_school_id=to_school_id,
        item_summary=item_title,
        quantity=quantity,
        estimated_savings_tl=savings_tl,
        prevented_co2_kg=co2_kg,
        status="APPROVED"
    )
    db.add(transfer)
    
    # Mark task completed
    task.status = "COMPLETED"
    db.commit()
    db.refresh(transfer)

    # Broadcast real-time SSE event for Leaflet animated map & celebrating particles
    transfer_data = {
        "transfer_id": transfer.id,
        "task_id": task.id,
        "from_school_id": from_school_id,
        "from_school_name": from_school.name if from_school else "Kaynak Okul",
        "from_lat": from_school.latitude if from_school else 0.0,
        "from_lng": from_school.longitude if from_school else 0.0,
        "to_school_id": to_school_id,
        "to_school_name": to_school.name if to_school else "Hedef Okul",
        "to_lat": to_school.latitude if to_school else 0.0,
        "to_lng": to_school.longitude if to_school else 0.0,
        "item_summary": item_title,
        "quantity": quantity,
        "estimated_savings_tl": savings_tl,
        "prevented_co2_kg": co2_kg,
        "transferred_at": transfer.transferred_at.isoformat()
    }
    await sse_manager.broadcast("TRANSFER_APPROVED", transfer_data)

    record_pulse_event(
        event_type="success",
        step_key="transfer_finalized",
        params={
            "item": item_title,
            "from_school": from_school.name if from_school else "",
            "to_school": to_school.name if to_school else "",
            "savings_tl": savings_tl,
            "co2_kg": co2_kg
        },
        raw_text=f"Principal approved transfer: {item_title} ({from_school.name if from_school else ''} -> {to_school.name if to_school else ''})."
    )

    return {
        "status": "SUCCESS",
        "message": f"Tebrikler! {from_school.name if from_school else ''} ➔ {to_school.name if to_school else ''} transferi onaylandı.",
        "transfer": transfer_data
    }

@router.post("/reject/{task_id}")
async def reject_transfer_task(
    task_id: str,
    action: Optional[HITLApprovalAction] = None,
    db: Session = Depends(get_db)
):
    task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Ajan görevi bulunamadı.")
    
    task.status = "REJECTED"
    db.commit()

    await sse_manager.broadcast("TRANSFER_REJECTED", {"task_id": task.id})
    return {"status": "SUCCESS", "message": "Transfer önerisi reddedildi. Eşya envanterde beklemeye devam ediyor."}

@router.get("/pulse")
def get_agent_pulse_feed():
    """Returns recent autonomous agent reasoning steps for live observability."""
    return get_recent_pulse_events()

@router.post("/sweep")
async def trigger_autonomous_sweep():
    """Triggers an on-demand proactive inventory sweep."""
    record_pulse_event(
        event_type="info",
        step_key="sweep_initiated",
        raw_text="Autonomous inventory sweep triggered."
    )
    asyncio.create_task(run_autonomous_inventory_sweep())
    return {"status": "SUCCESS", "message": "Autonomous inventory sweep initiated."}

