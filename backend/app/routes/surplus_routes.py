import os
import uuid
import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import School, SurplusItem, AgentTask, StockLedger
from app.schemas import SurplusItemCreate, SurplusItemResponse, VisionAnalyzeResponse, QuotaStatusResponse
from app.auth import get_current_school, get_optional_current_school
from app.vision import analyze_surplus_image
from app.worker import process_single_task
from app.config import settings
from app.security_guard import shield

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/surplus", tags=["Surplus Items"])

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

@router.get("/quota", response_model=QuotaStatusResponse)
async def get_current_quota(
    request: Request,
    current_school: Optional[School] = Depends(get_optional_current_school)
):
    """
    Returns current AI usage, remaining credits for the school (or guest IP), and global status.
    """
    client_ip = get_client_ip(request)
    school_id = current_school.id if current_school else None
    status_data = shield.get_quota_status(school_id, client_ip)
    return QuotaStatusResponse(**status_data)

@router.post("/analyze-image", response_model=VisionAnalyzeResponse)
async def analyze_photo(
    request: Request,
    file: UploadFile = File(...),
    current_school: Optional[School] = Depends(get_optional_current_school)
):
    """
    Protected Multimodal Visual Analysis with:
    1. Sliding-window IP Rate Limiting (max 5 requests/min)
    2. Max 4MB File Size Enforcement
    3. In-memory SHA-256 Image Hash Cache (0 cost, 0 credits on cache hits)
    4. Per-School Daily 50 Credit Limit & Global 300 Hard Cap Circuit Breaker
    """
    client_ip = get_client_ip(request)
    school_id = current_school.id if current_school else None

    # 1. Enforce IP Rate Limiting (anti-spam)
    shield.check_rate_limit(client_ip)

    # 2. Enforce File Size Ceiling
    contents = await file.read()
    shield.check_file_size(contents)

    # 3. Check SHA-256 Hash Cache
    image_hash = shield.compute_image_hash(contents)
    cached_result = shield.get_cached_result(image_hash)

    if cached_result:
        remaining, limit, msg = shield.consume_quota(school_id, client_ip, is_cache_hit=True)
        return VisionAnalyzeResponse(
            **cached_result,
            quota_remaining=remaining,
            quota_total=limit,
            is_cached=True,
            quota_message=msg
        )

    # 4. Pre-check quota before contacting AWS Bedrock
    status_data = shield.get_quota_status(school_id, client_ip)
    if status_data["remaining"] <= 0:
        if school_id:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Okulunuzun günlük yapay zeka analiz kotası ({status_data['limit']}/{status_data['limit']}) dolmuştur. Kotanız yarın sıfırlanacaktır."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Misafir kullanıcı deneme kotası ({status_data['limit']}/{status_data['limit']}) dolmuştur. Lütfen okul hesabınızla giriş yapın."
            )

    # 5. Check AWS Bedrock credentials
    import boto3
    creds = boto3.Session().get_credentials()
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AWS Bedrock credentials are not configured on the server."
        )

    # 6. Execute Multimodal Analysis on Amazon Bedrock
    try:
        result = analyze_surplus_image(contents, file.content_type)
        shield.store_cached_result(image_hash, result)
        remaining, limit, msg = shield.consume_quota(school_id, client_ip, is_cache_hit=False)
        return VisionAnalyzeResponse(
            **result,
            quota_remaining=remaining,
            quota_total=limit,
            is_cached=False,
            quota_message=msg
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Bedrock visual analysis error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bedrock visual analysis failed: {str(exc)}"
        )

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
        allocated_quantity=0,
        reserved_quantity=0,
        condition_rating=payload.condition_rating or "İyi",
        image_url=payload.image_url,
        estimated_unit_value_tl=payload.estimated_unit_value_tl or 1000.0,
        status="AVAILABLE"
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Initial Stock Ledger Movement
    init_ledger = StockLedger(
        surplus_item_id=item.id,
        school_id=current_school.id,
        movement_type="INITIAL_REGISTRATION",
        quantity_delta=item.quantity,
        balance_after=item.quantity,
        note=f"{current_school.name} tarafından ilk envanter kaydı oluşturuldu."
    )
    db.add(init_ledger)
    db.commit()

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
