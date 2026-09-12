from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr

# Auth & School Schemas
class SchoolRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    district: str
    address: Optional[str] = ""
    latitude: float
    longitude: float
    student_count: Optional[int] = 450
    teacher_count: Optional[int] = 30
    classroom_count: Optional[int] = 18
    school_type: Optional[str] = "Anadolu Lisesi"
    principal_name: Optional[str] = "Okul Müdürü"
    phone: Optional[str] = ""

class SchoolLogin(BaseModel):
    email: EmailStr
    password: str

class SchoolProfileUpdate(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    student_count: Optional[int] = None
    teacher_count: Optional[int] = None
    classroom_count: Optional[int] = None
    school_type: Optional[str] = None
    principal_name: Optional[str] = None
    phone: Optional[str] = None

class SchoolResponse(BaseModel):
    id: str
    name: str
    email: str
    district: str
    address: Optional[str]
    latitude: float
    longitude: float
    student_count: int
    teacher_count: int
    classroom_count: int
    school_type: str
    principal_name: str
    phone: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    school: SchoolResponse

# Surplus Item Schemas
class SurplusItemCreate(BaseModel):
    title: str
    raw_text: str
    item_category: str
    quantity: int = 1
    condition_rating: Optional[str] = "İyi"
    image_url: Optional[str] = None
    estimated_unit_value_tl: Optional[float] = 1000.0

class SurplusItemResponse(BaseModel):
    id: str
    school_id: str
    school_name: Optional[str] = None
    district: Optional[str] = None
    title: str
    raw_text: str
    item_category: str
    quantity: int
    condition_rating: str
    image_url: Optional[str]
    estimated_unit_value_tl: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Need Request Schemas
class NeedRequestCreate(BaseModel):
    title: str
    raw_text: str
    item_category: str
    quantity_needed: int = 1
    urgency_level: Optional[str] = "MEDIUM"

class NeedRequestResponse(BaseModel):
    id: str
    school_id: str
    school_name: Optional[str] = None
    district: Optional[str] = None
    title: str
    raw_text: str
    item_category: str
    quantity_needed: int
    urgency_level: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Agent Task & HITL Schemas
class AgentTaskResponse(BaseModel):
    id: str
    task_type: str
    source_id: str
    status: str
    match_payload: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HITLApprovalAction(BaseModel):
    action: str # "APPROVE" or "REJECT"
    notes: Optional[str] = None

# Transfer Schemas
class TransferResponse(BaseModel):
    id: str
    task_id: Optional[str]
    surplus_item_id: Optional[str]
    from_school_id: str
    from_school_name: str
    from_lat: float
    from_lng: float
    to_school_id: str
    to_school_name: str
    to_lat: float
    to_lng: float
    item_summary: str
    quantity: int
    estimated_savings_tl: float
    prevented_co2_kg: float
    status: str
    transferred_at: datetime

    class Config:
        from_attributes = True

# Dashboard Stats
class DashboardStatsResponse(BaseModel):
    total_savings_tl: float
    total_items_rehomed: int
    total_co2_prevented_kg: float
    active_schools_count: int
    open_needs_count: int
    available_surplus_count: int
    pending_approvals_count: int

# Vision Analysis
class VisionAnalyzeResponse(BaseModel):
    title: str
    category: str
    estimated_quantity: int
    condition_rating: str
    estimated_unit_value_tl: float
    notes: str
