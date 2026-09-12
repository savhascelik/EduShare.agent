from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import School, SurplusItem, NeedRequest, AgentTask, Transfer
from app.schemas import DashboardStatsResponse, TransferResponse

router = APIRouter(prefix="/api/stats", tags=["Statistics & Transfers"])

@router.get("", response_model=DashboardStatsResponse)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    # Aggregated transfers
    savings_sum = db.query(func.sum(Transfer.estimated_savings_tl)).scalar() or 0.0
    items_sum = db.query(func.sum(Transfer.quantity)).scalar() or 0
    co2_sum = db.query(func.sum(Transfer.prevented_co2_kg)).scalar() or 0.0

    schools_count = db.query(School).count()
    open_needs = db.query(NeedRequest).filter(NeedRequest.status == "OPEN").count()
    available_surplus = db.query(SurplusItem).filter(SurplusItem.status == "AVAILABLE").count()
    pending_approvals = db.query(AgentTask).filter(AgentTask.status == "AWAITING_HUMAN_APPROVAL").count()

    return DashboardStatsResponse(
        total_savings_tl=float(savings_sum),
        total_items_rehomed=int(items_sum),
        total_co2_prevented_kg=float(co2_sum),
        active_schools_count=schools_count,
        open_needs_count=open_needs,
        available_surplus_count=available_surplus,
        pending_approvals_count=pending_approvals
    )

@router.get("/transfers", response_model=List[TransferResponse])
def get_completed_transfers(db: Session = Depends(get_db)):
    transfers = db.query(Transfer).order_by(Transfer.transferred_at.desc()).limit(50).all()
    results = []
    for t in transfers:
        from_school = db.query(School).filter(School.id == t.from_school_id).first()
        to_school = db.query(School).filter(School.id == t.to_school_id).first()
        results.append(TransferResponse(
            id=t.id,
            task_id=t.task_id,
            surplus_item_id=t.surplus_item_id,
            from_school_id=t.from_school_id,
            from_school_name=from_school.name if from_school else "Bilinmeyen Okul",
            from_lat=from_school.latitude if from_school else 0.0,
            from_lng=from_school.longitude if from_school else 0.0,
            to_school_id=t.to_school_id,
            to_school_name=to_school.name if to_school else "Bilinmeyen Okul",
            to_lat=to_school.latitude if to_school else 0.0,
            to_lng=to_school.longitude if to_school else 0.0,
            item_summary=t.item_summary,
            quantity=t.quantity,
            estimated_savings_tl=t.estimated_savings_tl,
            prevented_co2_kg=t.prevented_co2_kg,
            status=t.status,
            transferred_at=t.transferred_at
        ))
    return results
