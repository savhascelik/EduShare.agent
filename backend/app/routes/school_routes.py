from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import School, SurplusItem, NeedRequest
from app.schemas import SchoolResponse

router = APIRouter(prefix="/api/schools", tags=["Schools"])

@router.get("", response_model=List[SchoolResponse])
def list_schools(db: Session = Depends(get_db)):
    schools = db.query(School).all()
    return [SchoolResponse.from_orm(s) for s in schools]

@router.get("/{school_id}", response_model=SchoolResponse)
def get_school_by_id(school_id: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Okul bulunamadı.")
    return SchoolResponse.from_orm(school)
