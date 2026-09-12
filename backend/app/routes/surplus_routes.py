import os
import uuid
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import School, SurplusItem, AgentTask
from app.schemas import SurplusItemCreate, SurplusItemResponse, VisionAnalyzeResponse
from app.auth import get_current_school, get_optional_current_school
from app.vision import analyze_surplus_image
from app.worker import process_single_task
from app.config import settings

router = APIRouter(prefix="/api/surplus", tags=["Surplus Items"])

@router.post("/analyze-image", response_model=VisionAnalyzeResponse)
async def analyze_photo(
    file: UploadFile = File(...)
):
    """
    Multimodal Vision endpoint: Inspects an uploaded surplus equipment photo
    using Amazon Bedrock and extracts structured inventory attributes.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lütfen geçerli bir görsel dosyası (JPEG, PNG, WebP) yükleyin."
        )
    
    contents = await file.read()
    result = analyze_surplus_image(contents, file.content_type)
    return VisionAnalyzeResponse(**result)

@router.post("", response_model=SurplusItemResponse)
async def create_surplus_item(
    payload: SurplusItemCreate,
    current_school: School = Depends(get_current_school),
    db: Session = Depends(get_db)
):
    """
    Registers a new surplus item and instantly enqueues an autonomous matching task.
    """
    item = SurplusItem(
        school_id=current_school.id,
        title=payload.title,
        raw_text=payload.raw_text,
        item_category=payload.item_category,
        quantity=payload.quantity,
        condition_rating=payload.condition_rating or "İyi",
        image_url=payload.image_url,
        estimated_unit_value_tl=payload.estimated_unit_value_tl or 1000.0,
        status="AVAILABLE"
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Autonomous Task Enqueue
    task = AgentTask(
        task_type="MATCH_SURPLUS",
        source_id=item.id,
        status="PENDING"
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Wake up the Strands agent immediately in background
    asyncio.create_task(process_single_task(task.id))

    return SurplusItemResponse(
        id=item.id,
        school_id=item.school_id,
        school_name=current_school.name,
        district=current_school.district,
        title=item.title,
        raw_text=item.raw_text,
        item_category=item.item_category,
        quantity=item.quantity,
        condition_rating=item.condition_rating,
        image_url=item.image_url,
        estimated_unit_value_tl=item.estimated_unit_value_tl,
        status=item.status,
        created_at=item.created_at
    )

@router.get("", response_model=List[SurplusItemResponse])
def list_surplus_items(
    school_id: Optional[str] = None,
    item_category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SurplusItem)
    if school_id:
        query = query.filter(SurplusItem.school_id == school_id)
    if item_category:
        query = query.filter(SurplusItem.item_category == item_category)
        
    items = query.order_by(SurplusItem.created_at.desc()).all()
    results = []
    for item in items:
        school = db.query(School).filter(School.id == item.school_id).first()
        results.append(SurplusItemResponse(
            id=item.id,
            school_id=item.school_id,
            school_name=school.name if school else "Bilinmeyen Okul",
            district=school.district if school else "",
            title=item.title,
            raw_text=item.raw_text,
            item_category=item.item_category,
            quantity=item.quantity,
            condition_rating=item.condition_rating,
            image_url=item.image_url,
            estimated_unit_value_tl=item.estimated_unit_value_tl,
            status=item.status,
            created_at=item.created_at
        ))
    return results
