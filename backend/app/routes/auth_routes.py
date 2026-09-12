from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import School
from app.schemas import SchoolRegister, SchoolLogin, SchoolProfileUpdate, SchoolResponse, TokenResponse
from app.auth import get_password_hash, verify_password, create_access_token, get_current_school

router = APIRouter(prefix="/api/auth", tags=["Authentication & School Profile"])

@router.post("/register", response_model=TokenResponse)
def register_school(payload: SchoolRegister, db: Session = Depends(get_db)):
    existing = db.query(School).filter(School.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresiyle kayıtlı bir okul zaten mevcut."
        )
    
    new_school = School(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        district=payload.district,
        address=payload.address or "",
        latitude=payload.latitude,
        longitude=payload.longitude,
        student_count=payload.student_count or 450,
        teacher_count=payload.teacher_count or 30,
        classroom_count=payload.classroom_count or 18,
        school_type=payload.school_type or "Anadolu Lisesi",
        principal_name=payload.principal_name or "Okul Müdürü",
        phone=payload.phone or ""
    )
    db.add(new_school)
    db.commit()
    db.refresh(new_school)

    token = create_access_token({"sub": new_school.id, "email": new_school.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        school=SchoolResponse.from_orm(new_school)
    )

@router.post("/login", response_model=TokenResponse)
def login_school(payload: SchoolLogin, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.email == payload.email.lower()).first()
    if not school or not verify_password(payload.password, school.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı."
        )
    
    token = create_access_token({"sub": school.id, "email": school.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        school=SchoolResponse.from_orm(school)
    )

@router.get("/me", response_model=SchoolResponse)
def get_me(current_school: School = Depends(get_current_school)):
    return SchoolResponse.from_orm(current_school)

@router.put("/profile", response_model=SchoolResponse)
def update_profile(
    payload: SchoolProfileUpdate,
    current_school: School = Depends(get_current_school),
    db: Session = Depends(get_db)
):
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(current_school, field, value)
            
    db.commit()
    db.refresh(current_school)
    return SchoolResponse.from_orm(current_school)
