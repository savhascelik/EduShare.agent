import asyncio
import random
import string
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.database import get_db
from app.models import School, SurplusItem, NeedRequest, AgentTask, Transfer, StockLedger
from app.schemas import AgentTaskResponse, HITLApprovalAction, TransferResponse, PeerProposalCreateRequest, StockLedgerResponse
from app.auth import get_optional_current_school, get_current_school
from app.sse import sse_manager
from app.pulse_logger import get_recent_pulse_events, record_pulse_event
from app.worker import run_autonomous_inventory_sweep
from app.agent import haversine_distance_km

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
    
    # If a school is logged in, filter or prioritize tasks where their school is the source, destination, or initiator
    if current_school:
        user_tasks = []
        for t in tasks:
            payload = t.match_payload or {}
            from_id = payload.get("from_school_id")
            to_id = payload.get("to_school_id")
            if (
                t.initiator_school_id == current_school.id or
                t.target_school_id == current_school.id or
                from_id == current_school.id or
                to_id == current_school.id
            ):
                user_tasks.append(t)
            elif not status or status == "AWAITING_HUMAN_APPROVAL":
                item = db.query(SurplusItem).filter(SurplusItem.id == t.source_id).first()
                if item and item.school_id == current_school.id:
                    user_tasks.append(t)
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
    Human-in-the-Loop (HITL) Gate with Row-Level Concurrency Locking & Twin Proposal Merging:
    Atomically validates available stock, adapts quantities, merges crossing proposals,
    deducts inventory, records immutable StockLedger entry, and executes official transfer.
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

    transfer_quantity = int(quantity) if quantity else 1
    remaining_stock = 0

    # 1. Acquire Surplus with Concurrency Lock (Atomic check-and-decrement)
    surplus_query = db.query(SurplusItem).filter(SurplusItem.id == surplus_id)
    try:
        surplus = surplus_query.with_for_update().first()
    except Exception:
        surplus = surplus_query.first()

    if not surplus:
        raise HTTPException(status_code=404, detail="Eşya envanterde bulunamadı.")

    available_stock = surplus.quantity
    if available_stock <= 0:
        # Race Condition: stock was exhausted by a concurrent approval!
        task.status = "SUPERSEDED"
        payload["superseded_reason"] = "STOCK_DEPLETED"
        task.match_payload = dict(payload)
        flag_modified(task, "match_payload")
        db.commit()
        await sse_manager.broadcast("TASK_SUPERSEDED", {"task_ids": [task.id], "reason": "STOCK_DEPLETED"})
        raise HTTPException(status_code=409, detail="Bu eşyanın stoku başka bir işlemle tükenmiştir.")

    orig_quantity = int(quantity) if quantity else 1
    # Adaptive partial stock: if requested is higher than available stock, cap to available
    if transfer_quantity > available_stock:
        transfer_quantity = available_stock
        payload["quantity"] = transfer_quantity
        payload["stock_adjusted"] = True
        payload["stock_warning"] = f"Mevcut stok yetersiz olduğundan transfer {transfer_quantity} adet ile sınırlandırıldı."

    # Proportionally recalculate savings and CO2 for this transfer
    if orig_quantity > 0 and transfer_quantity != orig_quantity:
        ratio = transfer_quantity / orig_quantity
        savings_tl = round(savings_tl * ratio, 2)
        co2_kg = round(co2_kg * ratio, 2)
        payload["estimated_savings_tl"] = savings_tl
        payload["prevented_co2_kg"] = co2_kg

    task.match_payload = dict(payload)
    flag_modified(task, "match_payload")

    surplus.allocated_quantity = (surplus.allocated_quantity or 0) + transfer_quantity
    surplus.quantity = max(0, surplus.quantity - transfer_quantity)
    remaining_stock = surplus.quantity
    if surplus.quantity == 0:
        surplus.status = "TRANSFERRED"
    else:
        surplus.status = "AVAILABLE"  # Remains in pool for future matching!
    
    # 2. Update Need Request with partial fulfillment
    if need_id:
        need = db.query(NeedRequest).filter(NeedRequest.id == need_id).first()
        if need:
            need.quantity_needed = max(0, need.quantity_needed - transfer_quantity)
            if need.quantity_needed == 0:
                need.status = "FULFILLED"
            else:
                need.status = "OPEN"

    # 3. Consolidate Crossing / Twin Proposals (LLM proposal vs User direct proposal for same pairing)
    crossing_tasks = db.query(AgentTask).filter(
        AgentTask.id != task.id,
        AgentTask.status == "AWAITING_HUMAN_APPROVAL"
    ).all()

    merged_task_ids = []
    for c_task in crossing_tasks:
        c_payload = c_task.match_payload or {}
        is_same_pairing = (
            c_payload.get("surplus_item_id") == surplus_id and
            c_payload.get("to_school_id") == to_school_id
        )
        is_crossing_channel = (
            (c_task.initiator_type and task.initiator_type and c_task.initiator_type != task.initiator_type) or
            (c_task.task_type in ["PEER_REQUEST", "PEER_OFFER"] and task.task_type not in ["PEER_REQUEST", "PEER_OFFER"]) or
            (task.task_type in ["PEER_REQUEST", "PEER_OFFER"] and c_task.task_type not in ["PEER_REQUEST", "PEER_OFFER"])
        )
        if is_same_pairing and is_crossing_channel:
            c_task.status = "MERGED"
            c_payload["merged_into_task_id"] = task.id
            c_payload["merge_reason"] = "Aynı okul eşleşmesi diğer kanal/teklif üzerinden onaylandığı için otomatik birleştirildi."
            c_task.match_payload = dict(c_payload)
            flag_modified(c_task, "match_payload")
            merged_task_ids.append(c_task.id)
            record_pulse_event(
                event_type="info",
                step_key="proposals_merged",
                params={"task_id": c_task.id[:8], "merged_into": task.id[:8]},
                raw_text=f"Çakışan eşleşme teklifi ({c_task.id[:8]}) onaylanan ana teklifle birleştirildi."
            )

    # 4. Concurrency & Auto-Supersede Sibling Pending AI Proposals for OTHER Schools
    superseded_task_ids = []
    for s_task in crossing_tasks:
        if s_task.id in merged_task_ids or s_task.status in ["MERGED", "SUPERSEDED", "WITHDRAWN"]:
            continue
        s_payload = s_task.match_payload or {}
        if s_payload.get("surplus_item_id") == surplus_id:
            s_req_qty = s_payload.get("quantity", 1)
            if remaining_stock < s_req_qty:
                if remaining_stock == 0:
                    s_task.status = "SUPERSEDED"
                    s_payload["superseded_reason"] = "STOCK_DEPLETED"
                    s_task.match_payload = dict(s_payload)
                    flag_modified(s_task, "match_payload")
                    superseded_task_ids.append(s_task.id)
                    record_pulse_event(
                        event_type="decision",
                        step_key="task_superseded",
                        params={
                            "item": item_title,
                            "reason": "depleted"
                        },
                        raw_text=f"Stok tükendiği için {s_task.id[:8]} nolu eşleşme önerisi otomatik arşivlendi."
                    )
                else:
                    # Partial stock remaining: adapt proposal quantity to available stock
                    s_orig_qty = s_payload.get("quantity") or 1
                    s_payload["quantity"] = remaining_stock
                    s_payload["stock_adjusted"] = True
                    s_payload["stock_warning"] = f"Mevcut stok azaldığı için miktar {remaining_stock} olarak güncellendi."
                    # Proportionally scale down savings_tl and prevented_co2_kg
                    if s_orig_qty > 0 and s_orig_qty != remaining_stock:
                        ratio = remaining_stock / s_orig_qty
                        if "estimated_savings_tl" in s_payload:
                            s_payload["estimated_savings_tl"] = round(s_payload["estimated_savings_tl"] * ratio, 2)
                        elif surplus and surplus.estimated_unit_value_tl:
                            s_payload["estimated_savings_tl"] = round(surplus.estimated_unit_value_tl * remaining_stock, 2)
                        if "prevented_co2_kg" in s_payload:
                            s_payload["prevented_co2_kg"] = round(s_payload["prevented_co2_kg"] * ratio, 2)
                    s_task.match_payload = dict(s_payload)
                    flag_modified(s_task, "match_payload")

    # 5. Generate Official MEB Protocol Code
    protocol_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    protocol_code = f"MEB-TR-2026-{protocol_suffix}"

    # Fetch school entities for transfer record
    from_school = db.query(School).filter(School.id == from_school_id).first()
    to_school = db.query(School).filter(School.id == to_school_id).first()

    # 6. Immutable Stock Movement Ledger
    stock_ledger_entry = StockLedger(
        surplus_item_id=surplus_id,
        school_id=from_school_id,
        movement_type="TRANSFER_OUT",
        quantity_delta=-transfer_quantity,
        balance_after=remaining_stock,
        related_task_id=task.id,
        protocol_code=protocol_code,
        note=f"{to_school.name if to_school else 'Hedef Okul'} devri ({protocol_code})."
    )
    db.add(stock_ledger_entry)

    # 7. Create Transfer Log
    transfer = Transfer(
        task_id=task.id,
        surplus_item_id=surplus_id,
        from_school_id=from_school_id,
        to_school_id=to_school_id,
        item_summary=item_title,
        quantity=transfer_quantity,
        estimated_savings_tl=savings_tl,
        prevented_co2_kg=co2_kg,
        protocol_code=protocol_code,
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
        "quantity": transfer_quantity,
        "remaining_stock": remaining_stock,
        "protocol_code": protocol_code,
        "estimated_savings_tl": savings_tl,
        "prevented_co2_kg": co2_kg,
        "transferred_at": transfer.transferred_at.isoformat()
    }
    await sse_manager.broadcast("TRANSFER_APPROVED", transfer_data)

    if superseded_task_ids:
        await sse_manager.broadcast("TASK_SUPERSEDED", {
            "task_ids": superseded_task_ids,
            "reason": "STOCK_DEPLETED"
        })

    if merged_task_ids:
        await sse_manager.broadcast("TASK_MERGED", {
            "task_ids": merged_task_ids,
            "primary_task_id": task.id
        })

    record_pulse_event(
        event_type="success",
        step_key="transfer_finalized",
        params={
            "item": item_title,
            "from_school": from_school.name if from_school else "",
            "to_school": to_school.name if to_school else "",
            "savings_tl": savings_tl,
            "co2_kg": co2_kg,
            "protocol_code": protocol_code
        },
        raw_text=f"Principal approved transfer ({protocol_code}): {item_title} ({from_school.name if from_school else ''} -> {to_school.name if to_school else ''}). Remaining stock: {remaining_stock}."
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

@router.post("/tasks/{task_id}/withdraw")
@router.post("/withdraw/{task_id}")
async def withdraw_proposal(
    task_id: str,
    current_school: Optional[School] = Depends(get_optional_current_school),
    db: Session = Depends(get_db)
):
    """
    Withdrawal / Revocation Gate:
    Allows the initiating school or operator to withdraw a pending proposal.
    Releases any reserved capacity and archives the proposal cleanly.
    """
    task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı.")
    
    if task.status != "AWAITING_HUMAN_APPROVAL":
        raise HTTPException(status_code=400, detail=f"Bu teklif geri çekilemez durumda (Mevcut Durum: {task.status}).")

    task.status = "WITHDRAWN"
    payload = dict(task.match_payload or {})
    payload["withdrawn_by"] = current_school.name if current_school else "Yönetici"
    payload["withdrawn_at"] = datetime.utcnow().isoformat()
    task.match_payload = payload
    flag_modified(task, "match_payload")
    db.commit()

    await sse_manager.broadcast("TASK_WITHDRAWN", {"task_id": task.id})
    record_pulse_event(
        event_type="decision",
        step_key="task_withdrawn",
        params={"task_id": task.id[:8]},
        raw_text=f"{task.id[:8]} nolu teklif başlatan tarafça geri çekildi."
    )
    return {"status": "SUCCESS", "message": "Teklif başarıyla geri çekildi."}

@router.post("/peer-proposal")
async def create_peer_proposal(
    req: PeerProposalCreateRequest,
    current_school: School = Depends(get_current_school),
    db: Session = Depends(get_db)
):
    """
    Direct Human Peer Proposal Gate:
    Allows a school to directly request a surplus item or offer to a need.
    Automatically prevents duplicate pending proposals and syncs with autonomous agent.
    """
    surplus = db.query(SurplusItem).filter(SurplusItem.id == req.surplus_item_id).first()
    if not surplus:
        raise HTTPException(status_code=404, detail="Eşya bulunamadı.")
    
    if surplus.quantity < 1:
        raise HTTPException(status_code=400, detail="Bu eşyanın mevcut stoku tükenmiştir.")

    transfer_qty = min(max(1, req.quantity), surplus.quantity)

    if req.proposal_type == "REQUEST":
        if surplus.school_id == current_school.id:
            raise HTTPException(status_code=400, detail="Kendi okulunuzun eşyasını talep edemezsiniz.")
        from_school = surplus.school
        to_school = current_school
        initiator_type = "SCHOOL_RECIPIENT"
        initiator_school_id = current_school.id
        target_school_id = surplus.school_id
        task_type = "PEER_REQUEST"
    else:
        if not req.need_id:
            raise HTTPException(status_code=400, detail="Teklif için hedef ihtiyaç belirtilmelidir.")
        need = db.query(NeedRequest).filter(NeedRequest.id == req.need_id).first()
        if not need:
            raise HTTPException(status_code=404, detail="İhtiyaç bulunamadı.")
        if need.school_id == current_school.id:
            raise HTTPException(status_code=400, detail="Kendi okulunuzun ihtiyacına teklif veremezsiniz.")
        from_school = current_school
        to_school = need.school
        initiator_type = "SCHOOL_DONOR"
        initiator_school_id = current_school.id
        target_school_id = need.school_id
        task_type = "PEER_OFFER"

    # Avoid duplicate active proposals between the same schools for this item
    existing = db.query(AgentTask).filter(
        AgentTask.source_id == surplus.id,
        AgentTask.status == "AWAITING_HUMAN_APPROVAL"
    ).all()
    for ext in existing:
        ext_p = ext.match_payload or {}
        if ext_p.get("to_school_id") == to_school.id and ext_p.get("from_school_id") == from_school.id:
            return {"status": "EXISTS", "task_id": ext.id, "message": "Bu eşleşme için zaten bekleyen bir teklif mevcut."}

    dist_km = haversine_distance_km(from_school.latitude, from_school.longitude, to_school.latitude, to_school.longitude)
    savings_tl = round(transfer_qty * float(surplus.estimated_unit_value_tl or 1000.0), 2)
    prevented_co2 = round(transfer_qty * 12.5 + dist_km * 0.15, 2)

    payload = {
        "surplus_item_id": surplus.id,
        "need_id": req.need_id,
        "from_school_id": from_school.id,
        "from_school_name": from_school.name,
        "from_district": from_school.district,
        "to_school_id": to_school.id,
        "to_school_name": to_school.name,
        "to_district": to_school.district,
        "quantity": transfer_qty,
        "distance_km": dist_km,
        "estimated_savings_tl": savings_tl,
        "prevented_co2_kg": prevented_co2,
        "item_title": surplus.title,
        "initiator_type": initiator_type,
        "initiator_school_name": current_school.name,
        "notes": req.notes or ""
    }

    new_task = AgentTask(
        task_type=task_type,
        source_id=surplus.id,
        initiator_type=initiator_type,
        initiator_school_id=initiator_school_id,
        target_school_id=target_school_id,
        status="AWAITING_HUMAN_APPROVAL",
        match_payload=payload
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    await sse_manager.broadcast("TASK_CREATED", {"task_id": new_task.id, "payload": payload})
    record_pulse_event(
        event_type="proposal",
        step_key="peer_proposal_created",
        params={"from": from_school.name[:15], "to": to_school.name[:15], "qty": transfer_qty},
        raw_text=f"{current_school.name} tarafından {to_school.name} için {transfer_qty} adet {surplus.title} teklifi oluşturuldu."
    )
    return {"status": "SUCCESS", "task_id": new_task.id, "message": "Teklif başarıyla iletildi."}

@router.get("/surplus/{surplus_id}/ledger", response_model=List[StockLedgerResponse])
def get_surplus_stock_ledger(
    surplus_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns the complete immutable stock movement ledger for the specified surplus item.
    """
    return db.query(StockLedger).filter(
        StockLedger.surplus_item_id == surplus_id
    ).order_by(StockLedger.created_at.asc()).all()

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

