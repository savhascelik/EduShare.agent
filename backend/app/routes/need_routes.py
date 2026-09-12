import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import School, NeedRequest, AgentTask
from app.schemas import NeedRequestCreate, NeedRequestResponse
from app.auth import get_current_school
from app.worker import process_single_task

router = APIRouter(prefix="/api/needs", tags=["Need Requests"])

@router.post("", response_model=NeedRequestResponse)
async def create_need_request(
    payload: NeedRequestCreate,
    current_school: School = Depends(get_current_school),
    db: Session = Depends(get_db)
):
    need = NeedRequest(
        school_id=current_school.id,
        title=payload.title,
        raw_text=payload.raw_text,
        item_category=payload.item_category,
        quantity_needed=payload.quantity_needed,
        urgency_level=payload.urgency_level or "MEDIUM",
        status="OPEN"
    )
    db.add(need)
    db.commit()
    db.refresh(need)

    # Autonomous Matching Task Enqueue
    task = AgentTask(
        task_type="MATCH_NEED",
        source_id=need.id,
        status="PENDING"
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Wake up agent in background
    asyncio.create_task(process_single_task(task.id))

    return NeedRequestResponse(
        id=need.id,
        school_id=need.school_id,
        school_name=current_school.name,
        district=current_school.district,
        title=need.title,
        raw_text=need.raw_text,
        item_category=need.item_category,
        quantity_needed=need.quantity_needed,
        urgency_level=need.urgency_level,
        status=need.status,
        created_at=need.created_at
    )

@router.get("", response_model=List[NeedRequestResponse])
def list_needs(
    school_id: Optional[str] = None,
    item_category: Optional[str] = None,
    status: Optional[str] = "OPEN",
    db: Session = Depends(get_db)
):
    query = db.query(NeedRequest)
    if school_id:
        query = query.filter(NeedRequest.school_id == school_id)
    if item_category:
        query = query.filter(NeedRequest.item_category == item_category)
    if status:
        query = query.filter(NeedRequest.status == status)

    needs = query.order_by(NeedRequest.created_at.desc()).all()
    results = []
    for need in needs:
        school = db.query(School).filter(School.id == need.school_id).first()
        results.append(NeedRequestResponse(
            id=need.id,
            school_id=need.school_id,
            school_name=school.name if school else "Bilinmeyen Okul",
            district=school.district if school else "",
            title=need.title,
            raw_text=need.raw_text,
            item_category=need.item_category,
            quantity_needed=need.quantity_needed,
            urgency_level=need.urgency_level,
            status=need.status,
            created_at=need.created_at
        ))
    return results
